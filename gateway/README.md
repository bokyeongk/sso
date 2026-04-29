# API Gateway

Spring Cloud Gateway 기반 MSA 라우팅 서버.

## 환경변수 설정

서버 실행 전 아래 환경변수를 설정해야 합니다. 미설정 시 괄호 안의 기본값이 사용됩니다.

### 운영 환경에서 반드시 변경해야 하는 값

| 환경변수 | 기본값 | 설명 |
|----------|--------|------|
| `KEYCLOAK_SSO_SECRET` | `change-me` | sso-index-web 클라이언트 시크릿 |
| `KEYCLOAK_GIT_SECRET` | `change-me` | git-digest-web 클라이언트 시크릿 |
| `KEYCLOAK_TEST_SECRET` | `change-me` | test-web 클라이언트 시크릿 |
| `STATE_HMAC_SECRET` | `dev-secret-must-be-changed-in-prod-32bytes` | OAuth2 state 파라미터 HMAC 서명 키 (32바이트 이상) |

### 서버 설정

| 환경변수 | 기본값 | 설명 |
|----------|--------|------|
| `SERVER_PORT` | `8000` | 게이트웨이 서버 포트 |
| `GATEWAY_BASE_URL` | `http://localhost:8000` | 게이트웨이 자체 베이스 URL (콜백 URI 생성 등에 사용) |
| `ALLOWED_ORIGIN` | `http://localhost:5173` | CORS 허용 Origin |

### 백엔드 서비스 URI

| 환경변수 | 기본값 | 설명 |
|----------|--------|------|
| `SSO_SERVICE_URI` | `http://localhost:8080` | SSO 백엔드 서비스 URI |
| `SJEASY_SERVICE_URI` | `http://localhost:8081` | SJEasy 서비스 URI |
| `TEST_SERVICE_URI` | `http://localhost:8082` | Test 서비스 URI |

### Keycloak 설정

| 환경변수 | 기본값 | 설명 |
|----------|--------|------|
| `KEYCLOAK_URL` | `http://localhost:8000` | Keycloak 서버 베이스 URL |
| `KEYCLOAK_REALM` | `hubilon_pd` | Keycloak Realm 이름 |

### 프론트엔드 URL (서비스별 로그인 후 리다이렉트 대상)

| 환경변수 | 기본값 | 설명 |
|----------|--------|------|
| `SSO_FRONTEND_URL` | `http://localhost:5173` | SSO 인덱스 웹 URL |
| `GIT_FRONTEND_URL` | `http://localhost:5174` | Git Digest 웹 URL |
| `TEST_FRONTEND_URL` | `http://localhost:3000` | Test 웹 URL |

### 프로파일별 쿠키 설정

프로파일로 제어하며 별도 환경변수가 필요하지 않습니다.

| 프로파일 | `cookie.same-site` | `cookie.secure` | 설명 |
|----------|--------------------|-----------------|------|
| `local` (기본) | `Lax` | `false` | 로컬 개발 환경 |
| `prod` | `None` | `true` | 운영 환경 (HTTPS 필수) |

```bash
# 운영 환경 프로파일 활성화
export SPRING_PROFILES_ACTIVE=prod
```

## 빠른 시작

```bash
# .env.example을 복사하여 실제 환경변수 파일 생성
cp .env.example .env

# 값 수정 후 환경변수 로드하여 실행
export $(cat .env | xargs)
./gradlew bootRun
```

## 참고

- 환경변수 예시 파일: `.env.example`
- 라우팅 설정: `src/main/resources/application.yml`
