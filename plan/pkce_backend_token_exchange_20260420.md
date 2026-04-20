# PKCE Backend Token Exchange 플랜
작성일: 2026-04-20
수정일: 2026-04-20 (redirectUri 서버 환경변수 처리, 토큰 HttpOnly Cookie 설정, 리뷰 이슈 반영)

## 목표

현재는 `keycloak-js`가 프론트엔드에서 Keycloak과 직접 토큰 교환을 처리한다.
변경 후에는 프론트엔드가 인가코드만 받아 백엔드로 전달하고,
백엔드가 Keycloak 토큰 엔드포인트를 직접 호출해 토큰을 HttpOnly Cookie로 발급한다.

---

## 변경 후 흐름

```
[1]  프론트 → code_verifier 생성 + code_challenge 계산 (SHA-256 / Base64URL)
[2]  프론트 → sessionStorage에 code_verifier 저장
[3]  프론트 → Keycloak authorize 엔드포인트로 리다이렉트
          (파라미터: client_id, redirect_uri, response_type=code,
                     code_challenge, code_challenge_method=S256)
[4]  Keycloak → 로그인 완료 후 redirect_uri?code=xxx 로 리다이렉트
             → 오류 시 redirect_uri?error=access_denied 로 리다이렉트
[5]  프론트 → URL에서 error 파라미터 먼저 확인 (있으면 에러 처리 + verifier 정리)
          → code 추출, sessionStorage에서 code_verifier 꺼냄
[6]  프론트 → POST /api/auth/token { code, codeVerifier }
          (redirectUri는 프론트가 전달하지 않음)
[7]  백엔드 → Keycloak 토큰 엔드포인트 호출
          (grant_type=authorization_code, code, code_verifier, client_id,
           redirect_uri = KeycloakProperties.redirectUri (환경변수))
[8]  백엔드 → accessToken, refreshToken을 HttpOnly Cookie로 Set-Cookie 응답
          (JS에서 직접 접근 불가 → XSS 탈취 차단)
[9]  프론트 → isAuthenticated = true 설정 후 '/' 로 이동
[10] 앱 초기화(새로고침) → GET /api/auth/me 호출 → 쿠키 유효 시 isAuthenticated 복원
[11] 프론트 → API 요청 시 withCredentials: true (쿠키 자동 첨부)
[12] 백엔드 → CookieTokenFilter가 access_token 쿠키 → Authorization 헤더로 변환
          → 기존 JWT Resource Server 검증 통과
[13] 401 응답 → POST /api/auth/refresh (withCredentials) → 새 쿠키 발급 → 원래 요청 재시도(1회)
          → 재시도도 실패 시 startLogin()
```

---

## 현재 vs 변경

| 항목 | 현재 | 변경 후 |
|------|------|---------|
| 토큰 교환 주체 | keycloak-js (프론트) | 백엔드 |
| PKCE 처리 | keycloak-js 내부 | 프론트가 직접 구현 |
| code_verifier 위치 | keycloak-js 내부 | sessionStorage (임시) → 콜백 처리 후 반드시 삭제 |
| redirectUri 출처 | keycloak-js 내부 | 백엔드 환경변수 (프론트 전달 없음) |
| accessToken 저장 | keycloak-js 메모리 | HttpOnly Cookie |
| refreshToken 저장 | keycloak-js 메모리 | HttpOnly Cookie (Path 제한) |
| API 인증 방식 | Authorization: Bearer 헤더 | Cookie → 백엔드 필터가 헤더로 변환 |
| 새로고침 복원 | keycloak-js 자동 | GET /api/auth/me 로 상태 복원 |
| keycloak-js | 사용 | 제거 |

---

## Keycloak 클라이언트 설정 조건

> 아래 설정이 Keycloak Admin Console에 적용되어 있어야 한다.

- **Access Type**: Public (secret 없음)
- **Standard Flow Enabled**: ON
- **PKCE Code Challenge Method**: S256
- **Valid Redirect URIs**: `http://localhost:5173/callback` (개발), 운영 URL 추가

