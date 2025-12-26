# PRD (Product Requirements Document) - Position Helper

## 1. 프로젝트 개요 (Project Overview)
**Position Helper**는 고등부 영상팀의 주간 역할 배정을 효율적으로 관리하고, 팀원들의 활동 통계를 시각화하여 공정한 배정을 돕는 데스크톱 애플리케이션입니다.

### 1.1 목표
- **효율적인 배정**: 드래그 앤 드롭 인터페이스로 빠르고 직관적인 배정 경험 제공
- **데이터 기반 의사결정**: 팀원별 배정 비율, 결석 패턴 등 통계 데이터를 통해 특정 인원 편중 방지
- **운영 안정성**: 배정 규칙 자동 검사(경고 시스템)를 통해 실수 방지 (예: 연속 배정, 숙련도 부족 등)

### 1.2 타겟 사용자
- 교회 고등부 영상팀 팀장 및 운영진

## 2. 핵심 기능 목록 (Core Features)

### 2.1 배정 관리 (Assignment Management)
- **주간 배정 시스템**: 매주 1부/2부 예배에 대한 포지션 배정
- **포지션 종류**:
  - **SW**: 스위처 (메인 화면 전환)
  - **자막**: 자막 송출 담당
  - **고정**: 메인/강단 고정 카메라
  - **사이드**: 측면 카메라 (2명 배정 필요)
  - **스케치**: 스케치 영상 촬영
- **UI/UX**: `DnD Kit` 기반의 직관적인 드래그 앤 드롭 인터페이스

### 2.2 팀원 관리 (Member Management)
- **팀원 DB**: 이름, 직급, 활성/비활성 상태 관리
- **상태 관리**: 휴식 중이거나 장기 부재중인 팀원 비활성화 처리 가능

### 2.3 통계 및 대시보드 (Statistics & Dashboard)
- **역할 배정 비율**: 개인별 전체 배정 중 각 역할(스위처, 자막 등)이 차지하는 비중 시각화
- **결석 및 출석 분석**:
  - 주차별 배정/불참/휴식 비율 스택 차트
  - 개인별 결석 분포 Dot Plot (평균선 포함)
- **히트맵(Heatmap)**: 팀원 × 역할 교차 분석으로 특정 역할 편중 여부 식별
- **기술 스택**: `Plotly.js` 활용

### 2.4 부재 캘린더 (Absence Calendar)
- **일정 관리**: `FullCalendar`를 이용한 팀원 부재/휴가 일정 등록 및 조회
- **배정 연동**: 부재 등록된 팀원은 해당 날짜 배정 시 경고 또는 제외 처리(향후 고도화)

### 2.5 자동 경고 시스템 (Warning System)
규칙 위반 시 시각적 경고(Badge/Toast) 제공:
1.  **연속 배정**: 지난주와 동일한 직무 연속 배정 시 경고
2.  **경험 부족**: 최근 2주간 해당 역할 수행 경험 없을 시 경고
3.  **인원 부족**: 사이드 카메라 배정 인원이 2명 미만일 경우 경고

## 3. 디자인 컨셉 (Design Concept)

### 3.1 디자인 시스템
자체 구축된 **Semantic Token** 기반 디자인 시스템 사용 (`DESIGN_SYSTEM.md` 참조).

### 3.2 색상 팔레트 (Color Palette)
- **기반 테마**: Light/Dark 모드 지원 (System Preference 대응)
- **주요 색상 변수**:
  - `Base`: `--color-canvas` (배경), `--color-surface-1/2` (카드/패널)
  - `Text`: `--color-text-primary`, `--color-text-muted`
  - `Status`:
    - **Accent**: `--color-accent` (강조, 브랜드 컬러)
    - **Danger**: `--color-critical` (오류, 경고)
    - **Success**: `--color-success` (완료, 안전)
  - **Data Visualization**: `--data-series-1` ~ `--data-series-6` (차트용 구분 색상)

### 3.3 타이포그래피 (Typography)
- **Font Family**: 시스템 폰트 우선 (San Francisco, Segoe UI, Roboto 등) + `Inter` 또는 `Pretendard` 웹폰트 권장
- **가독성**: 데이터 중심 UI이므로 숫자와 테이블 가독성에 최적화된 간격 사용

### 3.4 레퍼런스 스타일
- **Modern Dashboard**: Clean, Minimalist stats view (e.g., Linear App, Vercel Dashboard)
- **Interactions**: `Framer Motion`을 활용한 부드러운 전환 및 마이크로 인터랙션

## 4. 기술 스택 (Technology Stack)

### 4.1 Core
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Packager**: Tauri (Desktop App Build)

### 4.2 State Management & Data
- **Global State**: Zustand (가볍고 직관적인 상태 관리)
- **Data Schema**: Zod (데이터 검증)

### 4.3 UI & Styling
- **Styling**: Vanilla CSS Variables (Theme System) + CSS Modules
- **Utility**: `clsx` (조건부 클래스)
- **Components**: 자체 제작 UI Kit (Button, Panel, Badge 등 - `src/components/ui/`)
- **Animations**: Framer Motion

### 4.4 Libraries
- **Drag & Drop**: `@dnd-kit/core`, `@dnd-kit/sortable`
- **Charting**: `plotly.js-dist-min`, `react-plotly.js`
- **Calendar**: `@fullcalendar/react`, `@fullcalendar/daygrid`

## 5. 데이터 저장 및 폴더 구조 (Structure)

### 5.1 데이터 저장 방식
- 로컬 파일 시스템 기반 (JSON 파일 입출력)
- Tauri FS API를 활용하여 사용자 로컬 경로에 데이터 저장

### 5.2 프로젝트 구조
```
src/
├── components/          # UI 및 기능별 컴포넌트
│   ├── assignment/      # 배정 보드 관련
│   ├── calendar/        # 캘린더
│   ├── common/          # 공통 UI (Modal, Toast 등)
│   ├── ui/              # 기본 디자인 시스템 컴포넌트
│   └── stats/           # 통계 차트
├── pages/               # 라우트 단위 페이지 (Assign, Stats, Members 등)
├── state/               # Zustand 스토어
├── theme/               # 테마 및 디자인 토큰 정의
├── utils/               # 비즈니스 로직 및 헬퍼 함수
└── App.tsx              # 메인 엔트리
```
