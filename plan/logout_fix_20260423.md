# 로그아웃 기능 수정 플랜

**작성일**: 2026-04-23  
**작업 범위**: Gateway, Frontend

---

## 목표

| 항목 | 현재 | 변경 후 |
|------|------|---------|
| 로그아웃 엔드포인트 경로 | `/logout` | `/api/logout` |
| 응답 | body 없음 (Mono\<Void\>) | `{"loginUrl": "..."}` JSON |
| 화이트리스트 | `/logout` | `/api/logout` |
| 프론트 요청 경로 | `/logout` | `/api/logout` |
| 로그아웃 후 동작 | authStore 초기화만 | loginUrl로 리다이렉트 |

---

## 1단계: Gateway 수정 (게이트웨이 에이전트)

### 1-1. `CookieHelper.java` — 신규 공통 쿠키 유틸

**파일**: `gateway/src/main/java/com/hubilon/gateway/util/CookieHelper.java`

- `@Component`로 등록, `@Value`로 `cookie.same-site`, `cookie.secure` 주입
- `buildCookie(name, value, maxAgeSeconds)` — httpOnly, secure, sameSite, path "/" 적용
- `deleteCookie(name)` — maxAge=0 쿠키 반환
- **기존 `AuthenticationFilter`와 `LogoutController`의 쿠키 헬퍼 메서드를 이 클래스로 통합**

### 1-2. `LoginUrlBuilder.java` — 신규 공통 loginUrl 빌더

**파일**: `gateway/src/main/java/com/hubilon/gateway/security/LoginUrlBuilder.java`

- `@Component`로 등록, `KeycloakProperties`, `GatewayProperties`, `StateService` 주입
- `build(clientId, returnUrl, exchange)` 메서드:
  1. `stateService.generate(clientId, returnUrl)` → state 생성
  2. `exchange.getResponse().addCookie(cookieHelper.buildCookie("oauth_state", state, 300))`
  3. `redirectUri = gatewayProperties.baseUrl() + "/callback/" + clientId`
  4. Keycloak auth URL 조합 후 반환
- **기존 `AuthenticationFilter.buildLoginUrl()`을 이 클래스 호출로 교체**

### 1-3. `AuthenticationFilter.java` — 리팩토링

**파일**: `gateway/src/main/java/com/hubilon/gateway/filter/AuthenticationFilter.java`

- 화이트리스트: `/logout` → `/api/logout`
- `CookieHelper` 의존성 주입 (기존 `buildCookie()` 인라인 메서드 제거)
- `LoginUrlBuilder` 의존성 주입, `buildLoginUrl()` 메서드를 `loginUrlBuilder.build(clientId, returnUrl, exchange)` 호출로 교체

### 1-4. `LogoutController.java` — 경로 및 응답 변경

**파일**: `gateway/src/main/java/com/hubilon/gateway/controller/LogoutController.java`

**변경 사항**:

1. **경로 변경**: `@RequestMapping("/logout")` → `@RequestMapping("/api/logout")`

2. **의존성 추가**: `CookieHelper`, `LoginUrlBuilder` 주입 (기존 `KeycloakProperties`, `WebClient` 유지)

3. **반환 타입 변경**: `Mono<Void>` → `Mono<ResponseEntity<Map<String, String>>>`

4. **로직 흐름**:
   ```
   1. refresh_token 쿠키 추출
   2. access_token, refresh_token 쿠키 삭제 (cookieHelper.deleteCookie)
   3. Keycloak logout endpoint POST (refreshToken이 있는 경우)
      - 성공: loginUrl = loginUrlBuilder.build(clientId, "/", exchange)
      - 실패(onErrorResume): loginUrl = loginUrlBuilder.build(clientId, "/", exchange) + "&prompt=login"
                             (Keycloak 세션 미종료 → SSO 자동 로그인 방지)
   4. refreshToken 없는 경우: loginUrl = loginUrlBuilder.build(clientId, "/", exchange) 직접 생성
   5. ResponseEntity.ok({"loginUrl": loginUrl}) 반환
   ```

---

## 2단계: Frontend 수정 (프론트 에이전트)

### 2-1. `apiClient.ts` — `isSafeRedirectUrl` export

**파일**: `frontend/src/lib/apiClient.ts`

- 기존 `isSafeRedirectUrl(url: string)` 함수를 `export` 처리
  - 현재 파일 내부에서만 사용되나, `useAuth.ts`에서도 재사용하기 위해 export

### 2-2. `useAuth.ts` — 로그아웃 경로 및 리다이렉트 처리

**파일**: `frontend/src/hooks/useAuth.ts`

```typescript
// 변경 후
const logout = async () => {
  try {
    const res = await apiClient.post<{ loginUrl: string }>('/api/logout')
    authStore.setAuthenticated(false)
    const loginUrl = res.data?.loginUrl
    if (loginUrl && isSafeRedirectUrl(loginUrl)) {
      window.location.href = loginUrl
    } else {
      // fallback: loginUrl이 없거나 안전하지 않은 경우 홈으로 이동
      window.location.href = '/'
    }
  } catch {
    authStore.setAuthenticated(false)
    window.location.href = '/'
  }
}
```

**변경 포인트**:
- `/logout` → `/api/logout`
- `isSafeRedirectUrl()` 검증 후 리다이렉트 (open redirect 방어)
- `loginUrl` 부재 시 fallback: `window.location.href = '/'`
- catch 블록에도 fallback 추가

---

## 실행 순서

```
3단계: 게이트웨이 에이전트 → CookieHelper, LoginUrlBuilder 신규 생성
                           → AuthenticationFilter 리팩토링
                           → LogoutController 수정
4단계: 프론트 에이전트     → apiClient.ts export 수정
                           → useAuth.ts 수정
```

(DB, 백엔드 변경 없음 → 1, 2단계 건너뜀)

---

## Review 결과
- 검토일: 2026-04-23
- 검토 항목: 보안 / 리팩토링 / 기능
- 결과: 이슈 5건 반영하여 플랜 수정 완료
  - [기능] Keycloak logout 실패 시 `prompt=login` 추가
  - [기능] loginUrl fallback 처리 (`window.location.href = '/'`)
  - [리팩토링] `LoginUrlBuilder` 공통 컴포넌트 추출
  - [리팩토링] `CookieHelper` 공통 유틸 추출
  - [보안] `isSafeRedirectUrl()` 검증 후 리다이렉트