---

## Backend 구현

### 1. `application.yml` 환경변수 추가
```yaml
keycloak:
  url: ${KEYCLOAK_URL}                       # http://192.168.10.30:8080
  realm: ${KEYCLOAK_REALM}                   # hubilon_pd
  client-id: ${KEYCLOAK_CLIENT_ID}           # sso-index-web
  redirect-uri: ${KEYCLOAK_REDIRECT_URI}     # http://localhost:5173/callback
                                             # ※ 프론트 VITE_REDIRECT_URI와 반드시 동일해야 함

cookie:
  secure: ${COOKIE_SECURE:false}   # 운영: true (HTTPS 필수)
```

> **주의**: `KEYCLOAK_REDIRECT_URI`(백엔드)와 `VITE_REDIRECT_URI`(프론트)는 반드시 동일한 값으로 배포해야 한다.
> 불일치 시 Keycloak이 `redirect_uri mismatch` 오류를 반환한다.
> CI/CD 파이프라인에서 두 값 일치 여부를 사전 검증한다.

### 2. `infrastructure/config/KeycloakProperties.java` (신규)
```java
@ConfigurationProperties(prefix = "keycloak")
public record KeycloakProperties(String url, String realm, String clientId, String redirectUri) {
    public String tokenEndpoint() {
        return url + "/realms/" + realm + "/protocol/openid-connect/token";
    }
    public String logoutEndpoint() {
        return url + "/realms/" + realm + "/protocol/openid-connect/logout";
    }
}
```
`SsoApplication.java`에 `@EnableConfigurationProperties(KeycloakProperties.class)` 추가.

### 3. `domain/model/TokenResult.java` (신규)
포트 인터페이스가 반환하는 순수 도메인 DTO (인프라 의존 없음):
```java
public record TokenResult(String accessToken, String refreshToken, int expiresIn) {}
```

### 4. `application/port/in/ExchangeTokenUseCase.java` (신규)
포트는 순수 Java 타입만 사용 — `HttpServletResponse` 미포함:
```java
public interface ExchangeTokenUseCase {
    TokenResult exchange(String code, String codeVerifier);
    TokenResult refresh(String refreshToken);
    void logout(String refreshToken);        // Keycloak 세션 종료 포함
}
```

### 5. `application/service/AuthApplicationService.java` (신규)
- `RestTemplate`으로 Keycloak 토큰 엔드포인트 POST
- `redirectUri`는 `keycloakProperties.redirectUri()` 사용 (파라미터 불필요)
- `exchange()`: `grant_type=authorization_code`, `TokenResult` 반환
- `refresh()`: `grant_type=refresh_token`, `TokenResult` 반환
- `logout()`: Keycloak `POST /protocol/openid-connect/logout` 호출 (백엔드에서 처리)
- Keycloak 오류 응답 시 `ServiceException(ErrorCode.AUTH_TOKEN_EXCHANGE_FAILED)` throw
- 쿠키 설정 로직 없음 — 컨트롤러에서 처리

### 6. `infrastructure/config/RestTemplateConfig.java` (신규)
```java
@Configuration
public class RestTemplateConfig {
    @Bean
    public RestTemplate restTemplate() { return new RestTemplate(); }
}
```

### 7. `infrastructure/security/CookieTokenFilter.java` (신규)
access_token 쿠키를 Authorization 헤더로 변환 — 기존 JWT 검증 재사용:
```java
@Component
public class CookieTokenFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(...) {
        String token = extractTokenFromCookie(request);
        if (token != null) {
            // request를 래핑하여 Authorization: Bearer {token} 헤더 추가
            chain.doFilter(new BearerRequestWrapper(request, token), response);
            return;
        }
        chain.doFilter(request, response);
    }
}
```

### 8. `adapter/in/web/AuthController.java` (신규)
**쿠키 설정 책임은 컨트롤러(어댑터 레이어)에서 담당**:

