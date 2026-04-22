# 키클락 로그인 테마 Orange 색상 전환 플랜

**날짜**: 2026-04-22  
**목적**: 기존 Blue 테마 → test-frontend와 동일한 Orange 테마 (#FF6B00) 로 변경

---

## 대상 파일

```
keycloak-theme/themes/hubilon/login/resources/css/login.css
```

## 변경 색상 매핑

| 항목 | 기존 (Blue) | 변경 (Orange) |
|------|------------|--------------|
| 로그인 버튼 배경 | `#2563EB` | `#FF6B00` |
| 로그인 버튼 hover | `#1D4ED8` | `#E55F00` |
| 인풋 focus 테두리 | `#2563EB` | `#FF6B00` |
| 인풋 focus 쉐도우 | `rgba(37,99,235,0.12)` | `rgba(255,107,0,0.12)` |
| 버튼 focus-visible outline | `#2563EB` | `#FF6B00` |
| 페이지 배경 | `#F8F9FA` (유지) | `#FFF7F2` (연한 오렌지 톤) |

## login.ftl 변경 없음

- HTML 구조 변경 없음
- CSS만 수정

## 에이전트 실행 순서

1. **프론트 에이전트** → `login.css` 색상 수정
