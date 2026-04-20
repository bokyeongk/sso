# 백엔드 기본 프로젝트 생성 플랜

**날짜**: 2026-04-20  
**대상 경로**: `00.sso/backend/`

## 기술 스택

| 항목 | 내용 |
|------|------|
| 언어/플랫폼 | Java 21, Spring Boot 3.4 |
| 빌드 | Gradle Kotlin DSL (build.gradle.kts) |
| 데이터베이스 | PostgreSQL + Spring Data JPA |
| 보안 | Spring Security + OAuth2 Resource Server (Keycloak JWT) |
| 인프라 | Docker, docker-compose, Nginx 대응 |

## 패키지 구조 (헥사고날 아키텍처)

```
backend/
├── src/main/java/com/hubilon/sso/
│   ├── SsoApplication.java
│   ├── domain/              # 순수 비즈니스 로직, 엔티티, 도메인 서비스
│   │   └── model/
│   ├── application/         # 유스케이스, 포트(Port) 인터페이스
│   │   ├── port/
│   │   │   ├── in/          # 입력 포트 (UseCase 인터페이스)
│   │   │   └── out/         # 출력 포트 (Repository 인터페이스)
│   │   └── service/         # 유스케이스 구현체
│   ├── adapter/             # 외부 어댑터
│   │   ├── in/web/          # REST Controller
│   │   └── out/persistence/ # JPA Repository 구현체
│   └── infrastructure/      # 공통 설정, 보안, 예외 처리
│       ├── config/          # Spring 설정 (Security, JPA 등)
│       ├── exception/       # 공통 예외 처리
│       └── response/        # 공통 응답 래퍼
├── src/main/resources/
│   ├── application.yml      # 공통 설정
│   ├── application-dev.yml  # 개발 환경
│   └── application-prod.yml # 운영 환경
├── build.gradle.kts
├── settings.gradle.kts
├── Dockerfile
└── docker-compose.yml
```

## 생성 파일 목록

### 빌드 설정
- `build.gradle.kts` — 전체 의존성 (Spring Boot, JPA, Security OAuth2, Lombok, Swagger 등)
- `settings.gradle.kts`

### 애플리케이션 설정
- `application.yml` — DB, JPA, Security(Keycloak JWT), Forwarded 헤더 설정
- `application-dev.yml` — 개발 환경 오버라이드
- `application-prod.yml` — 운영 환경 오버라이드

### 공통 인프라
- `infrastructure/config/SecurityConfig.java` — OAuth2 Resource Server + JWT 검증
- `infrastructure/config/JpaConfig.java` — Auditing 설정
- `infrastructure/exception/ErrorCode.java` — 에러 코드 열거형
- `infrastructure/exception/ServiceException.java` — 공통 예외
- `infrastructure/exception/GlobalExceptionHandler.java` — @ControllerAdvice
- `infrastructure/response/ApiResponse.java` — 공통 응답 래퍼
- `domain/model/BaseEntity.java` — JPA Audit 공통 엔티티

### Docker
- `Dockerfile` — 멀티스테이지 빌드 (builder + runtime)
- `docker-compose.yml` — app + PostgreSQL 서비스

### 엔트리포인트
- `SsoApplication.java`

## 주요 설정 포인트

### Keycloak JWT 설정 (application.yml)
```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: ${KEYCLOAK_ISSUER_URI}
```

### Nginx Forwarded 헤더 신뢰
```yaml
server:
  forward-headers-strategy: framework
```

### 환경변수 관리
- `KEYCLOAK_ISSUER_URI`, `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` 등 `.env`로 관리