```java
@RestController @RequiredArgsConstructor
@RequestMapping("/api/auth")
public class AuthController {

    // POST /api/auth/token — 인증 불필요
    // TokenResult → ResponseEntity에 쿠키 설정 후 ApiResponse.ok() 반환

    // POST /api/auth/refresh — 인증 불필요
    // @CookieValue("refresh_token") 으로 쿠키 직접 읽음
    // TokenResult → 새 쿠키 설정

    // POST /api/auth/logout — 인증 필요 (permitAll 제외)
    // @CookieValue("refresh_token") 으로 쿠키 읽음
    // ExchangeTokenUseCase.logout() → Keycloak 세션 종료
    // 쿠키 maxAge=0으로 만료 처리
    // 프론트는 이 엔드포인트 하나만 호출하면 됨

    // GET /api/auth/me — 인증 필요 (JWT 쿠키 검증 통과 시 200)
    // 새로고침 시 isAuthenticated 복원용
    // 유효한 access_token 쿠키가 있으면 200, 없으면 401
}
```

**쿠키 설정 공통 로직 (컨트롤러 내부 private 메서드)**:
```java
private void setTokenCookies(HttpServletResponse response, TokenResult result) {
    ResponseCookie accessCookie = ResponseCookie.from("access_token", result.accessToken())
        .httpOnly(true)
        .secure(cookieSecure)         // application.yml cookie.secure 값 주입
        .sameSite("Strict")           // B-2: CSRF 방어 강화
        .path("/")
        .maxAge(result.expiresIn())
        .build();

    ResponseCookie refreshCookie = ResponseCookie.from("refresh_token", result.refreshToken())
        .httpOnly(true)
        .secure(cookieSecure)
        .sameSite("Strict")
        .path("/api/auth/refresh")    // refresh 엔드포인트에만 전송
                                      // ※ 이 prefix 하위에 다른 엔드포인트 추가 금지
        .maxAge(Duration.ofDays(30).getSeconds())
        .build();

    response.addHeader(HttpHeaders.SET_COOKIE, accessCookie.toString());
    response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());
}
```

### 9. `adapter/in/web/dto/TokenRequest.java` (신규)
```java
public record TokenRequest(
    @NotBlank String code,
    @NotBlank String codeVerifier
) {}
```
> redirectUri는 백엔드 환경변수에서 처리하므로 요청 파라미터에서 제거.

### 10. `infrastructure/exception/ErrorCode.java` 수정
```java
AUTH_TOKEN_EXCHANGE_FAILED(400, "토큰 교환에 실패했습니다.")
```

### 11. `infrastructure/config/SecurityConfig.java` 수정
```java
// CookieTokenFilter를 BearerTokenAuthenticationFilter 앞에 등록
.addFilterBefore(cookieTokenFilter, BearerTokenAuthenticationFilter.class)

// permitAll 범위 최소화
.requestMatchers("/api/auth/token", "/api/auth/refresh").permitAll()
// /api/auth/logout, /api/auth/me 는 인증 필요 (anyRequest().authenticated() 포함)

// CORS: allowedOrigins 명시 (와일드카드 * 사용 불가 — withCredentials와 함께 사용 시 브라우저 차단)
```

### 12. `infrastructure/config/CorsConfig.java` 수정 (SecurityConfig 내 corsConfigurationSource)
```java
config.setAllowedOrigins(List.of(
    "http://localhost:5173",      // 개발
    "${ALLOWED_ORIGIN}"           // 운영 — 환경변수로 주입
));
config.setAllowCredentials(true); // withCredentials 쿠키 전송을 위해 필수
```
> **주의**: `allowCredentials(true)`와 `allowedOriginPatterns("*")` 조합은 브라우저가 쿠키를 차단한다.
> 명시적 origin 목록을 반드시 설정해야 refresh 쿠키가 정상 전송된다.

---

## Frontend 구현

