# 로그인 후 홈화면 - 서비스 목록 구현 플랜
작성일: 2026-04-20
수정일: 2026-04-20 (이슈 반영)

## 요구사항
- 키클락 로그인 후 홈화면 표시
- 서비스 목록을 카드형으로 표시 (서비스명, 서비스설명, 구동상태)
- DB로 서비스 관리
- 키클락 JWT 토큰을 백엔드 API 호출 시 전달

---

## 현재 상태

### Frontend (React + Vite + TypeScript)
- `useKeycloak` 훅: `onLoad: 'login-required'` → 자동 로그인 강제
- `App.tsx`: 인증 여부에 따라 로그아웃 버튼만 표시 (홈화면 없음)
- 라이브러리: axios, @tanstack/react-query, keycloak-js, lucide-react

### Backend (Spring Boot 3.4.4, Java 21)
- Keycloak OAuth2 Resource Server 설정 완료
- PostgreSQL 연결 (`192.168.10.30:6543/hubilon_pd`)
- 스키마: `msa-service` (`application.yml`에 `hibernate.default_schema: msa-service` 설정 완료)
- `ddl-auto: update` → 엔티티 기반 테이블 자동 생성
- Hexagonal Architecture 구조 (adapter/application/domain)
- 현재 도메인 코드 없음 (.gitkeep 상태)

---

## DB 사전 조건

> `ddl-auto: update`는 테이블만 자동 생성하며 **스키마는 자동 생성하지 않는다.**
> 서버 기동 전 DB에 `msa-service` 스키마가 반드시 존재해야 한다.

```sql
-- DB에 사전 실행 필요
CREATE SCHEMA IF NOT EXISTS "msa-service";
```

- 스키마 생성 후 서버를 기동하면 `ServiceEntity`의 `@Table(schema = "msa-service")` 설정으로 테이블이 자동 생성된다.
- `data.sql` 사용하지 않는다. 초기 데이터는 DB 관리 도구(DBeaver 등)로 직접 입력한다.

---

## 구현 계획

### [Backend] 1. Service 도메인 모델 (순수 도메인, JPA 의존 없음)
**파일**: `domain/model/Service.java`
```
- id: Long
- name: String (서비스명)
- description: String (서비스설명)
- status: ServiceStatus (RUNNING / STOPPED / MAINTENANCE)
- url: String (서비스 접속 URL)
- iconUrl: String (아이콘 URL, nullable)
- sortOrder: Integer (표시 순서)
- createdAt: LocalDateTime
- updatedAt: LocalDateTime
```
> BaseEntity 상속 금지 — 도메인 모델은 JPA에 의존하지 않는다.
> createdAt/updatedAt은 일반 필드로 선언한다.

### [Backend] 2. ServiceStatus Enum
**파일**: `domain/model/ServiceStatus.java`
```
RUNNING("구동중"), STOPPED("중지됨"), MAINTENANCE("점검중")
```

### [Backend] 3. 출력 포트 인터페이스
**파일**: `application/port/out/ServiceRepository.java`
```java
List<Service> findAllOrderBySortOrder();
```

### [Backend] 4. 입력 포트 인터페이스
**파일**: `application/port/in/GetServicesUseCase.java`
```java
List<Service> getServices();
```

### [Backend] 5. 애플리케이션 서비스
**파일**: `application/service/ServiceApplicationService.java`
- `GetServicesUseCase` 구현
- `ServiceRepository` 포트 사용

### [Backend] 6. JPA 엔티티 & 레포지토리
**파일**: `adapter/out/persistence/ServiceEntity.java`
```java
@Entity
@Table(name = "service", schema = "msa-service")
// BaseEntity 상속 — JPA 엔티티이므로 상속 적합
// 도메인 모델(Service)과 변환 메서드 포함
```
**파일**: `adapter/out/persistence/ServiceJpaRepository.java`
```java
List<ServiceEntity> findAllByOrderBySortOrderAsc();
```
**파일**: `adapter/out/persistence/ServicePersistenceAdapter.java`
- `ServiceRepository` 포트 구현
- `ServiceEntity` ↔ `Service` 도메인 모델 변환

