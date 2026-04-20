# Backend Architecture

## 프로젝트 개요

MSA 기반 프로젝트들의 통합 로그인(SSO)을 제공하는 인덱스 API 서버.

## 기술 스택

| 항목 | 기술 |
|------|------|
| 프레임워크 | Spring Boot 3.4.4 |
| 언어 | Java 21 |
| 데이터베이스 | PostgreSQL (`192.168.10.30:6543/hubilon_pd`) |
| ORM | Spring Data JPA / Hibernate |
| 인증 | Keycloak (OAuth2 Resource Server, JWT) |
| 빌드 | Gradle (Kotlin DSL) |
| 문서 | SpringDoc OpenAPI (Swagger UI) |

## 아키텍처: Hexagonal (Ports & Adapters)

의존성은 반드시 **안쪽으로만** 흐른다.

```
adapter → application → domain
```

- **domain**: 외부 의존성 없음. 순수 비즈니스 로직과 엔티티만 포함.
- **application**: 포트(인터페이스)를 통해 domain을 조율. 어댑터를 직접 참조하지 않는다.
- **adapter**: Spring, JPA, HTTP 등 외부 기술과의 실제 연동.
- **infrastructure**: 전역 설정, 예외 처리, 공통 응답 래퍼.

## 패키지 구조

```
com.hubilon.sso/
├── SsoApplication.java
│
├── domain/
│   └── model/
│       └── BaseEntity.java          # JPA Auditing 슈퍼클래스 (createdAt, updatedAt)
│       └── (도메인 엔티티들)
│
├── application/
│   ├── port/
│   │   ├── in/                      # 입력 포트 인터페이스 (UseCase)
│   │   └── out/                     # 출력 포트 인터페이스 (Repository 계약)
│   └── service/                     # UseCase 구현체 (입력포트 구현, 출력포트 사용)
│
├── adapter/
│   ├── in/
│   │   └── web/                     # REST 컨트롤러
│   │       └── dto/                 # 요청/응답 DTO
│   └── out/
│       └── persistence/             # JPA 엔티티, Spring Data Repository, 포트 구현체
│
└── infrastructure/
    ├── config/
    │   ├── JpaConfig.java           # @EnableJpaAuditing
    │   └── SecurityConfig.java      # Spring Security + OAuth2 Resource Server
    ├── exception/
    │   ├── ErrorCode.java           # 에러 코드 열거형
    │   ├── ServiceException.java    # 커스텀 예외 (ErrorCode 래핑)
    │   └── GlobalExceptionHandler.java  # @RestControllerAdvice
    └── response/
        └── ApiResponse.java         # 공통 API 응답 record
```

## 핵심 공통 클래스

### BaseEntity
모든 JPA 엔티티는 `BaseEntity`를 상속한다.
```java
// domain/model/BaseEntity.java
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class BaseEntity {
    @CreatedDate  private LocalDateTime createdAt;
    @LastModifiedDate private LocalDateTime updatedAt;
}
```

### ApiResponse
모든 API 응답은 `ApiResponse<T>` record로 감싼다.
```java
// infrastructure/response/ApiResponse.java
public record ApiResponse<T>(boolean success, String message, T data) {
    public static <T> ApiResponse<T> ok(T data) { ... }
    public static <T> ApiResponse<T> ok() { ... }
    public static ApiResponse<Void> error(String message) { ... }
}
```

### ErrorCode & ServiceException
비즈니스 예외는 반드시 `ErrorCode`를 사용하고 `ServiceException`으로 throw한다.
```java
// 사용 예시
throw new ServiceException(ErrorCode.NOT_FOUND);
```

현재 정의된 ErrorCode:
| 코드 | 값 | 메시지 |
|------|-----|--------|
| INTERNAL_SERVER_ERROR | E001 | 내부 서버 오류 |
| INVALID_INPUT | E002 | 잘못된 입력값 |
| UNAUTHORIZED | E003 | 인증이 필요합니다 |
| FORBIDDEN | E004 | 접근 권한이 없습니다 |
| NOT_FOUND | E005 | 리소스를 찾을 수 없습니다 |

## 보안

- 모든 엔드포인트는 Keycloak JWT 인증 필요 (기본값)
- 인증 불필요 경로: `/actuator/health`, `/api-docs/**`, `/swagger-ui/**`
- 토큰 검증: `spring.security.oauth2.resourceserver.jwt.issuer-uri` 설정 기반
- CORS: 현재 `*` 허용 (운영 시 실제 도메인으로 제한 필요)

## 데이터베이스

- **DB**: PostgreSQL `192.168.10.30:6543/hubilon_pd`
- **DDL**: dev → `update`, prod → `validate`
- **접속 정보**: 환경변수 `DB_USERNAME`, `DB_PASSWORD`
- **Auditing**: `@EnableJpaAuditing` 활성화 (BaseEntity createdAt/updatedAt 자동 관리)
- **초기 데이터**: `src/main/resources/data.sql` (필요 시 사용)

## 환경 설정

| 환경 | 파일 | 특징 |
|------|------|------|
| 공통 | `application.yml` | datasource, security, server 설정 |
| dev | `application-dev.yml` | show-sql: true, DEBUG 로그 |
| prod | `application-prod.yml` | ddl-auto: validate, INFO 로그 |
| test | `application-test.yml` | 테스트 전용 |

- Keycloak issuer URI: 환경변수 `KEYCLOAK_ISSUER_URI`

## 개발 규칙

### 새 도메인 추가 시 순서
1. `domain/model/` → 도메인 엔티티 (BaseEntity 상속)
2. `application/port/out/` → 출력 포트 인터페이스
3. `application/port/in/` → 입력 포트 인터페이스 (UseCase)
4. `application/service/` → UseCase 구현 서비스
5. `adapter/out/persistence/` → JPA 엔티티, Repository, 포트 구현체
6. `adapter/in/web/` → 컨트롤러 + DTO

### 필수 규칙
- 도메인 모델과 JPA 엔티티는 **분리**한다 (persistence adapter에서 변환)
- 예외는 반드시 `ServiceException(ErrorCode)` 사용
- 응답은 반드시 `ApiResponse<T>` 래퍼 사용
- 컨트롤러 DTO는 `adapter/in/web/dto/` 하위에 위치

## 빌드 & 실행

```bash
# 빌드
./gradlew build

# 실행 (dev 프로파일)
./gradlew bootRun

# 테스트
./gradlew test

# 정리
./gradlew clean
```
