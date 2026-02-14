<script setup lang="ts">
/**
 * AbsenceChart.vue - Bullet Chart 버전
 * 
 * Stephen Few의 Bullet Chart 디자인 원칙 적용:
 * - 배경 영역: 성능 범위 (양호/주의/위험)
 * - 전경 막대: 실제 값
 * - 기준선: 평균 또는 목표값
<script setup lang="ts">
/**
 * AbsenceChart.vue - Bullet Chart 버전
 * 
 * Stephen Few의 Bullet Chart 디자인 원칙 적용:
 * - 배경 영역: 성능 범위 (양호/주의/위험)
 * - 전경 막대: 실제 값
 * - 기준선: 평균 또는 목표값
 */
import { computed } from 'vue'
import BaseChart from '@/shared/components/charts/BaseChart.vue'
import { useStats } from '../composables/useStats'
import { useThemeStore } from '@/stores/theme'
import { getChartSeriesPalette, getChartUiPalette, withAlpha } from '@/shared/utils/chartTheme'
import { escapeHtml } from '@/shared/utils/text'
type AxisTooltipParam = { seriesName: string; value: number; name: string; marker: string }
type Thresholds = { warning: number; danger: number }
type ChartOptionWithThresholds = { _thresholds?: Thresholds }

const { stats } = useStats()
const themeStore = useThemeStore()

// 색상 테마
const colors = computed(() => {
  const isDark = themeStore.effectiveTheme === 'dark'
  const ui = getChartUiPalette()
  const series = getChartSeriesPalette()
  return {
    isDark,
    text: ui.text,
    textStrong: ui.textStrong,
    border: ui.border,
    // Bullet Chart 배경 영역 (3단계)
    rangeGood: withAlpha(series.success, isDark ? 0.18 : 0.12),
    rangeWarning: withAlpha(series.warning, isDark ? 0.22 : 0.16),
    rangeDanger: withAlpha(series.danger, isDark ? 0.24 : 0.18),
    // 실제 값 막대
    barPrimary: series.primary,
    barWarning: series.warning,
    barDanger: series.danger,
    // 기준선
    targetLine: ui.textStrong,
    avgLine: ui.text,
    statusGood: series.success,
    statusWarning: series.warning,
    statusDanger: series.danger,
  }
})

function computeThresholds(values: number[]): Thresholds {
  if (values.length === 0) return { warning: 2, danger: 3 }
  const n = values.length
  const q2 = values[Math.floor(n * 0.5)]
  const q3 = values[Math.floor(n * 0.75)]
  const warning = Math.max(q2, 1)
  const danger = Math.max(q3, warning + 1)
  return { warning, danger }
}

