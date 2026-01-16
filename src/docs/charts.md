# 삭제된 ECharts 시각화 문서

> 이 문서는 2026-01-14에 삭제된 ECharts 기반 차트 컴포넌트들을 기록합니다.

## 삭제된 컴포넌트 목록

### 1. FairnessIndicators.vue
**차트 유형:** Gauge (게이지 차트)

**기능:**
- 공정성 점수를 시각화 (0-100점)
- 4가지 세부 지표(배정 기회, 역할 다양성, 부담도, 연속 배정) 표시

---

### 2. MemberRoleDistribution.vue
**차트 유형:** Stacked Bar (누적 막대 차트)

**기능:**
- 팀원별 역할 배정 횟수를 누적 막대로 시각화
- 정렬 옵션: 이름순, 배정순, 참여율순

---

### 3. AssignmentDeviationChart.vue
**차트 유형:** Scatter (스캐터 차트)

**기능:**
- 배정 편차 분석 (-100% ~ +100%)
- 필터: 전체, 역할별, 신입 멤버 토글

---

### 4. ActivityTimeline.vue
**차트 유형:** Heatmap (히트맵) 

**기능:**
- 주차별 팀원 활동 현황 매트릭스
- 상단 통계: 총 배정, 불참, 연속 배정 경고

---

## 추가 제안 시각화 (New Proposals)

### 1. Part & Role Bias (부서 및 역할 편중도)
**분석 목적:**
- 특정 인원이 **1부 vs 2부** 중 특정 시간대에 편중되어 배정되는지 확인 
- 특정 인원이 **특정 역할**(SW, 자막 등)만 반복적으로 수행하는지 확인 (출석대비 역할 수행 횟수로 해야하나? 더 좋은 지표가 있나?)

### 2. Cohort Analysis (기수별 통계)
**분석 목적:**
- 이름 앞의 숫자(학번/기수)를 파싱하여 그룹별 역할 점유율 분석
- **기수별 역할 점유율** 확인 (예: 고학번이 주로 어떤 역할을 맡는지 확인)

---

## 삭제된 파일 목록

### Vue 컴포넌트
- `src/features/stats/components/ActivityTimeline.vue`
- `src/features/stats/components/AssignmentDeviationChart.vue`
- `src/features/stats/components/FairnessIndicators.vue`
- `src/features/stats/components/MemberRoleDistribution.vue`

### ECharts 설정
- `src/lib/echarts-setup.ts`

### React 컴포넌트 (레거시)
- `src/features/stats/components/ActivityTimeline.tsx`
- `src/features/stats/components/AssignmentDeviationChart.tsx`
- `src/features/stats/components/MemberRoleDistribution.tsx`

---

## 의존성 제거
- `echarts`
- `vue-echarts`