### [Backend] 7. REST API 컨트롤러
**파일**: `adapter/in/web/ServiceController.java`
```
GET /api/services
- JWT 인증 필요 (SecurityConfig에서 자동 처리)
- 응답: ApiResponse<List<ServiceResponse>>
```

### [Backend] 8. DTO
**파일**: `adapter/in/web/dto/ServiceResponse.java`
```
- id, name, description, status, url, iconUrl, sortOrder
```

---

### [Frontend] 1. API 클라이언트 설정
**파일**: `src/lib/apiClient.ts`
- axios 인스턴스 생성, `VITE_API_BASE_URL` 사용
- 요청 인터셉터:
  - 토큰 만료 시 `keycloak.updateToken(30)` 호출 후 갱신된 토큰 사용
  - `Authorization: Bearer {token}` 헤더 자동 첨부
- 응답 인터셉터: 401 응답 시 `keycloak.login()` 리다이렉트

### [Frontend] 2. 환경변수 추가
**파일**: `.env`
```
VITE_API_BASE_URL=http://localhost:8080
```

### [Frontend] 3. 서비스 API 훅
**파일**: `src/hooks/useServices.ts`
- React Query `useQuery` 사용
- `/api/services` 호출
- 타입:
  ```ts
  interface Service {
    id: number
    name: string
    description: string
    status: 'RUNNING' | 'STOPPED' | 'MAINTENANCE'
    url: string | null
    iconUrl: string | null
    sortOrder: number
  }
  ```

### [Frontend] 4. 컴포넌트 구조
```
src/
├── pages/
│   └── HomePage.tsx              # 홈화면 (서비스 카드 그리드)
├── components/
│   ├── common/
│   │   └── LoginButton.tsx       (기존)
│   └── service/
│       ├── ServiceCard.tsx       # 서비스 카드
│       └── ServiceEmptyState.tsx # 서비스 목록 없을 때 Empty State
```

### [Frontend] 5. ServiceCard 컴포넌트
**파일**: `src/components/service/ServiceCard.tsx`
- 서비스명, 설명 표시
- 구동상태 배지 (RUNNING=초록, STOPPED=빨강, MAINTENANCE=노랑)
- 클릭 시 서비스 URL로 새 탭 이동: `target="_blank" rel="noopener noreferrer"`
  - url이 null이면 클릭 비활성화
- lucide-react 아이콘 활용

### [Frontend] 6. ServiceEmptyState 컴포넌트
**파일**: `src/components/service/ServiceEmptyState.tsx`
- 서비스 목록이 비어 있을 때 표시
- "등록된 서비스가 없습니다" 안내 메시지
- lucide-react 아이콘(예: `ServerOff`) 활용

### [Frontend] 7. HomePage
**파일**: `src/pages/HomePage.tsx`
- 상단: 로그인된 사용자 정보 (`keycloak.tokenParsed`의 name/email)
- 로그아웃 버튼
- 서비스 카드 그리드 (반응형: 모바일 1열, 태블릿 2열, PC 3열)
- 상태별 처리:
  - 로딩 중: 스피너 표시
  - 에러: 에러 메시지 표시
  - 데이터 없음: `<ServiceEmptyState />`
  - 정상: `<ServiceCard />` 목록

### [Frontend] 8. App.tsx 수정
- 인증 상태에 따라 분기:
  - 미인증: 로그인 페이지 (기존)
  - 인증됨: `<HomePage />`

### [Frontend] 9. React Query Provider 설정
**파일**: `src/main.tsx`
- `QueryClientProvider` 추가

---

## 파일 변경 요약

