# API Gateway

Spring Cloud Gateway 기반 MSA 라우팅 서버.

## 환경변수 설정

서버 실행 전 아래 환경변수를 설정해야 합니다. 미설정 시 괄호 안의 기본값이 사용됩니다.

| 환경변수 | 기본값 | 설명 |
|----------|--------|------|
| `SERVER_PORT` | `8000` | 게이트웨이 서버 포트 |
| `SSO_SERVICE_URI` | `http://localhost:8080` | SSO 백엔드 서비스 URI |
| `SJEASY_SERVICE_URI` | `http://localhost:8081` | SJEasy 서비스 URI |
| `SSO_INTROSPECT_URL` | `http://localhost:8080/api/auth/me` | 토큰 검증 엔드포인트 (인증 필터에서 사용) |
| `SSO_LOGIN_PAGE_URL` | `http://localhost:5173/login` | 인증 실패 시 리다이렉트할 로그인 페이지 URL |
| `ALLOWED_ORIGIN` | `http://localhost:5173` | CORS 허용 Origin (프론트엔드 주소) |

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
