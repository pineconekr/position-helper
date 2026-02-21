<script setup lang="ts">
import { computed } from 'vue'
import BaseChart from '@/shared/components/charts/BaseChart.vue'
import { useStats } from '../composables/useStats'
import { useThemeStore } from '@/stores/theme'
import { getChartSeriesPalette, getChartUiPalette, withAlpha } from '@/shared/utils/chartTheme'
import { STATS_CONFIG } from '@/shared/constants/config'

type AxisTooltipParam = { axisValue: string; seriesName: string; value: number; marker: string }

const { stats } = useStats()
const themeStore = useThemeStore()

const colors = computed(() => {
  const isDark = themeStore.effectiveTheme === 'dark'
  const ui = getChartUiPalette()
  const series = getChartSeriesPalette()

  return {
    isDark,
    text: ui.text,
    textStrong: ui.textStrong,
    surface: ui.surface,
    grid: ui.grid,
    border: ui.border,
    absence: series.danger,
    absenceMA: withAlpha(series.danger, isDark ? 0.7 : 0.8),
    cv: series.warning,
    cvThreshold: series.success,
  }
})

const chartOption = computed(() => {
  const c = colors.value
  const weeklyData = stats.value.weeklyFairness
  if (weeklyData.length === 0) return {}

  const cvThreshold = STATS_CONFIG.FAIRNESS_CV_BALANCE_THRESHOLD
  const dates = weeklyData.map((d) => d.date)
  const absenceCounts = weeklyData.map((d) => d.absenceCount)
  const cvValues = weeklyData.map((d) => Number(d.cv.toFixed(3)))

  const absenceMA = weeklyData.map((_, i) => {
    const window = weeklyData.slice(Math.max(0, i - 3), i + 1)
    const sum = window.reduce((acc, w) => acc + w.absenceCount, 0)
    return window.length ? Number((sum / window.length).toFixed(1)) : 0
  })

  const enableZoom = weeklyData.length > 12
  const startPct = Math.max(0, 100 - Math.min(100, (12 / weeklyData.length) * 100))
  const cvCeiling = Math.max(cvThreshold + 0.1, ...cvValues, 1)

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'line',
        link: [{ xAxisIndex: [0, 1] }],
      },
      backgroundColor: c.surface,
      borderColor: c.border,
      borderWidth: 1,
      padding: [12, 16],
      textStyle: { color: c.textStrong, fontSize: 13 },
      formatter: (params: AxisTooltipParam[]) => {
        if (!params || params.length === 0) return ''
        const date = params[0].axisValue
        const absencePoint = params.find((p) => p.seriesName === '불참자 수')
        const maPoint = params.find((p) => p.seriesName === '불참 4주 이동평균')
        const cvPoint = params.find((p) => p.seriesName === '배정 변동계수(CV)')

        return `
          <div style="font-weight: 600; margin-bottom: 8px;">${date}</div>
          <div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;">
            ${absencePoint?.marker ?? ''}
            <span style="flex: 1; opacity: 0.8;">불참자 수</span>
            <span style="font-weight: 600;">${absencePoint ? Number(absencePoint.value).toFixed(0) : '-'}명</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;">
            ${maPoint?.marker ?? ''}
            <span style="flex: 1; opacity: 0.8;">불참 4주 이동평균</span>
            <span style="font-weight: 600;">${maPoint ? Number(maPoint.value).toFixed(1) : '-'}명</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;">
            ${cvPoint?.marker ?? ''}
            <span style="flex: 1; opacity: 0.8;">배정 변동계수(CV)</span>
            <span style="font-weight: 600;">${cvPoint ? Number(cvPoint.value).toFixed(3) : '-'}</span>
          </div>
        `
      }
    },
    legend: {
      data: ['불참자 수', '불참 4주 이동평균', '배정 변동계수(CV)'],
      top: 0,
      left: 0,
      icon: 'circle',
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 14,
      textStyle: { color: c.text, fontWeight: 500, fontSize: 12 },
    },
    grid: [
      {
        top: 42,
        left: 50,
        right: 24,
        height: 110,
      },
      {
        top: 196,
        left: 50,
        right: 24,
        bottom: enableZoom ? 52 : 28,
      }
    ],
    dataZoom: enableZoom
      ? [
          {
            type: 'inside',
            xAxisIndex: [0, 1],
            start: startPct,
            end: 100,
            filterMode: 'none'
          },
          {
            type: 'slider',
            xAxisIndex: [0, 1],
            start: startPct,
            end: 100,
            height: 14,
            bottom: 8,
            brushSelect: false,
            borderColor: 'transparent',
            backgroundColor: withAlpha(c.text, c.isDark ? 0.2 : 0.08),
            fillerColor: withAlpha(c.absence, c.isDark ? 0.28 : 0.16),
            handleSize: 0,
          }
        ]
      : undefined,
    xAxis: [
      {
        type: 'category',
        gridIndex: 0,
        data: dates,
        axisLabel: { show: false },
        axisTick: { show: false },
        axisLine: { lineStyle: { color: c.grid } }
      },
      {
        type: 'category',
        gridIndex: 1,
        data: dates,
        axisLabel: {
          color: c.text,
          fontSize: 12,
          rotate: weeklyData.length > 8 ? 45 : 0,
        },
        axisTick: { show: false },
        axisLine: { lineStyle: { color: c.grid } }
      }
    ],
    yAxis: [
      {
        type: 'value',
        gridIndex: 0,
        name: '불참(명)',
        nameTextStyle: { color: c.absence, fontWeight: 700, padding: [0, 0, 8, 0] },
        axisLabel: { color: c.text, fontSize: 12 },
        axisLine: { show: true, lineStyle: { color: c.absence } },
        splitLine: {
          lineStyle: {
            color: c.grid,
            type: 'dashed',
            opacity: 0.45
          }
        }
      },
      {
        type: 'value',
        gridIndex: 1,
        name: 'CV',
        min: 0,
        max: cvCeiling,
        nameTextStyle: { color: c.cv, fontWeight: 700, padding: [0, 0, 8, 0] },
        axisLabel: {
          color: c.cv,
          fontSize: 12,
          formatter: (val: number) => val.toFixed(1)
        },
        axisLine: { show: true, lineStyle: { color: c.cv } },
        splitLine: {
          lineStyle: {
            color: c.grid,
            type: 'dashed',
            opacity: 0.4
          }
        }
      }
    ],
    series: [
      {
        name: '불참자 수',
        type: 'bar',
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: absenceCounts,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: withAlpha(c.absence, c.isDark ? 0.76 : 0.62) },
              { offset: 1, color: c.absence }
            ]
          },
          borderRadius: [4, 4, 0, 0]
        },
        barWidth: '44%'
      },
      {
        name: '불참 4주 이동평균',
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: absenceMA,
        smooth: true,
        symbol: 'none',
        lineStyle: {
          color: c.absenceMA,
          width: 2,
          type: 'dashed'
        }
      },
      {
        name: '배정 변동계수(CV)',
        type: 'line',
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: cvValues,
        symbol: 'circle',
        symbolSize: 7,
        itemStyle: { color: c.cv },
        lineStyle: { color: c.cv, width: 2.5 },
        markArea: {
          silent: true,
          itemStyle: {
            color: withAlpha(c.cv, c.isDark ? 0.12 : 0.08)
          },
          data: [[
            { yAxis: cvThreshold },
            { yAxis: cvCeiling }
          ]]
        },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: {
            color: c.cvThreshold,
            width: 2,
            type: 'dashed'
          },
          label: {
            show: true,
            position: 'insideEndTop',
            formatter: `균형선 ${cvThreshold}`,
            color: c.cvThreshold,
            fontSize: 12,
            fontWeight: 'bold'
          },
          data: [{ yAxis: cvThreshold }]
        }
      }
    ],
    animation: true,
    animationDuration: 700,
    animationEasing: 'cubicOut'
  }
})
</script>

<template>
  <div class="h-full px-0.5 py-0.5">
    <div class="pb-1">
      <div class="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 class="chart-title">주간 불참 & 공정성 분석</h4>
          <p class="chart-subtitle mt-0.5">
            상단은 불참 추세, 하단은 CV를 분리해 공정성 신호를 읽습니다.
          </p>
        </div>
        <div class="chart-meta">
          질문: CV가 {{ STATS_CONFIG.FAIRNESS_CV_BALANCE_THRESHOLD }} 이상인 주가 연속되는가?
        </div>
      </div>
    </div>
    <div class="pt-0">
      <div class="h-[320px] w-full sm:h-[370px]">
        <BaseChart
          v-if="stats.weeklyFairness.length > 0"
          :options="chartOption"
          height="100%"
        />
        <div
          v-else
          class="h-full flex items-center justify-center text-[var(--color-label-tertiary)] text-sm"
        >
          분석할 주간 데이터가 없습니다.
        </div>
      </div>
    </div>
  </div>
</template>