### Backend (신규 생성)
| 파일 | 역할 |
|------|------|
| `domain/model/Service.java` | 순수 도메인 모델 (JPA 의존 없음) |
| `domain/model/ServiceStatus.java` | 상태 열거형 |
| `application/port/out/ServiceRepository.java` | 출력 포트 |
| `application/port/in/GetServicesUseCase.java` | 입력 포트 |
| `application/service/ServiceApplicationService.java` | 애플리케이션 서비스 |
| `adapter/out/persistence/ServiceEntity.java` | JPA 엔티티 (`@Table(schema="msa-service")`, BaseEntity 상속) |
| `adapter/out/persistence/ServiceJpaRepository.java` | Spring Data JPA |
| `adapter/out/persistence/ServicePersistenceAdapter.java` | 포트 구현체 + 도메인 변환 |
| `adapter/in/web/ServiceController.java` | REST 컨트롤러 |
| `adapter/in/web/dto/ServiceResponse.java` | 응답 DTO |

### Backend (수정 없음)
- `application.yml`: `msa-service` 스키마 설정 이미 완료
- `data.sql`: 사용하지 않음 (삭제)

### Frontend (신규 생성)
| 파일 | 역할 |
|------|------|
| `src/lib/apiClient.ts` | axios 인스턴스 (토큰 갱신 + Bearer 헤더 인터셉터) |
| `src/hooks/useServices.ts` | 서비스 목록 React Query 훅 |
| `src/pages/HomePage.tsx` | 홈화면 |
| `src/components/service/ServiceCard.tsx` | 서비스 카드 |
| `src/components/service/ServiceEmptyState.tsx` | Empty State UI |

### Frontend (수정)
| 파일 | 변경내용 |
|------|----------|
| `src/App.tsx` | 인증 여부에 따른 화면 분기 |
| `src/main.tsx` | QueryClientProvider 추가 |
| `.env` | VITE_API_BASE_URL 추가 |

---

## API 스펙

### GET /api/services
**Headers**: `Authorization: Bearer {keycloak_access_token}`

**Response 200**:
```json
{
  "success": true,
  "message": null,
  "data": [
    {
      "id": 1,
      "name": "쇼핑센터",
      "description": "KT 쇼핑센터 관리 시스템",
      "status": "RUNNING",
      "url": "http://localhost:3001",
      "iconUrl": null,
      "sortOrder": 1
    }
  ]
}
```

**Response 200 (목록 없음)**:
```json
{
  "success": true,
  "message": null,
  "data": []
}
```

---

## 작업 순서
1. DB에 `"msa-service"` 스키마 사전 생성 확인
2. Backend: 도메인 → 포트 → 서비스 → 어댑터 → 컨트롤러 순으로 구현
3. Backend 빌드 및 서버 기동 → `msa-service.service` 테이블 자동 생성 확인
4. Frontend: API 클라이언트 → 훅 → 컴포넌트 → 페이지 순으로 구현
5. App.tsx 라우팅 수정, main.tsx QueryClientProvider 추가
6. 통합 테스트

---

## Review 결과
- 검토일: 2026-04-20
- 검토 항목: 보안 / 리팩토링 / 기능 / DB
- 반영된 이슈:
  - B-2: 토큰 만료 시 `updateToken(30)` 자동 갱신 처리 추가
  - R-1: 도메인 모델(`Service.java`)과 JPA 엔티티(`ServiceEntity.java`) 분리 — BaseEntity는 JPA 엔티티에서만 상속
  - R-2: `data.sql` 제거 (중복 삽입 위험 해소)
  - F-2: 새 탭 이동 `target="_blank" rel="noopener noreferrer"` 명시
  - F-3: `ServiceEmptyState` 컴포넌트 추가
  - F-4: API 응답 스펙에 `message` 필드 추가
  - D-1: `msa-service` 스키마 사전 생성 조건 명시
  - D-2: `data.sql` 미사용으로 스키마 경로 문제 해소
- 미반영 이슈 (의도적 제외):
  - B-1 (CORS): 현재 `*` 허용 유지, 운영 전환 시 별도 처리
