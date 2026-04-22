# test-frontend React 프로젝트 전환 플랜

**날짜**: 2026-04-22  
**목적**: 단일 HTML → React + TypeScript 프로젝트로 전환

---

## 기술 스택

- **React 18 + TypeScript**
- **Vite** (빌드 도구)
- **포트**: 3000 (dev server)
- 스타일: CSS Module 또는 인라인 스타일 (외부 UI 라이브러리 없음)

## 화면 구성

- 기존과 동일: Orange 테마 (`#FF6B00`), 전체 화면 중앙 **"HELLO"** 텍스트

## 디렉터리 구조

```
test-frontend/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
└── src/
    ├── main.tsx
    ├── App.tsx
    └── App.css
```

## 에이전트 실행 순서

1. **프론트 에이전트** → React 프로젝트 생성 (기존 test-frontend 폴더 교체)
