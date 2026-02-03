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
    // 그라데이션 색상
    barNormal: isDark ? '#64748b' : '#94a3b8',
    barWarning: '#f59e0b',
    barDanger: '#ef4444',
    // 임계선
    thresholdLine: isDark ? '#fbbf24' : '#f59e0b'
  }
})

const chartOption = computed(() => {
  const c = colors.value
  
  // 데이터 제한 (Top 10) 및 역순 정렬 (차트 상단이 1위)
  const rawData = stats.value.absenceRanking.slice(0, 10).reverse()
  
  if (rawData.length === 0) return {}

  // 임계값 계산 (평균 + 1.5)
  const allValues = rawData.map(i => i.value)
  const avg = allValues.reduce((a, b) => a + b, 0) / allValues.length
  const threshold = Math.ceil(avg + 1.5)

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: c.isDark ? '#1e293b' : '#ffffff',
      borderColor: c.isDark ? '#475569' : '#e2e8f0',
      borderWidth: 1,
      padding: [12, 16],
      textStyle: { color: c.textStrong },
      formatter: (params: any) => {
        const data = params[0]
        const value = data.value
        const status = value >= 3 ? '⚠️ 주의 필요' : (value >= 2 ? '📋 관찰 대상' : '✅ 양호')
        return `
          <div style="font-weight: 600; margin-bottom: 8px;">${data.name}</div>
          <div style="display: flex; justify-content: space-between; gap: 20px;">
            <span style="opacity: 0.7;">불참 횟수</span>
            <span style="font-weight: 600;">${value}회</span>
          </div>
          <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid ${c.isDark ? '#475569' : '#e2e8f0'}; font-size: 12px;">
            ${status}
          </div>
        `
      }
    },
    grid: {
      top: 30,
      left: 20,
      right: 40,
      bottom: 20,
      containLabel: true
    },
    xAxis: {
      type: 'value',
      splitLine: { 
        lineStyle: { 
          color: c.grid,
          type: 'dashed'
        } 
      },
      axisLabel: { color: c.text },
      minInterval: 1
    },
    yAxis: {
      type: 'category',
      data: rawData.map(i => i.name),
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: { 
        color: c.text,
        fontWeight: 500,
        fontSize: 12
      }
    },
    series: [
      {
        name: '불참 횟수',
        type: 'bar',
        data: rawData.map(i => ({
          value: i.value,
          itemStyle: {
            color: i.value >= 3 
              ? {
                  type: 'linear',
                  x: 0, y: 0, x2: 1, y2: 0,
                  colorStops: [
                    { offset: 0, color: '#ef4444' },
                    { offset: 1, color: '#f87171' }
                  ]
                }
              : i.value >= 2
              ? {
                  type: 'linear',
                  x: 0, y: 0, x2: 1, y2: 0,
                  colorStops: [
                    { offset: 0, color: '#f59e0b' },
                    { offset: 1, color: '#fbbf24' }
                  ]
                }
              : {
                  type: 'linear',
                  x: 0, y: 0, x2: 1, y2: 0,
                  colorStops: [
                    { offset: 0, color: c.isDark ? '#475569' : '#94a3b8' },
                    { offset: 1, color: c.isDark ? '#64748b' : '#cbd5e1' }
                  ]
                },
            borderRadius: [0, 6, 6, 0],
            shadowBlur: i.value >= 3 ? 8 : 0,
            shadowColor: i.value >= 3 ? 'rgba(239, 68, 68, 0.4)' : 'transparent'
          }
        })),
        barWidth: 18,
        emphasis: {
          itemStyle: {
            shadowBlur: 12,
            shadowColor: 'rgba(0, 0, 0, 0.3)'
          }
        },
        label: {
          show: true,
          position: 'right',
          color: c.text,
          fontWeight: 600,
          formatter: '{c}회'
        },
        // 경고 임계선
        markLine: threshold > 0 ? {
          silent: true,
          symbol: 'none',
          lineStyle: {
            color: c.thresholdLine,
            width: 2,
            type: 'dashed'
          },
          label: {
            show: true,
            position: 'end',
            formatter: `주의 (${threshold}회)`,
            color: c.thresholdLine,
            fontSize: 10,
            fontWeight: 'bold'
          },
          data: [{ xAxis: threshold }]
        } : undefined
      }
    ],
    animation: true,
    animationDuration: 600,
    animationEasing: 'cubicOut'
  }
})
</script>

<template>
  <Card class="h-full overflow-hidden">
    <CardHeader class="pb-2">
      <div class="flex justify-between items-start">
        <div>
          <CardTitle class="text-base font-semibold">최다 불참자 (Top 10)</CardTitle>
          <CardDescription class="mt-1">
            누적 불참 횟수와 상습 불참자를 식별합니다
          </CardDescription>
        </div>
        <div class="flex items-center gap-2 text-xs font-medium">
          <span class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-full bg-red-500"></span>
            <span class="text-[var(--color-label-secondary)]">3+회</span>
          </span>
          <span class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-full bg-amber-500"></span>
            <span class="text-[var(--color-label-secondary)]">2회</span>
          </span>
        </div>
      </div>
    </CardHeader>
    <CardContent class="pt-0">
      <div class="h-[300px] w-full">
        <BaseChart 
          v-if="stats.absenceRanking.length > 0" 
          :options="chartOption" 
          height="100%" 
        />
        <div 
          v-else 
          class="h-full flex items-center justify-center text-[var(--color-label-tertiary)] text-sm"
        >
          불참 데이터가 없습니다.
        </div>
      </div>
    </CardContent>
  </Card>
</template>