### 제거
- `src/lib/keycloak.ts` — 삭제
- `src/hooks/useKeycloak.ts` — 삭제
- `keycloak-js` 패키지 — `npm uninstall keycloak-js`

### 1. `src/lib/pkce.ts` (신규)
Web Crypto API(`crypto.subtle`) 사용 — 외부 라이브러리 불필요:
```ts
export async function generateCodeVerifier(): Promise<string>
// 43~128자 랜덤 문자열 (A-Z a-z 0-9 - . _ ~)

export async function generateCodeChallenge(verifier: string): Promise<string>
// SHA-256(verifier) → Base64URL 인코딩
```

### 2. `.env` 수정
```
VITE_KEYCLOAK_URL=http://192.168.10.30:8080
VITE_KEYCLOAK_REALM=hubilon_pd
VITE_KEYCLOAK_CLIENT_ID=sso-index-web
VITE_REDIRECT_URI=http://localhost:5173/callback
VITE_API_BASE_URL=http://localhost:8080
```
> `VITE_REDIRECT_URI`는 백엔드 `KEYCLOAK_REDIRECT_URI`와 반드시 동일해야 한다.

### 3. `src/lib/auth.ts` (신규)
```ts
export async function startLogin(): Promise<void>
// 1. code_verifier 생성
// 2. sessionStorage.setItem('pkce_verifier', verifier)
// 3. code_challenge 계산
// 4. Keycloak authorize URL 조립 후 location.href 이동
//    redirect_uri = VITE_REDIRECT_URI

export async function startLogout(): Promise<void>
// 1. POST /api/auth/logout (withCredentials: true)
//    → 백엔드가 Keycloak 세션 종료 + 쿠키 만료 처리 일괄 수행
// 2. authStore.setAuthenticated(false)
// 3. 로그인 페이지로 이동
// ※ 프론트에서 직접 Keycloak logout URL 이동 불필요
```

### 4. `src/store/authStore.ts` (신규)
토큰은 HttpOnly 쿠키로 관리 — JS에서 토큰 직접 보관 불필요:
```ts
interface AuthState {
  isAuthenticated: boolean
  setAuthenticated: (value: boolean) => void
}
```

### 5. `src/pages/CallbackPage.tsx` (신규)
`/callback` 경로 처리:
```
1. URL searchParams에서 error 파라미터 먼저 확인
   → error 있으면: sessionStorage.removeItem('pkce_verifier')
                   에러 메시지 표시 후 로그인 페이지로 이동 (중단)

2. code 추출, sessionStorage에서 code_verifier 꺼냄

3. try {
     POST /api/auth/token { code, codeVerifier }
     성공: authStore.setAuthenticated(true) → '/' 로 이동
     실패: 에러 표시 후 로그인 페이지로 이동
   } finally {
     sessionStorage.removeItem('pkce_verifier')  // 성공/실패 무관 반드시 삭제
   }
```

### 6. `src/hooks/useAuth.ts` (신규)
```ts
export function useAuth(): { isAuthenticated: boolean; login: () => void; logout: () => void }
// login: startLogin() 호출
// logout: startLogout() 호출
```

### 7. `src/lib/apiClient.ts` 수정
```ts
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,   // 모든 요청에 쿠키 자동 첨부
})

// 요청 인터셉터: Authorization 헤더 수동 설정 불필요 (쿠키로 대체)

// 401 응답 인터셉터:
// 1. config._retry 플래그 확인 — 이미 재시도한 요청이면 startLogin() (무한루프 방지)
// 2. POST /api/auth/refresh (withCredentials) → 새 쿠키 발급
// 3. 성공: config._retry = true 설정 후 원래 요청 1회 재시도
// 4. 실패: authStore.setAuthenticated(false) + startLogin()
```

### 8. `src/hooks/useAuthInit.ts` (신규)
앱 초기화 시 쿠키 유효성 확인 → isAuthenticated 복원:
```ts
export function useAuthInit(): { ready: boolean }
// 앱 마운트 시 GET /api/auth/me 호출 (withCredentials: true)
// 200: authStore.setAuthenticated(true), ready = true
// 401: authStore.setAuthenticated(false), ready = true
// ready가 false인 동안 라우터 렌더링 보류 (로딩 스피너 표시)
```

