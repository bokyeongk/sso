# SSO Backend

## 환경변수

애플리케이션 실행 전 아래 환경변수를 설정해야 합니다.

### 필수 환경변수

| 환경변수 | 설명 | 예시 |
|----------|------|------|
| `DB_USERNAME` | PostgreSQL 접속 계정 | `postgres` |
| `DB_PASSWORD` | PostgreSQL 접속 비밀번호 | `secret` |
| `KEYCLOAK_ISSUER_URI` | Keycloak JWT 발급자 URI (Spring Security 토큰 검증용) | `http://keycloak:8080/realms/myrealm` |
| `KEYCLOAK_URL` | Keycloak 서버 베이스 URL | `http://keycloak:8080` |
| `KEYCLOAK_REALM` | Keycloak Realm 이름 | `myrealm` |
| `KEYCLOAK_CLIENT_ID` | Keycloak Client ID | `sso-backend` |
| `KEYCLOAK_REDIRECT_URI` | 인증 후 리다이렉트 URI | `http://localhost:5173/callback` |

### 선택 환경변수

| 환경변수 | 설명 | 기본값 |
|----------|------|--------|
| `COOKIE_SECURE` | HTTPS 전용 쿠키 여부 (운영 환경에서는 `true` 권장) | `false` |
| `ALLOWED_ORIGIN` | CORS 허용 Origin | `http://localhost:5173` |

### 프로파일

| 프로파일 | 설명 |
|----------|------|
| `dev` | 개발 환경 (SQL 로깅 활성화, DDL auto=update) |
| `prod` | 운영 환경 (SQL 로깅 비활성화, DDL auto=validate) |
| `test` | 테스트 환경 |

기본 활성 프로파일은 `dev`입니다. 변경 시:
```bash
export SPRING_PROFILES_ACTIVE=prod
```

### 로컬 실행 예시

```bash
export DB_USERNAME=postgres
export DB_PASSWORD=secret
export KEYCLOAK_ISSUER_URI=http://localhost:8080/realms/myrealm
export KEYCLOAK_URL=http://localhost:8080
export KEYCLOAK_REALM=myrealm
export KEYCLOAK_CLIENT_ID=sso-backend
export KEYCLOAK_REDIRECT_URI=http://localhost:5173/callback

./gradlew bootRun
```

### Docker 실행 예시

```bash
docker run -e DB_USERNAME=postgres \
           -e DB_PASSWORD=secret \
           -e KEYCLOAK_ISSUER_URI=http://keycloak:8080/realms/myrealm \
           -e KEYCLOAK_URL=http://keycloak:8080 \
           -e KEYCLOAK_REALM=myrealm \
           -e KEYCLOAK_CLIENT_ID=sso-backend \
           -e KEYCLOAK_REDIRECT_URI=http://yourdomain.com/callback \
           -e COOKIE_SECURE=true \
           -e ALLOWED_ORIGIN=http://yourdomain.com \
           sso-backend:latest
```
