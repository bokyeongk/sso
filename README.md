# SSO Index Web Service

MSA 기반 개별 프로젝트들을 한곳에서 연동하고 통합 로그인(SSO)을 제공하는 인덱스 웹 서비스.

## 환경변수

| 변수명 | 설명 | 필수 여부 |
|--------|------|-----------|
| DB_USERNAME | PostgreSQL 접속 사용자명 | 필수 |
| DB_PASSWORD | PostgreSQL 접속 비밀번호 | 필수 |
| KEYCLOAK_ISSUER_URI | Keycloak JWT issuer URI | 필수 |
| KEYCLOAK_CLIENT_SECRET | Keycloak client secret 값 | 필수 |
| ALLOWED_ORIGIN | CORS 허용 origin (기본값: http://localhost:5173) | 선택 |

## 디렉터리 구조

```
00.sso/
├── backend/    # Spring Boot API 서버
├── frontend/   # 웹 클라이언트
└── gateway/    # Spring Cloud Gateway 서버
```

## 실행 방법

```bash
# 백엔드
cd backend
./gradlew bootRun

# 프론트엔드
cd frontend
npm install
npm run dev
```
