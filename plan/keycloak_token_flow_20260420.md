# Keycloak Token Flow 구현 플랜

## 목표
프론트에서 Keycloak 인증 후 획득한 Access Token을 백엔드로 전달하고,
백엔드가 해당 JWT를 검증하여 사용자 정보를 반환하는 흐름 구현.

## 흐름

```
Frontend → Keycloak 인증 → keycloak.token 획득
Frontend → GET /api/auth/me (Authorization: Bearer {token})
Backend → JWT 검증 (OAuth2 Resource Server) → JWT claims 추출
Backend → UserInfoResponse 반환 (roles 포함)
Frontend → 사용자 정보 화면에 표시
```

> **백엔드 API를 호출하는 이유**: `keycloak.tokenParsed`로 클라이언트 측에서도 추출 가능하지만,
> 백엔드 API 호출을 통해 서버에서 토큰 유효성을 재검증하고 서버 측 프로파일 데이터(DB 연동 등)를
> 함께 반환할 수 있는 확장 지점을 확보한다.

---

## Backend 작업

### 1. Domain 모델 (domain/model/)
- `UserInfo.java` — 사용자 정보 도메인 모델 (sub, username, email, name, roles)

### 2. 출력 포트 (application/port/out/)
- `LoadUserInfoPort.java` — JWT claims에서 사용자 정보를 로드하는 출력 포트 인터페이스
  ```java
  UserInfo loadUserInfo(JwtAuthenticationToken token);
  ```

### 3. 출력 포트 구현체 (adapter/out/auth/)
- `KeycloakUserInfoAdapter.java` — `LoadUserInfoPort` 구현체
  - `realm_access.roles` (List<String>) claims 추출
  - `preferred_username`, `email`, `name`, `sub` claims 추출

### 4. 입력 포트 (application/port/in/)
- `GetUserInfoUseCase.java`
  ```java
  UserInfoResponse getUserInfo(JwtAuthenticationToken token);
  ```

### 5. 서비스 (application/service/)
- `AuthService.java` — `GetUserInfoUseCase` 구현, `LoadUserInfoPort` 사용
  - 입력 포트를 구현하고, 출력 포트(LoadUserInfoPort)를 통해 사용자 정보 로드

### 6. DTO (adapter/in/web/dto/)
- `UserInfoResponse.java`
  - 필드: `String sub`, `String username`, `String email`, `String name`, `List<String> roles`

### 7. 컨트롤러 (adapter/in/web/)
- `AuthController.java`
  - `GET /api/auth/me`
  - 응답: `ApiResponse<UserInfoResponse>`
  - `JwtAuthenticationToken`은 Spring Security가 자동 주입

### 8. JWT 권한 매핑 (infrastructure/config/)
- `SecurityConfig.java` 수정
  - `JwtAuthenticationConverter` 빈 추가
  - `realm_access.roles` → `GrantedAuthority` 매핑
  - roles 기반 인가 제어 지원

### 9. 인증 예외 응답 통일 (infrastructure/exception/)
- `GlobalExceptionHandler.java` 수정
  - `AuthenticationException` 핸들러 추가 → `ApiResponse.error()` 형식 반환 (401)
  - `AccessDeniedException` 핸들러 추가 → `ApiResponse.error()` 형식 반환 (403)

---

## Frontend 작업

### 1. 환경 변수 분리
- `.env.development`: `VITE_API_BASE_URL=http://localhost:8080`
- `.env.production`: `VITE_API_BASE_URL=https://<실제 도메인>` (배포 시 설정)

### 2. 토큰 갱신 유틸 (lib/keycloak.ts 수정)
- 기존 파일에 `ensureFreshToken()` 함수 추가
  - `keycloak.updateToken(30)` 호출
  - 갱신 실패 시 `keycloak.logout()` 호출 (refresh token 만료 대응)
- **아키텍처 규칙 준수**: 토큰 갱신 로직은 `lib/keycloak.ts`에만 위치

### 3. axios 인스턴스 (src/lib/apiClient.ts)
- `baseURL`: `VITE_API_BASE_URL`
- 요청 인터셉터: `ensureFreshToken()` 호출 후 `Authorization: Bearer {token}` 첨부
- 응답 인터셉터: 401 수신 시 로그인 리다이렉트

### 4. TypeScript 타입 정의 (src/types/auth.ts)
- `UserInfo` interface
  ```ts
  interface UserInfo {
    sub: string;
    username: string;
    email: string;
    name: string;
    roles: string[];  // realm_access.roles, 백엔드 List<String>과 일치
  }
  ```

### 5. API 서비스 레이어 (src/services/authService.ts)
- `getMyInfo(): Promise<UserInfo>` → `GET /api/auth/me` 호출

### 6. React Query 훅 (src/hooks/useUserInfo.ts)
- `authenticated === true` 일 때만 쿼리 활성화
- `staleTime: 5 * 60 * 1000` (5분) — 토큰 갱신 주기에 맞춰 캐싱
- 에러 발생 시 로그인 리다이렉트

### 7. App.tsx 업데이트
- 인증 후 `useUserInfo` 훅으로 사용자 정보 표시
- 사용자 이름, 이메일 화면에 렌더링

---

## 보안 고려사항

- **CORS**: 현재 와일드카드(`*`) + `allowCredentials: true` 조합은 운영 환경에서 반드시 실제 도메인으로 제한 필요. 본 작업 범위 외이나 배포 전 `SecurityConfig` CORS 설정 변경 필요.
- **환경 변수**: `.env.development`와 `.env.production`을 반드시 분리하여 localhost 주소가 프로덕션 번들에 포함되지 않도록 한다.
- **roles 인가**: `JwtAuthenticationConverter`로 `realm_access.roles`를 `GrantedAuthority`로 매핑하여 Spring Security 인가 체계에 통합.

---

## Review 결과
- 검토일: 2026-04-20
- 검토 항목: 보안 / 리팩토링 / 기능
- 반영 이슈: S-1(CORS 명시), S-2(env 파일 분리), S-3(JwtAuthenticationConverter), R-1(API 호출 이유 명시), R-2(토큰 갱신 위치), R-3(port/out 추가), F-1(갱신 실패 처리), F-2(에러 응답 통일), F-3(staleTime), F-4(roles 타입 명시)
