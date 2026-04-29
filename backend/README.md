# SSO Backend

## 환경변수

애플리케이션 실행 전 아래 환경변수를 설정해야 합니다.

### 필수 환경변수

| 환경변수 | 설명 | 예시 |
|----------|------|------|
| `DB_USERNAME` | PostgreSQL 접속 계정 | `postgres` |
| `DB_PASSWORD` | PostgreSQL 접속 비밀번호 | `secret` |

### 선택 환경변수

| 환경변수 | 설명 | 기본값 |
|----------|------|--------|
| `ALLOWED_ORIGIN` | CORS 허용 Origin | `http://localhost:5173` |


### 프로파일

| 프로파일 | 설명 |
|----------|------|
| `dev` | 개발 환경 (SQL 로깅 활성화, DDL auto=update) |
| `prod` | 운영 환경 (SQL 로깅 비활성화, DDL auto=validate) |

기본 활성 프로파일은 `dev`입니다. 변경 시:
```bash
export SPRING_PROFILES_ACTIVE=prod
```

### 로컬 실행 예시

```bash
export DB_USERNAME=postgres
export DB_PASSWORD=secret

./gradlew bootRun
```

### Docker 실행 예시

```bash
docker run -e DB_USERNAME=postgres \
           -e DB_PASSWORD=secret \
           -e ALLOWED_ORIGIN=http://yourdomain.com \
           sso-backend:latest
```
