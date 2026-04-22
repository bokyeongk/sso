# 게이트웨이 OAuth2 인증 전담 구조 전환 플랜

> 작성일: 2026-04-22

## 목표

포털 백엔드가 담당하던 Keycloak 인가코드→토큰 교환 로직을 API Gateway로 이전한다.
Spring Cloud Gateway + OAuth2 Client를 통해 게이트웨이가 Keycloak 로그인 흐름 전체를 처리하고,
발급된 Access Token을 하위 서비스로 `TokenRelay` 필터를 통해 자동 전달한다.

---

## 현재 구조 (AS-IS)

```
브라우저 → 프론트(Vue) → SSO 백엔드 /api/auth/token (code → token 교환)
                       → SSO 백엔드 /api/auth/refresh
게이트웨이: 커스텀 AuthenticationFilter → SSO 백엔드 /api/auth/me (토큰 검증)
```

## 목표 구조 (TO-BE)

```
브라우저 → 게이트웨이(OAuth2 Client) → Keycloak (로그인 + code → token 교환)
게이트웨이: Spring Security 인증 처리 + TokenRelay → 하위 서비스에 Bearer 토큰 전달
```

---

## 작업 범위

### 1단계: 게이트웨이 의존성 추가 (게이트웨이 에이전트)

**파일**: `gateway/build.gradle`

추가할 의존성:
- `org.springframework.boot:spring-boot-starter-oauth2-client`
- `org.springframework.boot:spring-boot-starter-security`

> `spring-cloud-starter-gateway`는 이미 존재하며, TokenRelayGatewayFilterFactory는 oauth2-client가 있으면 자동 활성화된다.

---

### 2단계: application.yml OAuth2 Client 설정 (게이트웨이 에이전트)

**파일**: `gateway/src/main/resources/application.yml`

추가 설정 항목:
```yaml
spring:
  security:
    oauth2:
      client:
        registration:
          keycloak:
            client-id: ${KEYCLOAK_CLIENT_ID:sso-gateway}
            client-secret: ${KEYCLOAK_CLIENT_SECRET:}
            authorization-grant-type: authorization_code
            redirect-uri: "{baseUrl}/login/oauth2/code/{registrationId}"
            scope: openid, profile, email
        provider:
          keycloak:
            issuer-uri: ${KEYCLOAK_ISSUER_URI:http://localhost:9090/realms/hubilon}
            user-name-attribute: preferred_username
```

기존 라우팅에 `TokenRelay` 필터 추가:
```yaml
filters:
  - TokenRelay=
  - RewritePath=...
```

기존 `sso.introspect-url`, `sso.login-page-url` 설정 제거 (게이트웨이 자체 OAuth2가 대체).

---

### 3단계: 게이트웨이 Security 설정 추가 (게이트웨이 에이전트)

**신규 파일**: `gateway/src/main/java/com/hubilon/gateway/config/SecurityConfig.java`

- `SecurityWebFilterChain` 빈 등록 (WebFlux 기반 → `ServerHttpSecurity` 사용)
- 화이트리스트 경로 (`/actuator/health`, `/api-docs/**` 등)는 `permitAll()`
- 나머지 모든 요청은 `authenticated()` → 미인증 시 Keycloak 로그인 페이지로 자동 리다이렉트
- `oauth2Login(Customizer.withDefaults())` 활성화
- CSRF 비활성화 (API Gateway + SPA 구조)

---

### 4단계: 기존 AuthenticationFilter 개선 (게이트웨이 에이전트)

**파일**: `gateway/src/main/java/com/hubilon/gateway/filter/AuthenticationFilter.java`

현재 역할: SSO 백엔드를 호출해 토큰 검증 → X-User-* 헤더 주입  
변경 후 역할: Spring Security가 인증을 완료한 후, SecurityContext에서 사용자 정보를 추출해 X-User-* 헤더 주입

변경 내용:
- WebClient로 SSO 백엔드 `/api/auth/me` 호출 로직 **제거**
- 미인증 시 401 반환 로직 **제거** (Spring Security가 처리)
- `ReactiveSecurityContextHolder`에서 `OAuth2AuthenticationToken` 추출
- Principal의 attributes(claims)에서 `sub`, `email`, `realm_access.roles[0]` 파싱 → X-User-* 헤더 주입
- `SsoProperties` 클래스 및 관련 설정 제거

---

### 5단계: 포털 백엔드 정리 (백엔드 에이전트)

**제거 대상 파일/클래스**:

| 파일 | 처리 |
|------|------|
| `adapter/in/web/AuthController.java` | `/token`, `/refresh`, `/logout` 엔드포인트 제거. `/me` 엔드포인트는 유지 |
| `application/service/AuthApplicationService.java` | `exchange()`, `refresh()`, `logout()` 메서드 제거 |
| `application/port/in/ExchangeTokenUseCase.java` | 삭제 |
| `domain/model/TokenResult.java` | 삭제 |
| `infrastructure/config/KeycloakProperties.java` | `tokenEndpoint()`, `logoutEndpoint()` 제거. `url`, `realm`, `clientId` 속성은 JWT 검증용 issuer-uri로 유지 여부 검토 |
| `infrastructure/config/RestTemplateConfig.java` | 삭제 (더 이상 RestTemplate 불필요) |

**유지 대상**:
- `AuthController.GET /api/auth/me` — 게이트웨이에서 X-User 헤더 주입으로 대체 가능하나, JWT 기반 사용자 정보 API로 유지 검토
- `SecurityConfig` — JWT Resource Server 설정은 하위 서비스 보호용으로 유지

---

## 실행 순서

```
1단계: DB 에이전트 작업 없음 (스킵)
2단계: 게이트웨이 에이전트 → build.gradle + application.yml + SecurityConfig.java + AuthenticationFilter.java
3단계: 백엔드 에이전트 → AuthController, AuthApplicationService 정리
```

---

## 환경 변수 추가 (`.env.example`)

```
KEYCLOAK_CLIENT_ID=sso-gateway
KEYCLOAK_CLIENT_SECRET=<client-secret>
KEYCLOAK_ISSUER_URI=http://localhost:9090/realms/hubilon
```

---

## 주의사항

1. `TokenRelay` 필터는 `spring-boot-starter-oauth2-client` 의존성이 있어야 활성화된다.
2. Spring Cloud Gateway는 WebFlux 기반이므로 `SecurityWebFilterChain`을 사용해야 하며, 서블릿 기반 `SecurityFilterChain`은 사용 불가.
3. 기존 프론트엔드가 `/api/sso/auth/token`을 직접 호출하는 로직이 있다면, 프론트엔드도 수정이 필요하다. (플랜 범위 외 — 별도 확인 필요)
4. 백엔드 `/api/auth/me` 엔드포인트는 게이트웨이가 X-User-* 헤더로 사용자 정보를 전달하면 불필요해지지만, 하위 서비스들이 직접 사용하고 있을 수 있으므로 즉시 삭제하지 않고 deprecated 처리를 권장한다.
