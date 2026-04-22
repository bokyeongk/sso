# Gateway 중심 인증 리팩터링 플랜 (보안 강화 개정판)

**작성일**: 2026-04-22  
**목표**: 포탈 백엔드/프론트에서 Keycloak 토큰 처리를 제거하고, 게이트웨이가 모든 OAuth2 인증 흐름을 직접 처리하도록 재구성한다. 보안 검토 이슈를 전부 반영한 최고 보안 수준 설계를 적용한다.

---

## 보안 설계 원칙

| 원칙 | 적용 방식 |
|------|-----------|
| Confidential Client | Gateway가 client_secret 보유 — code 교환은 서버 간 처리 |
| CSRF 방지 | state 파라미터: UUID + returnUrl + expiry를 HMAC-SHA256 서명 후 httpOnly 쿠키로 저장 |
| open redirect 차단 | X-Redirect-To / serviceRedirectUrl을 허용 도메인 allowlist로 검증 |
| JWT 서명 검증 | ReactiveJwtDecoder + Keycloak JWK (서명·만료·issuer 동시 검증, JWK 캐싱) |
| 선제적 갱신 | exp - 30초 버퍼 적용, 만료 전 미리 refresh |
| 브라우저 직접 진입 | Accept: text/html 요청은 401 대신 302 redirect |
| SameSite 프로파일 분리 | local=Lax, prod=None;Secure |
| 로그아웃 보장 | Keycloak 세션 종료 실패 시 경고 로그 + 쿠키 삭제 보장 + 클라이언트에 부분 실패 알림 |
| 백엔드 최소 검증 | X-User-Id 헤더 존재 여부 확인 |

---

## 변경 범위 요약

| 영역 | 변경 내용 |
|------|-----------|
| Gateway | GlobalFilter(JWT검증+선제갱신), CallbackController(state검증), LogoutController, CORS, allowlist |
| Backend (SSO 포탈) | /token, /refresh 엔드포인트 제거, SecurityConfig → X-User-Id 헤더 검증 |
| Frontend (SSO 포탈) | Keycloak/PKCE/콜백 로직 제거, 401/302 시 X-Redirect-To 처리만 유지 |
| Keycloak | Valid Redirect URIs 게이트웨이 callback URL로 변경 (수동) |
| 각 서비스 Frontend | Keycloak 관련 제거, 401+X-Redirect-To 처리만 유지 |

---

## 현재 상태 파악

### Gateway 현재 상태
- `AuthenticationFilter`: access_token 쿠키 → SSO 백엔드 `/api/auth/me` 호출로 검증 (제거)
- 검증 실패 시 → 401 + `X-Redirect-To: loginPageUrl` (고정 URL — 개선)
- CORS: `X-Redirect-To` 이미 exposedHeaders에 포함됨

### Backend 현재 상태 (제거 대상)
- `AuthController`: `/token`, `/refresh`, `/logout`, `/me`
- `AuthApplicationService`: Keycloak 토큰 교환/갱신/로그아웃
- `ExchangeTokenUseCase` (port/in)
- `TokenRequest` (dto), `TokenResult` (domain model)
- `KeycloakProperties`, `RestTemplateConfig`
- `CookieTokenFilter` (쿠키 기반 Security 필터)

### Frontend 현재 상태 (제거 대상)
- `pkce.ts`: PKCE verifier/challenge 생성
- `auth.ts`: `startLogin()` (PKCE + Keycloak URL 직접 구성), `startLogout()`
- `CallbackPage.tsx`: code 수신 → `/api/auth/token` 호출
- `apiClient.ts`: 401 시 `/api/auth/refresh` 재시도 로직
- 라우터의 `/callback` 경로
- `useAuthInit.ts`: PKCE 흐름 초기화

---

## Phase 1: Gateway — 핵심 인증 흐름 구현

### 1-1. `KeycloakProperties` 설정 클래스 추가
**파일**: `gateway/src/main/java/com/hubilon/gateway/config/KeycloakProperties.java`

