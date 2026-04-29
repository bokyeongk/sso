# SSO 시퀀스 다이어그램

## 1. 로그인 흐름

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend<br/>(React :5173)
    participant GW as Gateway<br/>(:8000)
    participant KC as Keycloak<br/>(:8000)
    participant BE as Backend<br/>(:8080)

    User->>FE: 서비스 페이지 접근
    FE->>GW: GET /api/services<br/>(withCredentials, 쿠키 없음)
    GW->>GW: AuthenticationFilter<br/>access_token 쿠키 없음

    GW->>GW: LoginUrlBuilder<br/>state 토큰 생성 (HMAC-SHA256)<br/>oauth_state 쿠키 설정
    GW-->>FE: 401 Unauthorized<br/>X-Redirect-To: keycloak 로그인 URL

    FE->>FE: apiClient 인터셉터<br/>X-Redirect-To 헤더 감지
    FE->>KC: 브라우저 리다이렉트<br/>GET /realms/hubilon_pd/protocol/openid-connect/auth<br/>?client_id=sso-index-web&response_type=code&state=...

    KC-->>User: 로그인 폼 표시
    User->>KC: 아이디/비밀번호 입력
    KC->>KC: 인증 처리

    KC-->>GW: 리다이렉트<br/>GET /callback/sso-index-web?code=AUTH_CODE&state=STATE

    GW->>GW: CallbackController<br/>1. clientId 검증<br/>2. state 쿠키 vs 쿼리 파라미터 CSRF 검증<br/>3. StateService HMAC 서명 + TTL 검증<br/>4. oauth_state 쿠키 삭제

    GW->>KC: POST /realms/hubilon_pd/protocol/openid-connect/token<br/>grant_type=authorization_code<br/>code=AUTH_CODE, client_id, client_secret, redirect_uri
    KC-->>GW: access_token + refresh_token

    GW->>GW: access_token 쿠키 설정 (HttpOnly, SameSite=Lax)<br/>refresh_token 쿠키 설정 (HttpOnly, SameSite=Lax)
    GW-->>FE: 302 Redirect → http://localhost:5173

    FE->>GW: GET /api/services<br/>(access_token 쿠키 포함)
    GW->>GW: AuthenticationFilter<br/>JWT 서명 검증 (Keycloak JWK)<br/>X-User-Id / X-User-Role / X-User-Email 헤더 주입
    GW->>BE: GET /api/sso/services<br/>X-User-Id: {userId}
    BE->>BE: InternalRequestFilter<br/>X-User-Id 헤더 검증
    BE-->>GW: 서비스 목록 응답
    GW-->>FE: 서비스 목록 응답
    FE-->>User: 서비스 목록 화면 표시
```

---

## 2. 서비스 API 호출 흐름 (인증 완료 상태)

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend<br/>(React :5173)
    participant GW as Gateway<br/>(:8000)
    participant BE as Backend<br/>(:8080)
    participant KC as Keycloak<br/>(:8000)

    User->>FE: 서비스 목록 조회
    FE->>GW: GET /api/services<br/>(access_token 쿠키 포함)

    GW->>GW: AuthenticationFilter<br/>JWT 검증

    alt access_token 유효
        GW->>GW: JWT 파싱<br/>X-User-Id / X-User-Role / X-User-Email 주입
        GW->>BE: GET /api/sso/services<br/>X-User-Id: {userId}
        BE->>BE: InternalRequestFilter<br/>X-User-Id 헤더 존재 확인
        BE-->>GW: ApiResponse<List<Service>>
        GW-->>FE: 서비스 목록
        FE-->>User: 화면 렌더링

    else access_token 만료 임박 (30초 버퍼)
        GW->>KC: POST /realms/hubilon_pd/protocol/openid-connect/token<br/>grant_type=refresh_token<br/>refresh_token=REFRESH_TOKEN
        KC-->>GW: 새 access_token + refresh_token
        GW->>GW: 새 토큰 쿠키 재설정
        GW->>GW: JWT 파싱 → X-User-* 헤더 주입
        GW->>BE: GET /api/sso/services<br/>X-User-Id: {userId}
        BE-->>GW: ApiResponse<List<Service>>
        GW-->>FE: 서비스 목록 + 갱신된 쿠키 (Set-Cookie)
        FE-->>User: 화면 렌더링 (토큰 갱신 투명하게 처리)

    else access_token 만료 (refresh_token도 없음)
        GW->>GW: LoginUrlBuilder → 로그인 URL 생성
        GW-->>FE: 401 Unauthorized<br/>X-Redirect-To: 로그인 URL
        FE->>FE: apiClient 인터셉터 → window.location.href = loginUrl
        FE-->>User: Keycloak 로그인 페이지로 이동
    end
```

