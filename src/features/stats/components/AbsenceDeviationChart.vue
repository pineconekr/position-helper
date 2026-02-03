<script setup lang="ts">
import { computed } from 'vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import BaseChart from '@/shared/components/charts/BaseChart.vue'
import { useStats } from '../composables/useStats'
import { useThemeStore } from '@/stores/theme'

const { stats } = useStats()
const themeStore = useThemeStore()

// 색상 테마 정의
const colors = computed(() => {
  const isDark = themeStore.effectiveTheme === 'dark'
  return {
    isDark,
    text: isDark ? '#94a3b8' : '#64748b',
    textStrong: isDark ? '#e2e8f0' : '#334155',
    // 영역 클라우드 색상 (반투명)
    zoneExcessive: isDark ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.06)',
    zoneDiligent: isDark ? 'rgba(34, 197, 94, 0.08)' : 'rgba(34, 197, 94, 0.06)',
    zoneNeutral: isDark ? 'rgba(100, 116, 139, 0.04)' : 'rgba(100, 116, 139, 0.03)',
    // 포인트 색상
    pointExcessive: '#ef4444',
    pointDiligent: '#22c55e', 
    pointNeutral: isDark ? '#64748b' : '#94a3b8',
    // 중앙선
    medianLine: isDark ? '#fbbf24' : '#f59e0b',
    // 그리드
    grid: isDark ? '#334155' : '#e2e8f0'
  }
})

const chartOption = computed(() => {
  const c = colors.value
  const devStats = stats.value.absenceDeviation
  const hasData = devStats.names.length > 0
  
  if (!hasData) return {}

  // X축 범위 동적 계산 (대칭성 + 여유 공간)
  const maxAbs = Math.max(...devStats.normalized.map(Math.abs), 1.5)
  const extent = Math.ceil(maxAbs * 1.2 * 10) / 10

  // Scatter 데이터 생성: [x, y, count, normalized, name]
  const scatterData = devStats.names.map((name, idx) => {
    const norm = devStats.normalized[idx]
    const count = devStats.counts[idx]
    // 색상 결정
    let color = c.pointNeutral
    let borderColor = c.pointNeutral
    if (norm > 0.5) {
      color = c.pointExcessive
      borderColor = '#dc2626'
    } else if (norm < -0.5) {
      color = c.pointDiligent
      borderColor = '#16a34a'
    }
    
    return {
      value: [norm, name],  // category axis에서는 이름 문자열 사용
      name,
      count,
      normalized: norm,
      itemStyle: {
        color,
        borderColor,
        borderWidth: 2,
        shadowBlur: 8,
        shadowColor: `${color}40`
      }
    }
  })

  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: c.isDark ? '#1e293b' : '#ffffff',
      borderColor: c.isDark ? '#475569' : '#e2e8f0',
      borderWidth: 1,
      padding: [12, 16],
      textStyle: {
        color: c.textStrong,
        fontSize: 13
      },
      formatter: (params: any) => {
        const { name, count, normalized } = params.data
        const status = normalized > 0.5 ? '⚠️ 과다' : (normalized < -0.5 ? '✅ 성실' : '➖ 보통')
        return `
          <div style="font-weight: 600; margin-bottom: 8px; font-size: 14px;">${name}</div>
          <div style="display: flex; justify-content: space-between; gap: 24px; margin-bottom: 4px;">
            <span style="opacity: 0.7;">불참 횟수</span>
            <span style="font-weight: 600;">${count}회</span>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 24px; margin-bottom: 4px;">
            <span style="opacity: 0.7;">편차 (IQR)</span>
            <span style="font-weight: 600;">${normalized.toFixed(2)}</span>
          </div>
          <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid ${c.isDark ? '#475569' : '#e2e8f0'}; font-size: 12px;">
            ${status}
          </div>
        `
      }
    },
    grid: {
      top: 50,
      bottom: 60,
      left: 110,
      right: 40,
      containLabel: false
    },
    xAxis: {
      type: 'value',
      name: '',
      min: -extent,
      max: extent,
      axisLabel: { 
        color: c.text,
        fontSize: 11,
        formatter: (val: number) => val.toFixed(1)
      },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { 
        show: true,
        lineStyle: { 
          type: 'dashed', 
          color: c.grid,
          opacity: 0.5
        }
      }
    },
    yAxis: {
      type: 'category',
      data: devStats.names,
      axisLabel: { 
        color: c.text, 
        fontSize: 12,
        fontWeight: 500,
        width: 100, 
        overflow: 'truncate'
      },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false }
    },
    series: [
      // 1. Zone Clouds (영역 클라우드) - 과다 영역
      {
        name: 'Zone Excessive',
        type: 'scatter',
        silent: true,
        data: [],
        markArea: {
          silent: true,
          itemStyle: {
            color: c.zoneExcessive
          },
          data: [[
            { xAxis: 0.5, yAxis: devStats.names[0] },
            { xAxis: extent, yAxis: devStats.names[devStats.names.length - 1] }
          ]]
        }
      },
      // 2. Zone Clouds - 성실 영역
      {
        name: 'Zone Diligent',
        type: 'scatter',
        silent: true,
        data: [],
        markArea: {
          silent: true,
          itemStyle: {
            color: c.zoneDiligent
          },
          data: [[
            { xAxis: -extent, yAxis: devStats.names[0] },
            { xAxis: -0.5, yAxis: devStats.names[devStats.names.length - 1] }
          ]]
        }
      },
      // 3. 중앙값 수직선
      {
        name: 'Median Line',
        type: 'scatter',
        silent: true,
        data: [],
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: {
            color: c.medianLine,
            width: 2,
            type: 'solid'
          },
          label: {
            show: true,
            position: 'start',
            formatter: '중앙값',
            color: c.medianLine,
            fontSize: 11,
            fontWeight: 'bold',
            padding: [4, 8],
            backgroundColor: c.isDark ? 'rgba(251, 191, 36, 0.15)' : 'rgba(245, 158, 11, 0.12)',
            borderRadius: 4
          },
          data: [{ xAxis: 0 }]
        }
      },
      // 4. 실제 Scatter 포인트 (팀원별)
      {
        name: '팀원별 편차',
        type: 'scatter',
        data: scatterData,
        symbolSize: 20,
        emphasis: {
          scale: 1.4,
          itemStyle: {
            shadowBlur: 16,
          }
        },
        animationDelay: (idx: number) => idx * 50
      }
    ],
    // 범례 - 하단 배치
    legend: {
      show: false
    },
    // 애니메이션
    animation: true,
    animationDuration: 800,
    animationEasing: 'cubicOut'
  }
})

