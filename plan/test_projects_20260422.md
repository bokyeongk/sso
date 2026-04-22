# 게이트웨이 테스트용 경량 프로젝트 생성 플랜

**날짜**: 2026-04-22  
**목적**: Spring Cloud Gateway 테스트를 위한 경량 백엔드/프론트 프로젝트 생성

---

## 대상 폴더

```
sso/
├── test-backend/   # Spring Boot 경량 앱
└── test-frontend/  # Orange 테마 HELLO 화면
```

---

## 1단계: test-backend (백엔드 에이전트)

### 기술 스택
- Spring Boot 3.x / Java 17
- 포트: **8082** (gateway 라우팅 타겟)
- 빌드: Gradle

### 구성
- `GET /` → `{ "message": "Hello from test-backend" }` 반환
- `GET /health` → `{ "status": "UP" }` 반환
- Security 설정 없음 (모든 요청 허용)
- `application.yml` 최소 설정

### 파일 목록
```
test-backend/
├── build.gradle
├── settings.gradle
└── src/main/
    ├── java/com/hubilon/testbackend/
    │   ├── TestBackendApplication.java
    │   └── controller/HelloController.java
    └── resources/
        └── application.yml
```

---

## 2단계: test-frontend (프론트 에이전트)

### 기술 스택
- 순수 HTML/CSS/JS (빌드 도구 없음 — 게이트웨이 정적 파일 서빙 테스트용)
- Orange 테마 (`#FF6B00` 계열)

### 화면 구성
- 전체 화면 중앙에 **"HELLO"** 텍스트
- Orange 배경 또는 Orange 포인트 컬러 적용
- `index.html` 단일 파일

### 파일 목록
```
test-frontend/
└── index.html
```

---

## 실행 방법 (완료 후 문서화)

```bash
# test-backend 실행
cd test-backend
./gradlew bootRun   # http://localhost:8082

# test-frontend
# index.html을 브라우저로 직접 열거나 게이트웨이를 통해 서빙
```

---

## 에이전트 실행 순서

1. **백엔드 에이전트** → test-backend 프로젝트 생성
2. **프론트 에이전트** → test-frontend index.html 생성