---

## 3. 로그아웃 흐름

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend<br/>(React :5173)
    participant GW as Gateway<br/>(:8000)
    participant KC as Keycloak<br/>(:8000)

    User->>FE: 로그아웃 버튼 클릭
    FE->>FE: useAuth.logout() 호출

    FE->>GW: POST /api/logout<br/>(refresh_token 쿠키 포함)

    GW->>GW: LogoutController<br/>1. access_token 쿠키 삭제 (maxAge=0)<br/>2. refresh_token 쿠키 삭제 (maxAge=0)

    alt refresh_token 쿠키 존재
        GW->>KC: POST /realms/hubilon_pd/protocol/openid-connect/logout<br/>client_id, client_secret, refresh_token
        KC-->>GW: 204 No Content (세션 종료)
        GW->>GW: loginUrl 생성
    else refresh_token 없음
        GW->>GW: loginUrl 생성 (&prompt=login 추가)
    end

    GW-->>FE: 200 OK<br/>{ "loginUrl": "https://keycloak/.../auth?..." }<br/>Set-Cookie: access_token=; maxAge=0<br/>Set-Cookie: refresh_token=; maxAge=0

    FE->>FE: authStore.setAuthenticated(false)
    FE->>FE: isSafeRedirectUrl(loginUrl) 검증
    FE->>KC: 브라우저 리다이렉트 → loginUrl
    KC-->>User: Keycloak 로그인 페이지 표시
```

---

## 4. 포트 및 URL 매핑 요약

| 구간 | 요청 | 변환 |
|------|------|------|
| FE → Vite Proxy | `GET /api/services` | → `GET http://localhost:8000/api/sso/services` |
| FE → Vite Proxy | `POST /api/logout` | → `POST http://localhost:8000/api/logout` |
| GW → BE | `GET /api/sso/services` | → `GET http://localhost:8080/api/services` (RewritePath) |
| GW → KC (로그인) | Authorization Endpoint | `GET http://localhost:8000/realms/hubilon_pd/protocol/openid-connect/auth` |
| GW → KC (토큰) | Token Endpoint | `POST http://localhost:8000/realms/hubilon_pd/protocol/openid-connect/token` |
| GW → KC (로그아웃) | Logout Endpoint | `POST http://localhost:8000/realms/hubilon_pd/protocol/openid-connect/logout` |

## 5. 쿠키/헤더 흐름 요약

```
[FE → GW]
  Cookie: access_token=JWT, refresh_token=REFRESH_JWT

[GW → BE]
  Header: X-User-Id: {sub}
  Header: X-User-Role: {realm_access.roles[0]}
  Header: X-User-Email: {email}

[GW → FE (로그인 성공)]
  Set-Cookie: access_token=JWT; HttpOnly; SameSite=Lax; Path=/
  Set-Cookie: refresh_token=REFRESH_JWT; HttpOnly; SameSite=Lax; Path=/

[GW → FE (비인증)]
  Status: 401
  Header: X-Redirect-To: https://keycloak/auth?...
```