```java
@ConfigurationProperties(prefix = "keycloak")
public record KeycloakProperties(
    String url,
    String realm,
    Map<String, ClientConfig> clients  // key: clientId
) {
    public record ClientConfig(
        String secret,              // Confidential client secret (필수)
        String serviceRedirectUrl   // 로그인 완료 후 이동할 서비스 프론트 URL
    ) {}

    public String tokenEndpoint() {
        return url + "/realms/" + realm + "/protocol/openid-connect/token";
    }

    public String logoutEndpoint() {
        return url + "/realms/" + realm + "/protocol/openid-connect/logout";
    }

    public String authEndpoint() {
        return url + "/realms/" + realm + "/protocol/openid-connect/auth";
    }

    public String jwkSetUri() {
        return url + "/realms/" + realm + "/protocol/openid-connect/certs";
    }
}
```

### 1-2. `GatewayProperties` 설정 클래스 추가
**파일**: `gateway/src/main/java/com/hubilon/gateway/config/GatewayProperties.java`

요청 경로 → clientId 매핑, 보안 설정, 허용 도메인 allowlist 통합 관리

```java
@ConfigurationProperties(prefix = "gateway")
public record GatewayProperties(
    String baseUrl,                         // 게이트웨이 외부 base URL (callback redirect_uri 조합용)
    Map<String, String> pathToClientId,     // /api/sso/** -> sso-index-web 등
    List<String> allowedRedirectDomains,    // open redirect 방지 허용 도메인 목록
    String stateHmacSecret,                 // state 서명용 HMAC-SHA256 secret (최소 32바이트)
    int jwtExpiryBufferSeconds              // 선제적 갱신 버퍼 (기본값 30)
) {}
```

### 1-3. `StateService` 추가 (CSRF 방지)
**파일**: `gateway/src/main/java/com/hubilon/gateway/security/StateService.java`

**역할**: 로그인 흐름의 CSRF 방지용 state 토큰 생성 및 검증

```
생성:
  payload = { nonce: UUID, returnUrl: 원래요청URL, clientId, exp: now+5분 }
  state = Base64URL(JSON(payload)) + "." + HMAC-SHA256(payload, stateHmacSecret)

검증:
  1. "." 기준으로 payload / signature 분리
  2. HMAC 재계산 → 서명 일치 여부 확인
  3. exp 만료 여부 확인
  4. 반환: StatePayload { nonce, returnUrl, clientId }
```

state는 httpOnly 쿠키(`oauth_state`)에 저장:
- maxAge=5분, path=/, SameSite=Lax(로컬)/None;Secure(프로덕션)

### 1-4. `JwtVerifier` 추가 (서명 검증)
**파일**: `gateway/src/main/java/com/hubilon/gateway/security/JwtVerifier.java`

**역할**: access_token의 서명·만료·issuer를 ReactiveJwtDecoder로 검증

```java
// NimbusReactiveJwtDecoder 사용 — Keycloak JWK endpoint에서 공개키 자동 갱신
// 검증 항목: 서명(RS256), exp, iss (keycloak realm URL)
// JWK 캐싱: 기본 5분 캐시 (Keycloak 공개키 교체 주기 고려)
// 선제적 갱신 버퍼: exp - jwtExpiryBufferSeconds < now 이면 만료 처리
```

반환 타입: `Mono<Jwt>` — 검증 성공 / `Mono.error(JwtException)` — 실패

### 1-5. `AllowlistValidator` 추가 (open redirect 방지)
**파일**: `gateway/src/main/java/com/hubilon/gateway/security/AllowlistValidator.java`

```java
// GatewayProperties.allowedRedirectDomains 기준으로 URL 도메인 검증
// 허용 도메인: 게이트웨이 자체 + 각 서비스 프론트 도메인
// 검증 실패 시 예외 발생 — 리다이렉트 차단
boolean isAllowed(String url);
```

### 1-6. `AuthenticationFilter` 전면 재작성
**파일**: `gateway/src/main/java/com/hubilon/gateway/filter/AuthenticationFilter.java`

**화이트리스트** (필터 제외):
- `/callback/**`
- `/logout`
- `/actuator/health`
- `/api-docs/**`, `/swagger-ui/**`

**토큰 검증 및 갱신 흐름**:

