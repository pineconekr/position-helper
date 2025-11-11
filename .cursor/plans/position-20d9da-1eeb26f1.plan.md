<!-- 1eeb26f1-f970-49f0-829a-94db3407981c ed88b67d-356e-4ab5-b4ef-f7856839fac0 -->
# Position Helper v1 (Tauri + React + TypeScript)

## 범위와 결정

- 데스크톱: Tauri
- 분석: 1차는 TypeScript만 사용 (Python은 2차에서 Tauri Commands로 연동)
- 포함 기능: 배정 UI(DnD), 경고, 불참 캘린더, 통계(Plotly), JSON import/export, 로컬 저장, 다크 모드

## 프로젝트 구성

- 초기화: create-tauri-app (Vite + React + TS)
- 주요 의존성: `zustand`, `@dnd-kit/core @dnd-kit/sortable`, `react-plotly.js plotly.js`, `@fullcalendar/react @fullcalendar/daygrid`, `@tauri-apps/api`, `zod`, `clsx`
- 디렉터리(핵심):
  - `src/types.ts` 데이터 타입/스키마
  - `src/state/store.ts` 전역 상태(Zustand)
  - `src/utils/{json.ts,rules.ts,date.ts}` 유틸/경고 규칙
  - `src/components/assignment/*` 배정 보드 + 멤버 리스트
  - `src/components/calendar/*` 불참 캘린더
  - `src/components/stats/*` 통계 뷰
  - `src/components/common/*` 공통 UI(토글/모달/경고배지)
  - `src/pages/{Assign,Calendar,Stats,Members,Settings}.tsx` 페이지
  - `src/theme/*` 다크/라이트 테마(CSS 변수)

## 데이터 모델(요약)

- JSON 구조(요지): `weeks[date] -> { part1, part2, absences[] }`, `members[]`
- 타입 초안(핵심 필드만):
```ts
export type RoleKey = 'SW' | '자막' | '고정' | '사이드' | '스케치';
export interface PartAssignment { SW: string; 자막: string; 고정: string; 사이드: [string, string]; 스케치: string; }
export interface WeekData { part1: PartAssignment; part2: PartAssignment; absences: { name: string; reason?: string }[] }
export interface MembersEntry { name: string; notes?: string }
export interface AppData { weeks: Record<string, WeekData>; members: MembersEntry[]; }
export interface CurrentWeekTemplate { current_week: { part1: PartAssignment; part2: PartAssignment } }
```

- 런타임 검증: `zod`로 import 데이터 Validate → Store로 반영

## 상태 관리

- `store.ts`에 핵심 상태: `weeks`, `members`, `currentWeekDate`, `currentDraft`(이번주 템플릿), `theme`
- 액션: 멤버 배정/해제, 불참 등록/삭제, 데이터 import/export, 경고 재계산, 로컬 저장 동기화

## 배정 UI(DnD)

- `@dnd-kit`로 멤버 리스트 → 역할 셀 드래그 앤 드롭
- 1부/2부 테이블 표시, 사이드 2칸 고정 셀 구성
- 실시간 경고 배지(셀/상단 패널)에 표시

## 경고 규칙(TypeScript)

- 직전 주 동일 직무 연속 배정 감지
- 자막의 1부·2부 동일 인원 배정 감지
- 사이드 인원 부족(2명 미만) 감지
- 결과: `Warning { id, level, message, target: {date, part, role} }[]`

## 불참자 캘린더

- FullCalendar + DayGrid. 일요일만 활성화: 날짜 클릭 → 모달에서 불참자 추가/편집
- 선택 주의 불참 정보가 배정 페이지에 마킹

## 통계(Plotly)

- 팀원별 직무 비율, 주차별 변동, 누적 편중, 불참 패턴 차트 제공
- 필터(기간/팀원) 지원

## 저장(로컬&파일)

- 로컬: `localStorage`에 앱 상태(버전 포함) 자동 저장/복원
- 파일: Tauri `dialog` + `fs` API로 JSON Import/Export

## 테마

- CSS 변수 기반 라이트/다크 전환. 상단 토글 + `data-theme` 적용

## 라우팅/쉘

- 상단 탭/사이드바 내비게이션, 각 페이지 마운트 시 상태 동기화

## 실행/빌드

- 개발: `npm run tauri dev`
- 빌드: `npm run tauri build`

## 2차(미포함, 참고)

- Python 분석 모듈을 Tauri Commands(Rust 바인딩)로 연결, 규칙/통계 이전

### To-dos

- [ ] Tauri + React + TS 프로젝트 스캐폴드 생성
- [ ] 의존성 설치(@dnd-kit, zustand, plotly, fullcalendar, zod 등)
- [ ] 데이터 타입과 zod 스키마 정의
- [ ] Zustand 스토어/액션/로컬스토리지 복원 작성
- [ ] App Shell/네비게이션/페이지 라우팅 구성
- [ ] 배정 보드/멤버 리스트 DnD UI 구현
- [ ] 경고 규칙 로직과 UI 배지/패널 구현
- [ ] FullCalendar 일요일 전용 불참 관리 구현
- [ ] Plotly 통계 페이지 구현
- [ ] Tauri dialog/fs로 JSON Import/Export 구현
- [ ] 상태 자동 저장/복원/마이그레이션 버전 관리
- [ ] CSS 변수 기반 다크 모드 토글 구현
- [ ] UX 마감, 기본 단어/도구팁/단축키 정리
- [ ] 앱 빌드/아이콘/간단 사용법 README 반영