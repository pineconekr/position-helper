# PRD (Product Requirements Document) - Position Helper

## 1. 프로젝트 개요 (Project Overview)
**Position Helper**는 고등부 영상팀의 주간 역할 배정을 효율적으로 관리하고, 팀원들의 활동 통계를 시각화하여 공정한 배정을 돕는 **Vue 3 기반 웹 애플리케이션**입니다.

### 1.1 목표
- **효율적인 배정**: 드래그 앤 드롭 인터페이스로 직관적인 배정 경험 제공
- **데이터 기반 의사결정**: 차트를 활용한 배정 비율, 히트맵 등 시각화 데이터 제공
- **운영 안정성**: 배정 규칙 자동 검사(경고 시스템)를 통해 연속 배정, 숙련도 부족 등의 실수 방지

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
- **인터랙션**: 직관적인 드래그 앤 드롭 지원

### 2.2 팀원 관리 (Member Management)
- **카드형 UI**: 모던한 카드 스타일의 멤버 리스트 (Active/Inactive 등 상태 필터링)
- **멤버 프로필**: 아바타 및 상태 표시 (Lucide Icons 활용)

### 2.3 통계 및 대시보드 (Statistics & Dashboard)
- **차트 활용**:
  - **역할 배정 비율**: 파이 차트/도넛 차트
  - **추세선**: 주차별 배정 추이
- **KPI 지표**: 공정성 점수, 연속 배정 경고 수 등 핵심 지표 카드

### 2.4 자동 경고 시스템 (Warning System)
- **실시간 유효성 검사**:
  1.  **연속 배정**: 지난주와 동일한 직무 연속 배정 시 알림
  2.  **경험 부족**: 숙련도가 낮은 역할 배정 시 주의
  3.  **인원 부족**: 필수 인원(예: 사이드 2명) 미달 시 경고
- **UI**: Minimalist 디자인 (Filter Chips, 심플한 리스트 형태)

## 3. 디자인 컨셉 (Design Concept)

### 3.1 디자인 시스템
- **Tailwind CSS v4**: 최신 CSS-first 설정 사용
- **Icons**: `Lucide Vue` (깔끔하고 모던한 아이콘)
- **테마**: Light/Dark 모드 완벽 지원 (CSS Variables 기반 `theme.css`)

### 3.2 스타일 가이드
- **Color Palette**: Tailwind의 slate/gray 스케일을 기반으로 한 모던 SaaS 룩
- **Typography**: 가독성 높은 산세리프

## 4. 기술 스택 (Technology Stack)

### 4.1 Core
- **Framework**: Vue 3 + Vite
- **Language**: TypeScript
- **State Management**: Pinia (전역 상태)
- **Data Validation**: Zod

### 4.2 Styling & UI
- **CSS Framework**: Tailwind CSS v4
- **PostCSS**: CSS 처리
- **Icons**: lucide-vue-next
- **Motion**: @vueuse/motion (애니메이션)

### 4.3 Libraries
- **Visualization**: Chart 라이브러리 (필요 시 Apache ECharts 등 도입 고려)
- **Utilities**: `clsx`, `tailwind-merge`

## 5. 프로젝트 구조 (Project Structure)
도메인 중심(Feature-based) 구조 지향
```
src/
├── components/          # 공통 UI 컴포넌트
├── features/            # 도메인별 기능 모듈
│   ├── assignment/      # 배정 로직, 테이블 UI
│   ├── members/         # 멤버 관리, 카드 UI
│   ├── stats/           # 통계 계산 및 차트
│   └── settings/        # 설정 관련
├── stores/             # Pinia 스토어
├── utils/              # 유틸리티 함수
└── ...
```
