<script setup lang="ts">
import { computed } from 'vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import BaseChart from '@/shared/components/charts/BaseChart.vue'
import { useStats } from '../composables/useStats'
import { useThemeStore } from '@/stores/theme'

const { stats } = useStats()
const themeStore = useThemeStore()

const chartOption = computed(() => {
  // Take top 10 and reverse so the highest is at the top in vertical category axis
  // or at right in horizontal.
  // ECharts 'category' y-axis plots bottom-to-top by default index order.
  // So if we want #1 at top, we need it at the end of the array.
  const data = stats.value.workloadRanking.slice(0, 10).reverse() 

  const isDark = themeStore.effectiveTheme === 'dark'
  const gridColor = isDark ? '#334155' : '#f1f5f9'
  const textColor = isDark ? '#94a3b8' : '#64748b'

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    grid: {
      top: 10,
      left: 10,
      right: 20,
      bottom: 20,
      containLabel: true
    },
    xAxis: {
      type: 'value',
      splitLine: {
        lineStyle: { color: gridColor }
      },
      axisLabel: { color: textColor }
    },
    yAxis: {
      type: 'category',
      data: data.map(i => i.name),
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: { 
        color: textColor,
        fontWeight: 'bold'
      }
    },
    series: [
      {
        name: 'Assignments',
        type: 'bar',
        data: data.map(i => i.value),
        itemStyle: {
          borderRadius: [0, 4, 4, 0],
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: '#3b82f6' }, // Blue 500
              { offset: 1, color: '#60a5fa' }  // Blue 400
            ]
          }
        },
        barWidth: 20,
        label: {
            show: true,
            position: 'right',
            color: textColor
        }
      }
    ]
  }
})
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>최다 배정 Top 10</CardTitle>
      <CardDescription>
        누적 배정 횟수가 가장 많은 팀원들입니다.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <BaseChart :options="chartOption" height="400px" />
    </CardContent>
  </Card>
</template>
