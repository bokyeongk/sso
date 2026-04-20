# Frontend Architecture

## 프로젝트 개요

MSA 기반 프로젝트들의 통합 로그인(SSO)을 제공하는 인덱스 웹 클라이언트.

## 기술 스택

| 항목 | 기술 |
|------|------|
| 런타임 | React 19 |
| 빌드 도구 | Vite |
| 언어 | TypeScript |
| UI 컴포넌트 | shadcn/ui |
| 인증 | Keycloak |

## 핵심 원칙

### 1. UI — shadcn/ui 기반 구성

- 모든 UI 컴포넌트는 **shadcn/ui**를 우선 사용한다.
- shadcn/ui가 제공하지 않는 경우에만 커스텀 컴포넌트를 작성한다.
- 커스텀 컴포넌트는 shadcn/ui의 디자인 토큰(CSS 변수)을 그대로 따른다.
- Tailwind CSS 유틸리티 클래스를 통해 스타일을 적용하며, 인라인 style 속성 사용을 지양한다.

### 2. 인증 — Keycloak 연동

- 인증은 **Keycloak**을 통해 처리한다.
- 로그인·로그아웃·토큰 갱신은 Keycloak SDK(`keycloak-js`)를 사용한다.
- 인증 상태는 Context 또는 전역 상태 관리로 앱 전체에 공유한다.
- 보호된 라우트는 인증 여부를 확인하여 Keycloak 로그인 화면으로 리다이렉트한다.
- Access Token은 API 요청 헤더(`Authorization: Bearer`)에 자동으로 첨부한다.

### 3. 빌드 — Vite

- 개발 서버와 프로덕션 빌드 모두 **Vite**를 사용한다.
- 환경 변수는 `.env` 파일로 관리하며, `VITE_` 접두사를 붙인다.
- 경로 별칭(`@/`)을 사용하여 상대 경로 depth를 최소화한다.

## 디렉터리 구조

```
src/
├── assets/          # 정적 리소스 (이미지, 폰트 등)
├── components/
│   ├── ui/          # shadcn/ui 생성 컴포넌트 (자동 생성, 직접 수정 최소화)
│   └── common/      # 공통 커스텀 컴포넌트
├── features/        # 도메인별 기능 단위 모듈
├── hooks/           # 커스텀 훅
├── lib/             # 유틸리티 및 설정 (shadcn utils, keycloak 초기화 등)
├── pages/           # 라우트 단위 페이지 컴포넌트
├── router/          # React Router 설정 및 보호 라우트
├── services/        # API 호출 레이어 (axios 인스턴스 등)
├── store/           # 전역 상태 관리
└── types/           # 공통 TypeScript 타입 정의
```

## 개발 규칙

- 컴포넌트 파일명은 **PascalCase**, 훅·유틸은 **camelCase**로 작성한다.
- 페이지 컴포넌트는 `pages/` 아래에만 위치한다.
- API 호출은 반드시 `services/` 레이어를 통해 수행하며, 컴포넌트에서 직접 fetch/axios를 호출하지 않는다.
- Keycloak 토큰 관련 로직은 `lib/keycloak.ts`에 집중한다.
