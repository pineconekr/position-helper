<script setup lang="ts">
import { computed } from 'vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import BaseChart from '@/shared/components/charts/BaseChart.vue'
import { useStats } from '../composables/useStats'
import { useThemeStore } from '@/stores/theme'

const { stats } = useStats()
const themeStore = useThemeStore()

const ROLE_COLORS: Record<string, string> = {
  'SW': '#3b82f6',    // Blue
  '자막': '#10b981',   // Emerald
  '고정': '#8b5cf6',   // Violet
  '사이드': '#f59e0b', // Amber
  '스케치': '#ec4899'  // Pink
}

const chartOption = computed(() => {
  const { categories, series } = stats.value.roleBreakdown
  const isDark = themeStore.effectiveTheme === 'dark'
  const textColor = isDark ? '#94a3b8' : '#64748b'

  if (categories.length === 0) {
      return {
          title: {
              text: '데이터 없음',
              left: 'center',
              top: 'center',
              textStyle: { color: textColor }
          }
      }
  }

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    legend: {
      bottom: 0,
      textStyle: { color: textColor },
      icon: 'circle'
    },
    grid: {
      top: 30,
      left: 10,
      right: 10,
      bottom: 40, 
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisTick: { alignWithLabel: true, show: false },
      axisLine: { lineStyle: { color: isDark ? '#334155' : '#e2e8f0' } },
      axisLabel: { color: textColor, interval: 0, rotate: 45 }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: isDark ? '#334155' : '#f1f5f9' } },
      axisLabel: { color: textColor }
    },
    series: series.map(s => ({
      ...s,
      itemStyle: {
        color: ROLE_COLORS[s.name] || '#94a3b8'
      },
      emphasis: {
          focus: 'series'
      }
    }))
  }
})
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>역할별 배정 분포</CardTitle>
      <CardDescription>
        주요 멤버들의 역할 수행 비율을 보여줍니다.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <BaseChart :options="chartOption" height="400px" />
    </CardContent>
  </Card>
</template>