### 9. `src/router/index.tsx` (신규)
```
/ → isAuthenticated → HomePage 또는 LoginPage
/callback → CallbackPage
```

### 10. `src/App.tsx` 수정
```
useAuthInit()으로 초기화 상태 확인
ready = false → 로딩 스피너
ready = true → Router 렌더링
```

### 11. `src/main.tsx` 수정
`BrowserRouter` 추가.

---

## 파일 변경 요약

### Backend (신규)
| 파일 | 역할 |
|------|------|
| `infrastructure/config/KeycloakProperties.java` | Keycloak 설정 바인딩 (redirectUri 포함) |
| `infrastructure/config/RestTemplateConfig.java` | RestTemplate Bean |
| `infrastructure/security/CookieTokenFilter.java` | access_token 쿠키 → Authorization 헤더 변환 필터 |
| `domain/model/TokenResult.java` | 순수 도메인 토큰 DTO (인프라 의존 없음) |
| `application/port/in/ExchangeTokenUseCase.java` | 토큰 교환 입력 포트 (TokenResult 반환) |
| `application/service/AuthApplicationService.java` | 토큰 교환/갱신/로그아웃 로직 |
| `adapter/in/web/AuthController.java` | 쿠키 설정 담당, /api/auth/* 엔드포인트 |
| `adapter/in/web/dto/TokenRequest.java` | code + codeVerifier만 포함 |

### Backend (수정)
| 파일 | 변경 내용 |
|------|----------|
| `application.yml` | keycloak 프로퍼티, cookie.secure, ALLOWED_ORIGIN 추가 |
| `SsoApplication.java` | @EnableConfigurationProperties 추가 |
| `SecurityConfig.java` | CookieTokenFilter 등록, permitAll 최소화, CORS allowedOrigins 명시 |
| `ErrorCode.java` | AUTH_TOKEN_EXCHANGE_FAILED 추가 |

### Frontend (신규)
| 파일 | 역할 |
|------|------|
| `src/lib/pkce.ts` | code_verifier/challenge 생성 |
| `src/lib/auth.ts` | 로그인/로그아웃 시작 |
| `src/store/authStore.ts` | isAuthenticated 상태 관리 |
| `src/hooks/useAuth.ts` | 인증 상태 훅 |
| `src/hooks/useAuthInit.ts` | 앱 초기화 시 쿠키 유효성 확인 + 상태 복원 |
| `src/pages/CallbackPage.tsx` | OAuth2 콜백 처리 (error 분기 포함) |
| `src/router/index.tsx` | React Router 설정 |

### Frontend (수정)
| 파일 | 변경 내용 |
|------|----------|
| `src/lib/apiClient.ts` | withCredentials: true, 401 재시도 로직 (_retry 플래그) |
| `src/App.tsx` | useAuthInit + Router 기반으로 변경 |
| `src/main.tsx` | BrowserRouter 추가 |
| `.env` | VITE_REDIRECT_URI 추가 |

### Frontend (삭제)
- `src/lib/keycloak.ts`
- `src/hooks/useKeycloak.ts`
- `keycloak-js` 패키지

### Frontend (패키지 추가)
- `react-router-dom`

---

## API 스펙

### POST /api/auth/token — 인증 불필요
```
Request body: { "code": "...", "codeVerifier": "..." }
Response 200:
  Set-Cookie: access_token=...; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=300
  Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Strict; Path=/api/auth/refresh; Max-Age=2592000
  Body: { "success": true, "message": null, "data": null }
```

### POST /api/auth/refresh — 인증 불필요
```
Request: 쿠키의 refresh_token 자동 전송 (body 없음)
Response 200:
  Set-Cookie: access_token=...; (갱신)
  Set-Cookie: refresh_token=...; (갱신)
  Body: { "success": true, "message": null, "data": null }
```

### POST /api/auth/logout — 인증 필요
```
Request: 쿠키의 refresh_token 자동 전송
처리: 1) Keycloak 세션 종료 (백엔드에서 직접 호출)
      2) access_token, refresh_token 쿠키 maxAge=0 만료
Response 200:
  Set-Cookie: access_token=; Max-Age=0
  Set-Cookie: refresh_token=; Max-Age=0
  Body: { "success": true, "message": null, "data": null }
```

### GET /api/auth/me — 인증 필요
```
Request: 쿠키의 access_token 자동 전송
Response 200: { "success": true, "message": null, "data": null }
              (유효한 쿠키 존재 시)
Response 401: (쿠키 없거나 만료 시)
용도: 앱 새로고침 시 isAuthenticated 상태 복원
```

---

## 보안 고려사항

| 항목 | 내용 |
|------|------|
| accessToken 저장 | HttpOnly Cookie — JS 접근 불가, XSS 탈취 차단 |
| refreshToken 저장 | HttpOnly Cookie, Path=/api/auth/refresh — 최소 노출 범위 |
| refreshToken Path 주의 | Path prefix 매칭 동작 — `/api/auth/refresh` 하위에 다른 엔드포인트 추가 금지 |
| CSRF 방어 | SameSite=Strict — 외부 사이트 모든 크로스사이트 요청에서 쿠키 차단 |
| 로그아웃 보안 | /api/auth/logout 은 인증 필요 — 미인증 CSRF 로그아웃 공격 차단 |
| code_verifier 관리 | sessionStorage 저장, try/finally로 성공/실패 무관 반드시 삭제 |
| PKCE 필수 | code만으로는 토큰 교환 불가 |
| redirectUri | 백엔드 환경변수로만 관리 — 클라이언트 조작 불가 |
| redirect_uri 일치 | KEYCLOAK_REDIRECT_URI(백엔드) = VITE_REDIRECT_URI(프론트) CI/CD 검증 필요 |
| CORS | allowedOrigins 명시적 설정 필수 — 와일드카드(*) + allowCredentials 조합 사용 불가 |
| client_secret | Public Client — secret 없음 |
| Secure 플래그 | 개발: false / 운영: true (HTTPS 필수, cookie.secure 환경변수로 관리) |
| 401 재시도 | _retry 플래그로 무한루프 방지 — 재시도는 1회로 제한 |

---

## 반영된 리뷰 이슈

| 이슈 | 내용 | 반영 |
|------|------|------|
| R-1, R-2, B-1 | ExchangeTokenUseCase에 HttpServletResponse 포함 → 헥사고날 위반 | TokenResult 도메인 DTO 도입, 쿠키 설정을 컨트롤러로 이동 |
| F-1 | 새로고침 시 isAuthenticated 복원 누락 | GET /api/auth/me 추가, useAuthInit 훅 추가 |
| F-5 | CORS + withCredentials 설정 누락 | SecurityConfig CORS allowedOrigins 명시 항목 추가 |
| B-2 | SameSite=Lax + logout permitAll CSRF 취약 | SameSite=Strict 변경, logout 인증 필요로 변경 |
| B-4 | code_verifier 삭제 타이밍 | try/finally로 반드시 삭제 명시 |
| F-2 | /callback error 파라미터 처리 누락 | error 분기 처리 추가 |
| F-3 | 로그아웃 Keycloak 세션 종료 프론트 처리 | 백엔드 logout()이 Keycloak 세션 종료까지 일괄 처리 |
| F-4 | refresh 성공 후 원래 요청 재시도 누락 | _retry 플래그 + 1회 재시도 명세 추가 |
| B-3 | Path prefix 매칭 동작 인지 | 보안 고려사항에 하위 엔드포인트 추가 금지 정책 명시 |
| B-5 | redirect_uri 불일치 위험 | CI/CD 검증 필요 명시 |
