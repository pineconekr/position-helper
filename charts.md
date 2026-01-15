# 삭제된 ECharts 시각화 문서

> 이 문서는 2026-01-14에 삭제된 ECharts 기반 차트 컴포넌트들을 기록합니다.

## 삭제된 컴포넌트 목록

### 1. FairnessIndicators.vue
**차트 유형:** Gauge (게이지 차트)

**기능:**
- 공정성 점수를 반원형 게이지로 시각화 (0-100점)
- 점수에 따른 색상 변화 (poor/fair/good/excellent)
- 4가지 세부 지표 표시:
  - 배정 기회 균등성
  - 역할 다양성
  - 부담도 균형
  - 연속 배정 회피

**ECharts 옵션:**
```javascript
{
  series: [{
    type: 'gauge',
    startAngle: 180,
    endAngle: 0,
    min: 0,
    max: 100,
    radius: '100%',
    center: ['50%', '75%'],
    // ... pointer, axisLine 등
  }]
}
```

---

### 2. MemberRoleDistribution.vue
**차트 유형:** Stacked Bar (누적 막대 차트)

**기능:**
- 팀원별 역할 배정 횟수를 누적 막대로 시각화
- 역할별 색상 구분 (SW, 자막, 고정, 사이드, 스케치)
- 정렬 옵션: 이름순, 배정순, 참여율순

**역할별 색상:**
- SW: #3b82f6 (파랑)
- 자막: #10b981 (초록)
- 고정: #f59e0b (주황)
- 사이드: #8b5cf6 (보라)
- 스케치: #ec4899 (분홍)

**ECharts 옵션:**
```javascript
{
  xAxis: { type: 'category', data: memberNames },
  yAxis: { type: 'value' },
  series: RoleKeys.map(role => ({
    name: role,
    type: 'bar',
    stack: 'total',
    data: memberRoleCounts
  }))
}
```

---

### 3. AssignmentDeviationChart.vue
**차트 유형:** Custom Scatter (커스텀 스캐터 차트)

**기능:**
- 배정 편차 분석 (-100% ~ +100%)
- X축: 편차 (과소배정 ~ 과다배정)
- 커스텀 렌더링으로 말풍선 형태 표시
- 필터: 전체, SW, 자막, 고정, 사이드, 스케치
- 신입 멤버 토글

**편차 색상:**
- 과소배정 (< -10%): 빨강
- 보통 (-10% ~ +10%): 초록
- 과다배정 (> +10%): 주황

**ECharts 옵션:**
```javascript
{
  xAxis: { type: 'value', min: -100, max: 100 },
  yAxis: { type: 'value', show: false },
  series: [{
    type: 'custom',
    renderItem: (params, api) => { /* 커스텀 렌더링 */ }
  }],
  graphic: [/* 중앙선, 라벨 등 */]
}
```

---

### 4. ActivityTimeline.vue
**차트 유형:** Custom Heatmap (커스텀 히트맵)

**기능:**
- 주차별 팀원 활동 현황 매트릭스
- X축: 주차 날짜
- Y축: 팀원 이름
- 셀 색상: 역할별 색상 또는 불참 표시
- 상단 통계: 총 배정, 불참, 연속 배정 경고

**상태 아이콘:**
- 배정됨: 역할별 색상 원형
- 불참: X 마크
- 연속 배정: 느낌표 마크

**ECharts 옵션:**
```javascript
{
  xAxis: { type: 'category', data: weekDates },
  yAxis: { type: 'category', data: memberNames, inverse: true },
  series: [{
    type: 'custom',
    renderItem: (params, api) => { /* 커스텀 셀 렌더링 */ }
  }]
}
```

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

## 관련 유틸리티 파일 (유지)
- `src/features/stats/utils/chartTheme.ts` - 차트 테마 색상
- `src/features/stats/utils/statsCalculations.ts` - 통계 계산 로직
- `src/features/stats/utils/timelineCalculations.ts` - 타임라인 데이터 계산

---

## 의존성 제거
```json
// package.json에서 제거할 패키지
"echarts": "^5.5.1",
"vue-echarts": "^7.0.3"
```