```
1. access_token 쿠키 추출
2. JwtVerifier로 서명·만료·issuer 검증
   → 선제적 갱신 조건: exp - 30초 < now
3. 유효(갱신 불필요) → JWT claims에서 X-User 헤더 주입 후 chain 진행
4. 만료(또는 선제 갱신 대상) → refresh_token 쿠키 추출
5. refresh_token 있음 → Keycloak /token (grant_type=refresh_token, client_id, client_secret) 호출
   → 성공:
      - 새 access_token httpOnly 쿠키 set
      - 새 refresh_token httpOnly 쿠키 set
      - JWT claims 재파싱 → X-User 헤더 주입
      - 원래 요청 chain 진행
   → 실패: 401 or 302 + X-Redirect-To: loginUrl (returnUrl 포함)
6. refresh_token 없음 → 401 or 302 + X-Redirect-To: loginUrl (returnUrl 포함)
```

**Accept 헤더 분기 처리** (브라우저 직접 진입 대응):
```
Accept: text/html → 302 redirect to loginUrl
Accept: application/json (또는 미포함) → 401 + X-Redirect-To 헤더
```

**loginUrl 구성**:
```
1. 요청 경로 → GatewayProperties.pathToClientId에서 clientId 조회
   (매핑 없으면 fallback clientId 사용)
2. state = StateService.generate(clientId, returnUrl=원래요청URL)
3. state를 oauth_state 쿠키에 저장 (httpOnly, 5분)
4. loginUrl = keycloak.authEndpoint
   + ?response_type=code
   + &client_id={clientId}
   + &redirect_uri={gatewayBaseUrl}/callback/{clientId}
   + &scope=openid profile email
   + &state={state}
```

**쿠키 설정**:
- access_token: httpOnly, path=/, maxAge=expiresIn
- refresh_token: httpOnly, path=/, maxAge=30일
- oauth_state: httpOnly, path=/, maxAge=300 (5분)
- SameSite: 로컬=Lax, 프로덕션=None;Secure (Spring 프로파일로 분리)

**X-User 헤더 주입** (Keycloak JWT claims 기반):
- `X-User-Id`: sub
- `X-User-Email`: email
- `X-User-Role`: realm_access.roles[0]
- 요청 수신 시 기존 X-User 헤더를 먼저 제거 (헤더 인젝션 차단)

### 1-7. `CallbackController` 추가
**파일**: `gateway/src/main/java/com/hubilon/gateway/controller/CallbackController.java`

```
GET /callback/{clientId}?code=...&state=...
```

**동작**:

```
1. state 검증:
   a. 요청 쿠키에서 oauth_state 추출
   b. StateService.verify(쿼리파라미터 state, 쿠키 state)
   c. 불일치 또는 만료 → 400 Bad Request
   d. 검증 성공 → returnUrl, clientId 추출
   e. oauth_state 쿠키 즉시 삭제 (maxAge=0)

2. clientId 유효성 검증:
   - KeycloakProperties.clients에 존재하는 clientId인지 확인
   - 없으면 400

3. Keycloak /token 호출 (Confidential client, 서버 간 처리):
   - grant_type=authorization_code
   - client_id={clientId}
   - client_secret={clients[clientId].secret}
   - code={code}
   - redirect_uri={gatewayBaseUrl}/callback/{clientId}

4. 성공:
   - access_token httpOnly 쿠키 set
   - refresh_token httpOnly 쿠키 set
   - returnUrl을 AllowlistValidator로 검증 후 리다이렉트
   - (returnUrl 없으면 clients[clientId].serviceRedirectUrl로 이동)

5. Keycloak 실패 → 400
```

**참고**: Spring Cloud Gateway는 WebFlux 기반이므로 `@RestController` + `Mono<ServerResponse>` 또는 `Mono<Void>` 반환 사용

### 1-8. `LogoutController` 추가
**파일**: `gateway/src/main/java/com/hubilon/gateway/controller/LogoutController.java`

```
POST /logout
```

**동작**:

```
1. access_token, refresh_token 쿠키 즉시 삭제 (maxAge=0) — 반드시 보장
2. refresh_token이 있었다면 Keycloak /logout 호출:
   - client_id (요청 쿠키의 last-client-id 또는 고정값)
   - client_secret
   - refresh_token
   → 성공: 정상 처리
   → 실패: WARN 로그 기록, 응답에 X-Logout-Warning: keycloak-session-not-terminated 헤더 추가
3. 200 OK 반환 (쿠키 삭제는 항상 보장)
```

