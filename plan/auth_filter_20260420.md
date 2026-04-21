# AuthenticationFilter 구현 플랜

## 목표
Spring Cloud Gateway에서 쿠키 기반 JWT 인증 필터를 구현하여, 모든 내부 서비스 요청에 사용자 정보 헤더를 주입한다.

## 작업 범위

### 1단계: 백엔드 개발자 — `/api/auth/me` 응답 보강
현재 `name`, `email`만 반환 → `id`(sub), `role` 추가

**수정 파일**
- `backend/src/main/java/com/hubilon/sso/adapter/in/web/AuthController.java`
  - `me()` 메서드: `jwt.getSubject()`로 id, `jwt.getClaimAsStringList("realm_access")`로 role 추출 후 Map에 추가
  - 반환 예시: `{ "id": "uuid", "role": "USER", "name": "홍길동", "email": "..." }`

### 2단계: 게이트웨이 개발자 — AuthenticationFilter 구현

#### 생성 파일
- `gateway/src/main/java/com/hubilon/gateway/config/SsoProperties.java`
  - `@ConfigurationProperties(prefix = "sso")`
  - 필드: `introspectUrl`, `loginPageUrl`

#### 수정 파일

**`gateway/src/main/resources/application.yml`**
```yaml
sso:
  introspect-url: http://localhost:8080/api/auth/me
  login-page-url: http://localhost:5173
```

**`gateway/src/main/java/com/hubilon/gateway/filter/AuthenticationFilter.java`**
- `GlobalFilter`, `Ordered` 구현
- `Ordered.HIGHEST_PRECEDENCE` 설정
- `WebClient`로 비동기 인증 처리

#### 필터 처리 흐름

```
요청 수신
  │
  ▼
[1] X-User-* 헤더 Sanitize (외부 조작 차단)
  │
  ▼
[2] 쿠키에서 access_token 추출
  │
  ├── 없음 → 401 + X-Redirect-To: {loginPageUrl} 반환
  │
  ▼
[3] WebClient GET {introspectUrl}
    Authorization: Bearer <access_token>
  │
  ├── 실패(non-2xx, 네트워크 오류) → 401 + X-Redirect-To: {loginPageUrl} 반환
  │
  ▼
[4] 응답 body에서 id, role, email 추출
  │
  ▼
[5] 내부 요청 헤더 주입
    X-User-Id: {id}
    X-User-Role: {role}
    X-User-Email: {email}
  │
  ▼
다음 필터로 전달 (chain.filter)
```

#### 공개 경로 화이트리스트 (인증 생략)
- `/api/auth/token`
- `/api/auth/refresh`
- `/api/auth/logout`

이유: SSO 인증 엔드포인트를 필터가 가로채면 무한 루프 발생

#### WebClient 설정
- `WebClient.Builder` Bean 주입 (Spring Boot 자동 구성 활용)
- 타임아웃: 3초 (responseTimeout)
- 에러 처리: `onErrorResume` → Mono.empty() 후 401 반환

#### 의존성 추가 불필요
- `spring-boot-starter-webflux` 이미 포함 (WebClient 사용 가능)
- `jackson-databind` webflux에 포함 (JSON 역직렬화 가능)

### 3단계: 게이트웨이 개발자 — CorsConfig 수정

**수정 파일**: `gateway/src/main/java/com/hubilon/gateway/config/CorsConfig.java`

#### 수정 1 — `allowedOrigin` `@Value` 주입으로 교체
```java
@Value("${allowed.origin:http://localhost:5173}")
private String allowedOrigin;

// 변경 전
corsConfiguration.addAllowedOriginPattern("*");

// 변경 후
corsConfiguration.addAllowedOrigin(allowedOrigin);
```
- 이유: 와일드카드 + `allowCredentials: true` 조합은 모든 Origin을 반사(echo)하여 CSRF 위험 발생. 백엔드 `SecurityConfig`와 동일한 방식으로 통일

#### 수정 2 — `exposedHeaders` 추가
```java
corsConfiguration.addExposedHeader("X-Redirect-To");
```
- 이유: 브라우저 JS는 `Access-Control-Expose-Headers`에 명시된 헤더만 읽을 수 있음. 미설정 시 프론트엔드가 `X-Redirect-To` 값을 읽지 못함

**`gateway/src/main/resources/application.yml`** — 설정 추가
```yaml
allowed:
  origin: http://localhost:5173
```

### 4단계: 프론트 개발자 — 401 시 `X-Redirect-To` 헤더 기반 리다이렉트 처리

**수정 파일 1**: `frontend/src/lib/apiClient.ts`

현재 코드 (수정 전):
```typescript
} catch {
  authStore.setAuthenticated(false)
  startLogin()
}
```

수정 후:
```typescript
} catch (refreshError) {
  authStore.setAuthenticated(false)
  const redirectTo = error.response?.headers?.['x-redirect-to']
  if (redirectTo) {
    window.location.href = redirectTo
  } else {
    startLogin()
  }
  return Promise.reject(error)
}
```

**수정 파일 2**: `frontend/src/hooks/useAuthInit.ts`

현재 코드 (수정 전):
```typescript
.catch(() => {
  authStore.setAuthenticated(false)
})
```

수정 후:
```typescript
.catch((error) => {
  authStore.setAuthenticated(false)
  const redirectTo = error.response?.headers?.['x-redirect-to']
  if (redirectTo) {
    window.location.href = redirectTo
  }
})
```

### 5단계: 게이트웨이 — 화이트리스트 경로 보강

현재 플랜의 화이트리스트에 백엔드 `SecurityConfig` 공개 경로와 불일치하는 항목 추가:
```
기존: /api/auth/token, /api/auth/refresh, /api/auth/logout
추가: /actuator/health, /api-docs/**, /swagger-ui/**, /swagger-ui.html
```

`AuthenticationFilter.java` 구현 시 위 경로 목록을 화이트리스트에 반영할 것

## 실행 순서
```
1단계: 백엔드 에이전트     → AuthController.me() 수정 완료 확인 후
2단계: 게이트웨이 에이전트  → SsoProperties + AuthenticationFilter + application.yml + CorsConfig 수정 완료 확인 후
3단계: 프론트 에이전트     → apiClient.ts + useAuthInit.ts 수정
```

## 구현 시 주의사항
- WebFlux 리액티브 모델 준수 (블로킹 I/O 사용 금지)
- `ServerWebExchange.mutate().request(r -> r.headers(...))` 방식으로 헤더 주입
- Keycloak role 클레임 경로: `realm_access.roles` (List<String>) → 첫 번째 값 사용 또는 콤마 연결
- 응답 body 역직렬화: `ApiResponse<Map<String,String>>` 구조 대응 필요 (`data` 필드 하위에 실제 값 존재)
- `useAuthInit.ts`의 `/api/auth/me` 호출은 `apiClient`를 경유하므로 인터셉터가 먼저 처리. 단, 앱 초기화 시점 첫 요청은 refresh 없이 바로 catch로 떨어질 수 있으므로 `useAuthInit.ts`에서도 직접 처리 필요
