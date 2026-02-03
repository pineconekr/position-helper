<script setup lang="ts">
import { computed } from 'vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import BaseChart from '@/shared/components/charts/BaseChart.vue'
import { useStats } from '../composables/useStats'
import { useThemeStore } from '@/stores/theme'

const { stats } = useStats()
const themeStore = useThemeStore()

// 색상 테마
const colors = computed(() => {
  const isDark = themeStore.effectiveTheme === 'dark'
  return {
    isDark,
    text: isDark ? '#94a3b8' : '#64748b',
    textStrong: isDark ? '#e2e8f0' : '#334155',
    grid: isDark ? '#334155' : '#e2e8f0',
    // 시리즈 색상
    absence: '#ef4444',
    absenceLight: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)',
    absenceMA: '#f87171',
    cv: '#f59e0b',
    cvLight: isDark ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.08)',
    // 임계선
    cvThreshold: isDark ? '#22c55e' : '#16a34a'
  }
})

const chartOption = computed(() => {
  const c = colors.value
  const weeklyData = stats.value.weeklyFairness
  
  if (weeklyData.length === 0) return {}

  // Calculate 4-week moving average for absences
  const absenceMA = weeklyData.map((_, i) => {
    const window = weeklyData.slice(Math.max(0, i - 3), i + 1)
    const sum = window.reduce((acc, w) => acc + w.absenceCount, 0)
    return window.length ? Number((sum / window.length).toFixed(1)) : 0
  })

  // CV 임계값 (0.5 이상이면 불균형)
  const cvThreshold = 0.5

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      backgroundColor: c.isDark ? '#1e293b' : '#ffffff',
      borderColor: c.isDark ? '#475569' : '#e2e8f0',
      borderWidth: 1,
      padding: [12, 16],
      textStyle: { color: c.textStrong },
      formatter: (params: any[]) => {
        if (!params || params.length === 0) return ''
        const date = params[0].axisValue
        let html = `<div style="font-weight: 600; margin-bottom: 8px;">${date}</div>`
        params.forEach(p => {
          const isCV = p.seriesName.includes('CV')
          const value = isCV ? p.value.toFixed(3) : p.value
          const unit = isCV ? '' : '명'
          html += `
            <div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;">
              ${p.marker}
              <span style="flex: 1; opacity: 0.8;">${p.seriesName}</span>
              <span style="font-weight: 600;">${value}${unit}</span>
            </div>
          `
        })
        return html
      }
    },
    grid: {
      top: 50,
      right: 60,
      bottom: 30,
      left: 50,
      containLabel: true
    },
    legend: {
      data: ['불참자 수', '불참 4주 이동평균', '배정 변동계수(CV)'],
      top: 0,
      textStyle: { color: c.text, fontWeight: 500 },
      icon: 'circle',
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 16
    },
    xAxis: {
      type: 'category',
      data: weeklyData.map(d => d.date),
      axisLabel: { 
        color: c.text,
        fontSize: 11,
        rotate: weeklyData.length > 8 ? 45 : 0
      },
      axisLine: { lineStyle: { color: c.grid } },
      axisTick: { show: false }
    },
    yAxis: [
      {
        type: 'value',
        name: '불참자',
        position: 'left',
        nameTextStyle: { color: c.absence, fontWeight: 'bold', padding: [0, 30, 0, 0] },
        alignTicks: true,
        axisLabel: { color: c.text },
        splitLine: { 
          lineStyle: { 
            color: c.grid,
            type: 'dashed',
            opacity: 0.5
          } 
        },
        axisLine: { show: true, lineStyle: { color: c.absence } }
      },
      {
        type: 'value',
        name: 'CV',
        position: 'right',
        nameTextStyle: { color: c.cv, fontWeight: 'bold', padding: [0, 0, 0, 30] },
        alignTicks: true,
        axisLabel: { 
          color: c.cv, 
          formatter: (val: number) => val.toFixed(1)
        },
        axisLine: { show: true, lineStyle: { color: c.cv } },
        splitLine: { show: false }
      }
    ],
    series: [
      {
        name: '불참자 수',
        type: 'bar',
        data: weeklyData.map(d => d.absenceCount),
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#f87171' },
              { offset: 1, color: '#ef4444' }
            ]
          },
          borderRadius: [4, 4, 0, 0]
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 8,
            shadowColor: 'rgba(239, 68, 68, 0.4)'
          }
        },
        barWidth: '40%',
        yAxisIndex: 0
      },
      {
        name: '불참 4주 이동평균',
        type: 'line',
        data: absenceMA,
        smooth: true,
        lineStyle: {
          color: c.absenceMA,
          type: 'dashed',
          width: 2
        },
        symbol: 'none',
        yAxisIndex: 0
      },
      {
        name: '배정 변동계수(CV)',
        type: 'line',
        data: weeklyData.map(d => Number(d.cv.toFixed(3))),
        itemStyle: { color: c.cv },
        lineStyle: { width: 3, color: c.cv },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: c.cvLight },
              { offset: 1, color: 'transparent' }
            ]
          }
        },
        symbol: 'circle',
        symbolSize: 8,
        emphasis: { scale: 1.5 },
        yAxisIndex: 1,
        // CV 경고 임계선
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
            formatter: '균형 (0.5)',
            color: c.cvThreshold,
            fontSize: 10,
            fontWeight: 'bold'
          },
          data: [{ yAxis: cvThreshold }]
        }
      }
    ],
    animation: true,
    animationDuration: 800,
    animationEasing: 'cubicOut'
  }
})
</script>

<template>
  <Card class="h-full overflow-hidden">
    <CardHeader class="pb-2">
      <div class="flex justify-between items-start">
        <div>
          <CardTitle class="text-base font-semibold">주간 불참 & 공정성 분석</CardTitle>
          <CardDescription class="mt-1">
            주차별 불참 추세와 배정 변동계수(CV) 변화를 비교합니다
          </CardDescription>
        </div>
        <div class="text-xs text-[var(--color-label-tertiary)]">
          CV &lt; 0.5 = 균형
        </div>
      </div>
    </CardHeader>
    <CardContent class="pt-0">
      <div class="h-[350px] w-full">
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
    </CardContent>
  </Card>
</template>
