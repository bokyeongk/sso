# Gateway 프로젝트 뼈대 생성 플랜

## 목표
Spring Cloud Gateway 기반 api-gateway 프로젝트 뼈대 생성

## 기술 스택
- Spring Boot 3.x (3.3.x)
- Java 17
- Gradle (Groovy DSL)
- Spring Cloud Gateway
- Spring Boot Starter WebFlux

## 생성 파일 목록

### 빌드 설정
- `gateway/build.gradle` — Spring Cloud Gateway, WebFlux 의존성
- `gateway/settings.gradle` — 프로젝트명 `api-gateway`
- `gateway/gradlew`, `gateway/gradlew.bat` — Gradle wrapper 스크립트
- `gateway/gradle/wrapper/gradle-wrapper.properties` — Gradle wrapper 설정

### 소스 코드
- `gateway/src/main/java/com/hubilon/gateway/GatewayApplication.java` — 메인 클래스
- `gateway/src/main/java/com/hubilon/gateway/filter/AuthenticationFilter.java` — 빈 필터 클래스 (추후 구현용)
- `gateway/src/main/java/com/hubilon/gateway/config/CorsConfig.java` — CORS Bean 설정

### 설정 파일
- `gateway/src/main/resources/application.yml` — 포트 8000, 라우팅 설정
  - /api/sso/** → http://localhost:8080
  - /api/sjeasy/** → http://localhost:8081

### 아키텍처 문서
- `gateway/roles/ARCHITECTURE.md` — 게이트웨이 아키텍처 가이드

## 라우팅 설계
```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: sso-route
          uri: http://localhost:8080
          predicates:
            - Path=/api/sso/**
        - id: sjeasy-route
          uri: http://localhost:8081
          predicates:
            - Path=/api/sjeasy/**
```

## CORS 설계
- allowedOriginPatterns: "*"
- allowCredentials: true
- allowedMethods: GET, POST, PUT, DELETE, OPTIONS, PATCH
- allowedHeaders: "*"

## 실행 순서
1. 게이트웨이 에이전트: 전체 파일 생성