const chartOption = computed(() => {
  const c = colors.value
  
  // 데이터 준비 (Top 10, 역순 정렬)
  const rawData = stats.value.absenceRanking.slice(0, 10).reverse()
  
  if (rawData.length === 0) return {}

  // 통계 계산 (IQR 기반 동적 임계값)
  const values = rawData.map(i => i.value).sort((a, b) => a - b)
  const n = values.length
  const { warning: thresholdWarning, danger: thresholdDanger } = computeThresholds(values)
  const avg = values.reduce((a, b) => a + b, 0) / n
  const maxValue = Math.max(...values)
  
  // X축 최대값 (여유 공간 확보)
  const xMax = Math.max(maxValue + 2, thresholdDanger + 2)

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: getChartUiPalette().surface,
      borderColor: c.border,
      borderWidth: 1,
      padding: [12, 16],
      textStyle: { color: c.textStrong, fontSize: 14 },
      formatter: (params: AxisTooltipParam[]) => {
        const item = params.find((p) => p.seriesName === '불참 횟수')
        if (!item) return ''
        const safeName = escapeHtml(item.name)
        const value = item.value
        // HTML 기반 상태 표시 (이모지 대신 일관된 스타일)
        const statusConfig = value >= thresholdDanger 
          ? { color: c.statusDanger, label: '주의 필요' }
          : value >= thresholdWarning 
            ? { color: c.statusWarning, label: '관찰 대상' }
            : { color: c.statusGood, label: '양호' }
        const statusHtml = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${statusConfig.color};margin-right:6px;"></span>${statusConfig.label}`
        const avgDiff = value - avg
        const avgText = avgDiff > 0 
          ? `평균 대비 +${avgDiff.toFixed(1)}회` 
          : avgDiff < 0 
            ? `평균 대비 ${avgDiff.toFixed(1)}회`
            : '평균과 동일'
        
        return `
          <div style="font-weight: 600; margin-bottom: 8px; font-size: 14px;">${safeName}</div>
          <div style="display: flex; justify-content: space-between; gap: 24px; margin-bottom: 4px;">
            <span style="opacity: 0.7;">불참 횟수</span>
            <span style="font-weight: 700; font-size: 16px;">${value}회</span>
          </div>
          <div style="font-size: 12px; opacity: 0.6; margin-bottom: 8px;">${avgText}</div>
          <div style="padding-top: 8px; border-top: 1px solid ${c.border}; font-size: 13px; font-weight: 500;">
            ${statusHtml}
          </div>
        `
      }
    },
    grid: {
      top: 30,
      left: 20,
      right: 60,
      bottom: 30,
      containLabel: true
    },
    xAxis: {
      type: 'value',
      max: xMax,
      splitLine: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { 
        color: c.text,
        fontSize: 12,
        formatter: '{value}회'
      }
    },
    yAxis: {
      type: 'category',
      data: rawData.map(i => i.name),
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: { 
        color: c.text,
        fontWeight: 500,
        fontSize: 13,
        width: 60,
        overflow: 'truncate'
      }
    },
    series: [
      // 배경 영역 1: 위험 범위 (전체)
      {
        name: '위험 범위',
        type: 'bar',
        barGap: '-100%',
        barWidth: 24,
        data: rawData.map(() => xMax),
        itemStyle: {
          color: c.rangeDanger,
          borderRadius: [0, 4, 4, 0]
        },
        z: 1,
        silent: true
      },
      // 배경 영역 2: 주의 범위
      {
        name: '주의 범위',
        type: 'bar',
        barGap: '-100%',
        barWidth: 24,
        data: rawData.map(() => thresholdDanger),
        itemStyle: {
          color: c.rangeWarning,
          borderRadius: [0, 4, 4, 0]
        },
        z: 2,
        silent: true
      },
      // 배경 영역 3: 양호 범위
      {
        name: '양호 범위',
        type: 'bar',
        barGap: '-100%',
        barWidth: 24,
        data: rawData.map(() => thresholdWarning),
        itemStyle: {
          color: c.rangeGood,
          borderRadius: [0, 4, 4, 0]
        },
        z: 3,
        silent: true
      },
      // 실제 값 막대
      {
        name: '불참 횟수',
        type: 'bar',
        barGap: '-100%',
        barWidth: 10,
        data: rawData.map(i => ({
          value: i.value,
          itemStyle: {
            color: i.value >= thresholdDanger 
              ? c.barDanger 
              : i.value >= thresholdWarning 
                ? c.barWarning 
                : c.barPrimary,
            borderRadius: [0, 3, 3, 0],
            shadowBlur: i.value >= thresholdDanger ? 6 : 0,
            shadowColor: i.value >= thresholdDanger ? withAlpha(c.statusDanger, 0.4) : 'transparent'
          }
        })),
        z: 5,
        label: {
          show: true,
          position: 'right',
          distance: 8,
          color: c.textStrong,
          fontWeight: 600,
          fontSize: 13,
          formatter: '{c}'
        },
        // 평균 기준선
        markLine: {
          silent: true,
          symbol: ['none', 'none'],
          lineStyle: {
            color: c.avgLine,
            width: 2,
            type: 'solid'
          },
          label: {
            show: true,
            position: 'end',
            formatter: `평균 ${avg.toFixed(1)}`,
            color: c.text,
            fontSize: 11,
            fontWeight: 500,
            backgroundColor: getChartUiPalette().surface,
            padding: [2, 6],
            borderRadius: 3
          },
          data: [{ xAxis: avg }]
        }
      }
    ],
    animation: true,
    animationDuration: 800,
    animationEasing: 'cubicOut',
    // 동적 임계값 정보 (범례용)
    _thresholds: { warning: thresholdWarning, danger: thresholdDanger }
  }
})

// 범례용 임계값 (computed 외부 접근용)
const thresholds = computed(() => {
  const opt = chartOption.value as ChartOptionWithThresholds
  return opt?._thresholds ?? { warning: 2, danger: 3 }
})
</script>

<template>
  <div class="h-full px-1 py-1">
    <div class="pb-1.5">
      <div class="flex justify-between items-start">
        <div>
          <h4 class="text-2xl font-semibold text-foreground">최다 불참자 (Top 10)</h4>
          <p class="mt-1 text-sm text-muted-foreground">
            누적 불참 횟수 — Bullet Chart로 임계치 대비 현황 파악
          </p>
        </div>
        <!-- 동적 범례 -->
        <div class="flex items-center gap-3 text-sm font-medium">
          <span class="flex items-center gap-1.5">
            <span class="w-3 h-1.5 rounded-full" :style="{ backgroundColor: colors.rangeGood }"></span>
            <span class="text-muted-foreground">~{{ thresholds.warning }}</span>
          </span>
          <span class="flex items-center gap-1.5">
            <span class="w-3 h-1.5 rounded-full" :style="{ backgroundColor: colors.rangeWarning }"></span>
            <span class="text-muted-foreground">{{ thresholds.warning + 1 }}~{{ thresholds.danger }}</span>
          </span>
          <span class="flex items-center gap-1.5">
            <span class="w-3 h-1.5 rounded-full" :style="{ backgroundColor: colors.rangeDanger }"></span>
            <span class="text-muted-foreground">{{ thresholds.danger }}+</span>
          </span>
        </div>
      </div>
    </div>
    <div class="pt-0">
      <div class="h-[380px] w-full">
        <BaseChart 
          v-if="stats.absenceRanking.length > 0" 
          :options="chartOption" 
          height="100%" 
        />
        <div 
          v-else 
          class="h-full flex items-center justify-center text-muted-foreground text-sm"
        >
          불참 데이터가 없습니다.
        </div>
      </div>
    </div>
  </div>
</template>
