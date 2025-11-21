# 📸 Position Helper

고등부 영상팀 포지션 배정을 도와주는 데스크톱 애플리케이션입니다.

## 주요 기능

### 배정 관리
주간 영상팀 역할 배정을 관리합니다. 각 주차별로 1부와 2부의 다음 역할을 배정할 수 있습니다:
- **SW**: 스위처
- **자막**: 자막 담당
- **고정**: 고정 카메라 담당
- **사이드**: 사이드 카메라 담당 (2명)
- **스케치**: 스케치 담당

### 통계 시각화
Plotly.js를 활용한 배정 통계를 시각화하여 각 팀원의 배정 현황을 한눈에 확인할 수 있습니다.

### 팀원 관리
팀원 정보를 관리하고 활성/비활성 상태를 설정할 수 있습니다.

### 부재 캘린더
FullCalendar 기반의 캘린더에서 팀원의 부재 일정을 관리합니다.

### 경고 시스템
배정 규칙을 자동으로 검사하여 다음 경고를 제공합니다:
- 지난주와 동일 직무 연속 배정 경고
- 사이드 인원 부족 경고 (2명 미만)

## 기술 스택

- **Frontend**: React 18, TypeScript
- **Desktop**: Tauri
- **State Management**: Zustand
- **UI/UX**: Framer Motion, FullCalendar, Plotly.js
- **Drag & Drop**: DnD Kit

## 프로젝트 구조

```
src/
├── components/          # UI 컴포넌트
│   ├── assignment/     # 배정 관련 컴포넌트
│   │   ├── AssignmentBoard.tsx
│   │   ├── AssignmentSummary.tsx
│   │   ├── MemberList.tsx
│   │   └── RoleCell.tsx
│   ├── calendar/       # 캘린더 컴포넌트
│   │   └── AbsenceCalendar.tsx
│   ├── common/         # 공통 컴포넌트
│   │   ├── ActivityFeed.tsx
│   │   ├── Modal.tsx
│   │   ├── ThemeToggle.tsx
│   │   ├── ToastCenter.tsx
│   │   └── WarningBadge.tsx
│   └── stats/          # 통계 시각화 컴포넌트
│       └── StatsView.tsx
├── pages/              # 페이지 컴포넌트
│   ├── Assign.tsx      # 배정 페이지
│   ├── Stats.tsx       # 통계 페이지
│   ├── Members.tsx     # 팀원 관리 페이지
│   └── Settings.tsx    # 설정 페이지
├── state/              # Zustand 상태 관리
│   ├── store.ts
│   └── feedback.ts
├── utils/              # 유틸리티 함수
│   ├── rules.ts        # 배정 규칙 검사
│   ├── assignment.ts
│   ├── date.ts
│   ├── json.ts
│   └── motion.ts
├── types.ts            # TypeScript 타입 정의
└── App.tsx             # 메인 앱 컴포넌트
```

## 실행 방법

### 개발 모드
```bash
npm run tauri:dev
```

### 프로덕션 빌드
```bash
npm run tauri:build
```