**주의**: Keycloak logout 실패해도 클라이언트 쿠키는 항상 삭제. 탈취된 refresh_token 재사용 방지를 위해 Keycloak logout 실패 시 로그 + 모니터링 알림 권장.

### 1-9. `CorsConfig` 업데이트
**파일**: `gateway/src/main/java/com/hubilon/gateway/config/CorsConfig.java`

```
- allowedOrigins: GatewayProperties.allowedRedirectDomains에서 주입 (wildcard 제거)
- exposedHeaders: X-Redirect-To, X-Logout-Warning 추가
- allowCredentials: true
- allowedMethods: GET, POST, OPTIONS
- maxAge: 3600
```

### 1-10. `application.yml` 업데이트
**파일**: `gateway/src/main/resources/application.yml`

```yaml
keycloak:
  url: ${KEYCLOAK_URL:http://localhost:8000}
  realm: hubilon_pd
  clients:
    sso-index-web:
      secret: ${KEYCLOAK_SSO_SECRET}            # 필수 — 기본값 없음
      service-redirect-url: ${SSO_FRONTEND_URL:http://localhost:5173}
    git-digest-web:
      secret: ${KEYCLOAK_GIT_SECRET}            # 필수
      service-redirect-url: ${GIT_FRONTEND_URL:http://localhost:5174}
    test-web:
      secret: ${KEYCLOAK_TEST_SECRET}           # 필수
      service-redirect-url: ${TEST_FRONTEND_URL:http://localhost:5175}

gateway:
  base-url: ${GATEWAY_BASE_URL:http://localhost:8000}
  path-to-client-id:
    "/api/sso/**": sso-index-web
    "/api/git/**": git-digest-web
    "/api/test/**": test-web
  allowed-redirect-domains:
    - localhost:5173
    - localhost:5174
    - localhost:5175
    - localhost:8000
    # 프로덕션 추가: - yourdomain.com
  state-hmac-secret: ${STATE_HMAC_SECRET}      # 필수 — 최소 32바이트 랜덤 문자열
  jwt-expiry-buffer-seconds: 30

# SameSite 프로파일 분리
---
spring:
  config:
    activate:
      on-profile: local
cookie:
  same-site: Lax
  secure: false

---
spring:
  config:
    activate:
      on-profile: prod
cookie:
  same-site: None
  secure: true
```

**제거 항목**:
- `sso.introspect-url` (더 이상 SSO 백엔드 통해 검증 안 함)
- `sso.login-page-url` (loginUrl을 동적으로 생성)

**기존 라우팅 유지** (`/callback/**`, `/logout`는 라우팅 목록에 추가하지 않음 — 게이트웨이 자체 컨트롤러가 처리):
```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: sso-route
          uri: ${SSO_SERVICE_URI:http://localhost:8080}
          predicates:
            - Path=/api/sso/**
          filters:
            - RewritePath=/api/sso(?<segment>.*), /api${segment}
        # ... 기타 라우트
        # /callback/**, /logout 는 여기 추가하지 않음
```

### 1-11. `SsoProperties` 단순화 또는 제거
`introspectUrl`, `loginPageUrl` 제거 → `GatewayProperties`로 대체

---

## Phase 2: Backend — 토큰 처리 제거

### 2-1. 제거 대상 파일

| 파일 | 이유 |
|------|------|
| `AuthController.java` | `/token`, `/refresh`, `/logout`, `/me` 전부 게이트웨이로 이동 |
| `AuthApplicationService.java` | Keycloak 토큰 교환 로직 전체 |
| `ExchangeTokenUseCase.java` | port/in 인터페이스 |
| `TokenRequest.java` | DTO |
| `TokenResult.java` | domain model |
| `KeycloakProperties.java` | 설정 |
| `RestTemplateConfig.java` | Keycloak 호출용 RestTemplate |
| `CookieTokenFilter.java` | 쿠키 기반 JWT 필터 |

### 2-2. `SecurityConfig` 변경 — X-User-Id 헤더 검증 적용
**파일**: `backend/src/main/java/com/hubilon/sso/infrastructure/config/SecurityConfig.java`

