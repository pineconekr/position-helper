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
    grid: isDark ? '#334155' : '#f1f5f9',
    axisLine: isDark ? '#334155' : '#e2e8f0',
    // 시리즈 색상
    assignment: '#3b82f6',
    assignmentLight: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
    absence: '#ef4444',
    absenceLight: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)'
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
      backgroundColor: c.isDark ? '#1e293b' : '#ffffff',
      borderColor: c.isDark ? '#475569' : '#e2e8f0',
      borderWidth: 1,
      padding: [12, 16],
      textStyle: { color: c.textStrong },
      formatter: (params: any[]) => {
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
      textStyle: { color: c.text, fontWeight: 500 },
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
        fontSize: 12,
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
        axisLabel: { color: c.text },
        axisLine: { show: true, lineStyle: { color: c.assignment } }
      },
      {
        type: 'value',
        name: '불참',
        position: 'right',
        nameTextStyle: { color: c.absence, fontWeight: 'bold', padding: [0, 0, 0, 30] },
        splitLine: { show: false },
        axisLabel: { color: c.text },
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
              { offset: 0, color: '#60a5fa' },
              { offset: 1, color: '#3b82f6' }
            ]
          },
          borderRadius: [6, 6, 0, 0]
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(59, 130, 246, 0.4)'
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
  <Card class="h-full overflow-hidden">
    <CardHeader class="pb-2">
      <CardTitle class="text-base font-semibold">기수별 활동 분석</CardTitle>
      <CardDescription class="mt-1">
        기수별 평균 배정 횟수와 성실도를 비교합니다
      </CardDescription>
    </CardHeader>
    <CardContent class="pt-0">
      <div class="h-[300px] w-full">
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
    </CardContent>
  </Card>
</template>