const containerHeight = computed(() => {
  const count = stats.value.absenceDeviation.names.length
  // 더 여유로운 간격
  return Math.max(380, count * 42 + 100) + 'px'
})

const medianLabel = computed(() => {
  return stats.value.absenceDeviation.stats.median.toFixed(1)
})
</script>

<template>
  <Card class="h-full overflow-hidden">
    <CardHeader class="pb-2">
      <div class="flex justify-between items-start gap-4">
        <div class="flex-1">
          <CardTitle class="text-base font-semibold">개인 불참 편차</CardTitle>
          <CardDescription class="mt-1">
            중앙값({{ medianLabel }}회) 대비 편차를 IQR로 분석
          </CardDescription>
        </div>
        <!-- 범례 -->
        <div class="flex items-center gap-3 text-xs font-medium">
          <span class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-full bg-red-500 shadow-sm shadow-red-500/30"></span>
            <span class="text-[var(--color-label-secondary)]">과다</span>
          </span>
          <span class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-full bg-green-500 shadow-sm shadow-green-500/30"></span>
            <span class="text-[var(--color-label-secondary)]">성실</span>
          </span>
        </div>
      </div>
    </CardHeader>
    <CardContent class="pt-0">
      <div 
        v-if="stats.absenceDeviation.names.length > 0"
        :style="{ height: containerHeight, width: '100%' }"
      >
        <BaseChart :options="chartOption" height="100%" />
      </div>
      <div 
        v-else 
        class="h-[300px] flex items-center justify-center text-[var(--color-label-tertiary)] text-sm"
      >
        분석할 데이터가 충분하지 않습니다.
      </div>
      <!-- 하단 축 라벨 -->
      <div 
        v-if="stats.absenceDeviation.names.length > 0"
        class="flex justify-between items-center px-4 mt-2 text-xs font-medium"
      >
        <span class="text-green-600 dark:text-green-400">← 성실</span>
        <span class="text-[var(--color-label-tertiary)]">IQR 편차</span>
        <span class="text-red-600 dark:text-red-400">과다 →</span>
      </div>
    </CardContent>
  </Card>
</template>