```
변경 방향:
- Spring Security JWT 검증 제거 (게이트웨이가 이미 검증)
- 모든 /api/** 경로에 대해 X-User-Id 헤더 존재 여부 필터 추가
- 헤더 없으면 403 반환
- /actuator/health, /api-docs/** 는 제외
```

**구현 방식**: `OncePerRequestFilter`를 상속한 `InternalRequestFilter` 추가
- `X-User-Id` 헤더가 없으면 403
- `X-User-Id` 헤더가 있으면 SecurityContext에 사용자 정보 세팅

### 2-3. `application.yml` 변경
제거:
- `keycloak.*` 설정 전체
- `cookie.secure`
- `spring.security.oauth2.*` (JWT 리소스 서버 설정)

---

## Phase 3: Frontend (SSO 포탈) — Keycloak 제거

### 3-1. 제거 대상 파일

| 파일 | 이유 |
|------|------|
| `lib/pkce.ts` | PKCE 생성 로직 (게이트웨이로 이동) |
| `lib/auth.ts` | `startLogin()` (Keycloak URL 직접 구성), `startLogout()` |
| `pages/CallbackPage.tsx` | 코드 수신 → `/api/auth/token` 호출 (게이트웨이로 이동) |
| `hooks/useAuthInit.ts` | PKCE 흐름 초기화 |

### 3-2. 수정 대상 파일

**`lib/apiClient.ts`**:
```typescript
// 변경 전: 401 시 /api/auth/refresh 재시도 → startLogin()
// 변경 후:
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      const redirectTo = error.response.headers['x-redirect-to']
      if (redirectTo) {
        // open redirect 방지: 허용 도메인인지 확인
        const allowed = isAllowedDomain(redirectTo)  // 환경변수로 관리
        if (allowed) window.location.href = redirectTo
      }
    }
    return Promise.reject(error)
  }
)
```

**`router/index.tsx`**: `/callback` 라우트 제거

**`pages/HomePage.tsx`**:
- 로그인 버튼 없이 최초 API 호출 → 401 + X-Redirect-To → 게이트웨이 로그인 URL로 자동 이동
- 또는 로그인 버튼 클릭 시 `/api/sso/services` 호출 → 게이트웨이가 401 + X-Redirect-To 반환

**`hooks/useAuth.ts`**:
- PKCE/Keycloak 관련 상태 제거
- 로그아웃: `POST /logout` (게이트웨이 logout 엔드포인트)

**`store/authStore.ts`**:
- 토큰 관련 상태 제거 (쿠키 기반, 프론트가 토큰 직접 보관 불필요)
- 사용자 정보는 `/api/sso/services` 응답 헤더 X-User-Email 등에서 추출

### 3-3. `.env` / 환경 변수 정리

제거:
- `VITE_KEYCLOAK_URL`
- `VITE_KEYCLOAK_REALM`
- `VITE_KEYCLOAK_CLIENT_ID`
- `VITE_REDIRECT_URI`

추가:
- `VITE_ALLOWED_REDIRECT_DOMAINS` — open redirect 방지용 허용 도메인 목록

유지:
- `VITE_API_BASE_URL`

---

## Phase 4: 각 서비스 Frontend — 401 처리 통일

> 대상: `test-frontend`, git-digest 프론트 등 각 서비스의 프론트엔드

### 공통 변경 사항

1. Keycloak 관련 env 변수 제거
2. Keycloak SDK/라이브러리 import 제거
3. apiClient 401 처리 통일 패턴:

```typescript
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      const redirectTo = error.response.headers['x-redirect-to']
      if (redirectTo && isAllowedDomain(redirectTo)) {
        window.location.href = redirectTo
      }
    }
    return Promise.reject(error)
  }
)

function isAllowedDomain(url: string): boolean {
  try {
    const parsed = new URL(url)
    const allowed = import.meta.env.VITE_ALLOWED_REDIRECT_DOMAINS?.split(',') ?? []
    return allowed.some(d => parsed.host === d.trim())
  } catch {
    return false
  }
}
```

4. 각 서비스 백엔드 CORS 설정: `exposedHeaders: X-Redirect-To` 확인

---

