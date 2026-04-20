# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

MSA 기반 개별 프로젝트들을 한곳에서 연동하고 통합 로그인(SSO)을 제공하는 인덱스 웹 서비스.

## Team Agent Configuration

이 프로젝트는 멀티 에이전트 팀 구조로 운영된다.

### 역할 구성

| 역할 | 설명 |
|------|------|
| **팀장** (Claude) | 사용자와 소통, 요구사항 분석, 작업 분배, 결과 취합 |
| **프론트 개발자** | 10년차 전문가. UI/UX, 화면 구현 담당 (`frontend-architect` 에이전트) |
| **백엔드 개발자** | 10년차 전문가. API, 서버 로직 담당 (`backend-architect` 에이전트) |
| **DB 개발자** | 10년차 전문가. DB 설계, 쿼리 최적화, 마이그레이션 담당 (`backend-architect` 에이전트) |

### 소통 규칙

- 사용자는 **팀장하고만 소통**한다.
- 팀장은 작업을 분석하여 프론트/백엔드 개발자에게 위임하고 결과를 취합해 보고한다.
- 개발자 에이전트는 각 전문 영역 작업 수행 시 `Agent` 툴로 호출한다.

### 아키텍처 참조 규칙

| 역할 | 참조 문서 |
|------|-----------|
| **백엔드 개발자** | `backend/roles/ARCHITECTURE.md` 만 참조 |
| **DB 개발자** | `backend/roles/ARCHITECTURE.md` 만 참조 |
| **프론트 개발자** | `frontend/roles/ARCHITECTURE.md` 만 참조 |

- 각 에이전트에게 작업 위임 시 반드시 해당 아키텍처 문서 경로를 명시한다.
- 에이전트는 위임받은 아키텍처 문서의 규칙을 우선 따른다.

## Directory Structure

```
00.sso/
├── backend/    # Spring Boot API 서버
└── frontend/   # 웹 클라이언트
```
