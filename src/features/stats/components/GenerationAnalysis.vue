<script setup lang="ts">
import { computed } from 'vue'
import BaseChart from '@/shared/components/charts/BaseChart.vue'
import { useStats } from '../composables/useStats'
import { useThemeStore } from '@/stores/theme'
import { getChartSeriesPalette, getChartUiPalette, withAlpha } from '@/shared/utils/chartTheme'
type AxisTooltipParam = { axisValue: string; seriesName: string; value: number }

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
    grid: ui.grid,
    axisLine: ui.border,
    border: ui.border,
    // 시리즈 색상
    assignment: series.primary,
    assignmentLight: withAlpha(series.primary, isDark ? 0.2 : 0.1),
    absence: series.danger,
    absenceLight: withAlpha(series.danger, isDark ? 0.15 : 0.08)
  }
})

const chartOption = computed(() => {
  const c = colors.value
  const data = stats.value.generationAnalysis
  
  if (data.length === 0) return {}

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      backgroundColor: getChartUiPalette().surface,
      borderColor: c.border,
      borderWidth: 1,
      padding: [12, 16],
      textStyle: { color: c.textStrong, fontSize: 14 },
      formatter: (params: AxisTooltipParam[]) => {
        if (!params || params.length === 0) return ''
        const label = params[0].axisValue
        let html = `<div style="font-weight: 600; margin-bottom: 8px;">${label}</div>`
        params.forEach(p => {
          const color = p.seriesName === '평균 배정' ? c.assignment : c.absence
          html += `
            <div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;">
              <span style="width: 10px; height: 10px; border-radius: 50%; background: ${color};"></span>
              <span style="flex: 1; opacity: 0.8;">${p.seriesName}</span>
              <span style="font-weight: 600;">${p.value}회</span>
            </div>
          `
        })
        return html
      }
    },
    legend: {
      data: ['평균 배정', '평균 불참'],
      bottom: 0,
      textStyle: { color: c.text, fontWeight: 500, fontSize: 12 },
      icon: 'circle',
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 20
    },
    grid: {
      top: 40,
      left: 20,
      right: 20,
      bottom: 50,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.map(d => `${d.generation}기 (${d.memberCount}명)`),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: c.axisLine } },
      axisLabel: { 
        color: c.text, 
        fontSize: 13,
        fontWeight: 500
      }
    },
    yAxis: [
      {
        type: 'value',
        name: '배정',
        position: 'left',
        nameTextStyle: { color: c.assignment, fontWeight: 'bold', padding: [0, 30, 0, 0] },
        splitLine: { 
          lineStyle: { 
            color: c.grid,
            type: 'dashed'
          } 
        },
        axisLabel: { color: c.text, fontSize: 12 },
        axisLine: { show: true, lineStyle: { color: c.assignment } }
      },
      {
        type: 'value',
        name: '불참',
        position: 'right',
        nameTextStyle: { color: c.absence, fontWeight: 'bold', padding: [0, 0, 0, 30] },
        splitLine: { show: false },
        axisLabel: { color: c.text, fontSize: 12 },
        axisLine: { show: true, lineStyle: { color: c.absence } }
      }
    ],
    series: [
      {
        name: '평균 배정',
        type: 'bar',
        data: data.map(d => d.avgAssignment),
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: withAlpha(c.assignment, c.isDark ? 0.75 : 0.6) },
              { offset: 1, color: c.assignment }
            ]
          },
          borderRadius: [6, 6, 0, 0]
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: withAlpha(c.assignment, 0.4)
          }
        },
        barWidth: '50%',
        yAxisIndex: 0
      },
      {
        name: '평균 불참',
        type: 'line',
        data: data.map(d => d.avgAbsence),
        itemStyle: { color: c.absence },
        lineStyle: {
          width: 3,
          color: c.absence
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: c.absenceLight },
              { offset: 1, color: 'transparent' }
            ]
          }
        },
        symbol: 'circle',
        symbolSize: 10,
        emphasis: {
          scale: 1.5
        },
        yAxisIndex: 1
      }
    ],
    animation: true,
    animationDuration: 800,
    animationEasing: 'cubicOut'
  }
})
</script>

<template>
  <div class="h-full px-1 py-1">
    <div class="pb-1.5">
      <h4 class="text-2xl font-semibold text-foreground">기수별 활동 분석</h4>
      <p class="mt-1 text-sm text-muted-foreground">
        기수별 평균 배정 횟수와 성실도를 비교합니다
      </p>
    </div>
    <div class="pt-0">
      <div class="h-[360px] w-full">
        <BaseChart 
          v-if="stats.generationAnalysis.length > 0"
          :options="chartOption" 
          height="100%" 
        />
        <div 
          v-else 
          class="h-full flex items-center justify-center text-[var(--color-label-tertiary)] text-sm"
        >
          기수 분석 데이터가 충분하지 않습니다.
        </div>
      </div>
    </div>
  </div>
</template>