## Phase 5: Keycloak 설정 변경 (수동 작업)

Keycloak Admin Console에서 각 client 설정 변경:

### 5-1. Client Type 변경 (Public → Confidential)

| Client | 변경 내용 |
|--------|-----------|
| sso-index-web | Access Type: confidential, Client Secret 발급 |
| git-digest-web | Access Type: confidential, Client Secret 발급 |
| test-web | Access Type: confidential, Client Secret 발급 |

발급된 secret을 게이트웨이 환경 변수에 설정:
- `KEYCLOAK_SSO_SECRET`
- `KEYCLOAK_GIT_SECRET`
- `KEYCLOAK_TEST_SECRET`

### 5-2. Valid Redirect URIs 변경

| Client | 변경 후 |
|--------|---------|
| sso-index-web | http://localhost:8000/callback/sso-index-web |
| git-digest-web | http://localhost:8000/callback/git-digest-web |
| test-web | http://localhost:8000/callback/test-web |

프로덕션: `https://게이트웨이도메인/callback/{clientId}`

### 5-3. PKCE 요구 설정 해제

각 client → Advanced → Proof Key for Code Exchange Code Challenge Method → 비워두기 (None)
(Gateway가 Confidential client이므로 PKCE 불필요)

### 5-4. Web Origins 추가

게이트웨이 도메인 및 각 서비스 프론트 도메인 추가:
- `http://localhost:8000`
- `http://localhost:5173`
- `http://localhost:5174`
- `http://localhost:5175`

---

## 구현 순서

```
Phase 1: Gateway (백엔드 아키텍트 에이전트)
  → 1-1  KeycloakProperties
  → 1-2  GatewayProperties
  → 1-3  StateService (CSRF 방지)
  → 1-4  JwtVerifier (서명 검증 + 선제 갱신)
  → 1-5  AllowlistValidator (open redirect 방지)
  → 1-6  AuthenticationFilter 재작성
  → 1-7  CallbackController (state 검증 포함)
  → 1-8  LogoutController
  → 1-9  CorsConfig 업데이트
  → 1-10 application.yml 업데이트
  → 1-11 SsoProperties 제거

Phase 2: Backend SSO (백엔드 아키텍트 에이전트)
  → 제거 파일 삭제
  → InternalRequestFilter 추가 (X-User-Id 검증)
  → SecurityConfig 업데이트
  → application.yml 정리

Phase 3: Frontend SSO (프론트 아키텍트 에이전트)
  → 파일 제거 및 수정
  → open redirect 방지 함수 추가

Phase 4: 각 서비스 Frontend (프론트 아키텍트 에이전트)
  → 401 처리 통일 + open redirect 방지 함수 추가

Phase 5: Keycloak 설정 (수동 — 사용자가 직접)
  → Confidential client 전환
  → Redirect URI 변경
  → PKCE 설정 해제
```

---

## 보안 이슈 해소 요약

| 이슈 | 해소 방법 |
|------|-----------|
| CSRF (state 미검증) | StateService: HMAC-SHA256 서명 state + httpOnly 쿠키 검증 |
| PKCE 제거 위험 | Confidential client(client_secret)으로 전환 — 서버 간 code 교환 |
| open redirect | AllowlistValidator + 프론트 isAllowedDomain() 이중 검증 |
| JWT 서명 미검증 | ReactiveJwtDecoder + Keycloak JWK (서명·만료·issuer 동시 검증) |
| race condition | exp-30초 버퍼로 선제적 갱신 |
| 브라우저 직접 진입 | Accept: text/html → 302 redirect |
| SameSite 충돌 | Spring 프로파일로 local/prod 분리 |
| logout 실패 처리 | 쿠키 삭제 항상 보장 + 경고 로그 + X-Logout-Warning 헤더 |
| returnUrl 누락 | state에 returnUrl 포함, 로그인 완료 후 원래 URL로 복귀 |
| 백엔드 직접 접근 | InternalRequestFilter: X-User-Id 헤더 없으면 403 |

---

## Review 결과
- 검토일: 2026-04-22
- 검토 항목: 보안 / 리팩토링 / 기능
- 결과: 검토 이슈 10건 → 전부 플랜에 반영하여 수정 완료
