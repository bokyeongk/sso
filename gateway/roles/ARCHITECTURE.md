# API Gateway 아키텍처 문서

## 프로젝트 개요

Spring Cloud Gateway 기반의 API Gateway 서버로, MSA 환경에서 각 백엔드 서비스 앞단에 위치하여 라우팅, 인증 필터, CORS 처리를 담당한다.

## 기술 스택

| 항목 | 버전 |
|------|------|
| Java | 17 |
| Spring Boot | 3.3.4 |
| Spring Cloud | 2023.0.3 |
| Spring Cloud Gateway | spring-cloud-starter-gateway |
| Spring WebFlux | spring-boot-starter-webflux (리액티브 기반) |

## 디렉터리 구조

```
gateway/
├── build.gradle
├── settings.gradle
├── gradle/wrapper/
│   └── gradle-wrapper.properties
├── roles/
│   └── ARCHITECTURE.md          # 현재 문서
└── src/
    └── main/
        ├── java/com/hubilon/gateway/
        │   ├── GatewayApplication.java   # 애플리케이션 진입점
        │   ├── config/
        │   │   └── CorsConfig.java       # CORS 전역 설정
        │   └── filter/
        │       └── AuthenticationFilter.java  # 인증 필터 (구현 예정)
        └── resources/
            └── application.yml           # 라우팅 및 서버 설정
```

### 디렉터리별 역할

- `config/` — CORS, 보안 등 Gateway 전역 설정 Bean을 정의한다.
- `filter/` — Gateway 필터를 구현한다. 인증 토큰 검증, 요청/응답 로깅 등 횡단 관심사를 처리한다.
- `resources/application.yml` — 라우팅 규칙, 서버 포트, 로깅 레벨 등 운영 설정을 관리한다.

## 라우팅 규칙

| Route ID | 요청 경로 패턴 | 대상 서비스 |
|----------|---------------|-------------|
| sso-route | `/api/sso/**` | `http://localhost:8080` (SSO 백엔드) |
| sjeasy-route | `/api/sjeasy/**` | `http://localhost:8081` (SJEasy 서비스) |

- 새로운 서비스 추가 시 `application.yml`의 `spring.cloud.gateway.routes` 하위에 route 항목을 추가한다.

## CORS 정책

| 항목 | 값 |
|------|----|
| allowedOriginPatterns | `*` (모든 도메인 허용) |
| allowCredentials | `true` |
| allowedMethods | GET, POST, PUT, DELETE, OPTIONS, PATCH |
| allowedHeaders | `*` |
| maxAge | 3600초 |

- `CorsWebFilter`를 Bean으로 등록하여 모든 경로(`/**`)에 적용한다.
- Spring Cloud Gateway는 WebFlux 기반이므로 반드시 `org.springframework.web.cors.reactive.CorsWebFilter`를 사용한다. (`org.springframework.web.filter.CorsFilter` 사용 금지)

## 코딩 컨벤션

1. 이 Gateway 에이전트는 `gateway/` 폴더 내 파일만 담당한다. `backend/`, `frontend/` 등 타 폴더는 절대 수정하지 않는다.
2. 모든 필터는 `filter/` 패키지에 위치시킨다.
3. 모든 설정 Bean은 `config/` 패키지에 위치시킨다.
4. 라우팅 설정은 코드가 아닌 `application.yml`로 관리한다.
5. WebFlux 리액티브 프로그래밍 모델을 준수한다 (블로킹 I/O 사용 금지).
