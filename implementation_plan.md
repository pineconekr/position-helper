# 구현 계획서 (Implementation Plan)

## 🏗️ 아키텍처: 기능 중심 설계 (Feature-Based Design)
본 프로젝트는 확장성과 유지보수성을 위해 도메인 주도 및 기능 슬라이스(feature-sliced) 구조를 따릅니다.

### 주요 용어
- **`features/`**: 독립적인 비즈니스 로직 모듈 (예: 배정, 팀원 관리). 자체 컴포넌트, 훅, 페이지를 포함합니다.
- **`shared/`**: 전역적으로 재사용되는 코드 (UI Kit, 상태 관리, 테마, 유틸리티).
- **`app/`**: 애플리케이션 전반의 설정 (라우팅, Provider 등).

## 📂 디렉토리 구조
```
src/
├── app/                 # 앱 설정 (Routes, App.tsx)
├── features/            # 기능별 모듈
│   ├── assignment/      # [기능] 배정 보드
│   │   ├── components/  # DnD 보드, 역할 카드
│   │   ├── hooks/       # 배정 로직 훅
│   │   └── pages/       # 배정 페이지 (AssignPage.tsx)
│   ├── members/         # [기능] 팀원 관리
│   ├── stats/           # [기능] 통계 및 차트
│   └── settings/        # [기능] 앱 설정
├── shared/              # 공유 자원
│   ├── components/      # UI Kit (기본 컴포넌트)
│   ├── state/           # 전역 상태 (Zustand)
│   ├── theme/           # 디자인 토큰 및 테마 프로바이더
│   └── utils/           # 헬퍼 함수 (날짜, 유효성 검사)
└── main.tsx             # 진입점
```

## 🛠️ 기술 스택
- **Core**: React 18, TypeScript, Vite
- **Platform**: Tauri (Rust + Webview)
- **State**: Zustand (전역 상태), React Context (테마)
- **UI**: CSS Modules / Vanilla CSS Variables (`DESIGN_SYSTEM.md`)
- **Visuals**: Plotly.js (데이터 시각화)
- **Logic**: DnD Kit (드래그앤드롭), FullCalendar (부재 일정)

## 📅 단계별 구현 전략

### 1단계: 핵심 기반 구축 (완료)
- [x] 초기 Tauri/Vite 설정
- [x] 디자인 시스템 정의 (`design-system.md`)
- [x] 전역 상태 스토어 설정 (Zustand)

### 2단계: 핵심 기능 개발 (진행중 / 검토 필요)
- **배정 시스템**
    - `DndContext`를 이용한 `AssignPage` 구현
    - `MemberCard` 및 `RoleSlot` 컴포넌트 제작
    - 배정 규칙(`assignment.ts`) 로직 통합
- **팀원 관리**
    - CRUD 기능을 위한 `MemberPage` 제작
    - 로컬 JSON 파일을 이용한 데이터 영속성 처리
- **통계 분석**
    - Plotly 차트를 활용한 `StatsPage` 구현
    - 팀원별 활용도 및 부재 지표 계산 로직 적용

### 3단계: 완성도 향상 및 규칙 고도화 (예정)
- **규칙 엔진**: 중복 배정 등 제약 조건에 대한 시각적 피드백 강화
- **영속성 레이어**: Tauri FS API를 활용한 견고한 파일 I/O 보장
- **UI 폴리싱**: Framer Motion을 이용한 전환 효과 및 다크 모드 세부 정밀 조정
