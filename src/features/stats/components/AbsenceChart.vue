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
    // Bullet Chart 배경 영역 (3단계)
    rangeGood: isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.12)',
    rangeWarning: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.15)',
    rangeDanger: isDark ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.18)',
    // 실제 값 막대
    barPrimary: isDark ? '#3b82f6' : '#2563eb',
    barWarning: '#f59e0b',
    barDanger: '#ef4444',
    // 기준선
    targetLine: isDark ? '#f8fafc' : '#1e293b',
    avgLine: isDark ? '#94a3b8' : '#64748b'
  }
})

const chartOption = computed(() => {
  const c = colors.value
  
  // 데이터 준비 (Top 10, 역순 정렬)
  const rawData = stats.value.absenceRanking.slice(0, 10).reverse()
  
  if (rawData.length === 0) return {}

  // 통계 계산 (IQR 기반 동적 임계값)
  const values = rawData.map(i => i.value).sort((a, b) => a - b)
  const n = values.length
  const q2 = values[Math.floor(n * 0.5)] // 중앙값
  const q3 = values[Math.floor(n * 0.75)]
  const avg = values.reduce((a, b) => a + b, 0) / n
  const maxValue = Math.max(...values)
  
  // 동적 임계값: IQR 기반
  // - 양호: Q2 (중앙값) 이하
  // - 관찰: Q2 ~ Q3
  // - 주의: Q3 초과 (상위 25%)
  const thresholdWarning = Math.max(q2, 1)  // 최소 1
  const thresholdDanger = Math.max(q3, thresholdWarning + 1)
  
  // X축 최대값 (여유 공간 확보)
  const xMax = Math.max(maxValue + 2, thresholdDanger + 2)

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
        const item = params.find((p: any) => p.seriesName === '불참 횟수')
        if (!item) return ''
        const value = item.value
        // HTML 기반 상태 표시 (이모지 대신 일관된 스타일)
        const statusConfig = value >= thresholdDanger 
          ? { color: '#ef4444', label: '주의 필요' }
          : value >= thresholdWarning 
            ? { color: '#f59e0b', label: '관찰 대상' }
            : { color: '#22c55e', label: '양호' }
        const statusHtml = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${statusConfig.color};margin-right:6px;"></span>${statusConfig.label}`
        const avgDiff = value - avg
        const avgText = avgDiff > 0 
          ? `평균 대비 +${avgDiff.toFixed(1)}회` 
          : avgDiff < 0 
            ? `평균 대비 ${avgDiff.toFixed(1)}회`
            : '평균과 동일'
        
        return `
          <div style="font-weight: 600; margin-bottom: 8px; font-size: 14px;">${item.name}</div>
          <div style="display: flex; justify-content: space-between; gap: 24px; margin-bottom: 4px;">
            <span style="opacity: 0.7;">불참 횟수</span>
            <span style="font-weight: 700; font-size: 16px;">${value}회</span>
          </div>
          <div style="font-size: 12px; opacity: 0.6; margin-bottom: 8px;">${avgText}</div>
          <div style="padding-top: 8px; border-top: 1px solid ${c.isDark ? '#475569' : '#e2e8f0'}; font-size: 13px; font-weight: 500;">
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
        fontSize: 12,
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
            shadowColor: i.value >= thresholdDanger ? 'rgba(239, 68, 68, 0.4)' : 'transparent'
          }
        })),
        z: 5,
        label: {
          show: true,
          position: 'right',
          distance: 8,
          color: c.textStrong,
          fontWeight: 600,
          fontSize: 12,
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
            fontSize: 10,
            fontWeight: 500,
            backgroundColor: c.isDark ? '#1e293b' : '#f8fafc',
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
  const opt = chartOption.value as any
  return opt?._thresholds ?? { warning: 2, danger: 3 }
})
</script>

<template>
  <Card class="h-full overflow-hidden">
    <CardHeader class="pb-2">
      <div class="flex justify-between items-start">
        <div>
          <CardTitle class="text-base font-semibold">최다 불참자 (Top 10)</CardTitle>
          <CardDescription class="mt-1">
            누적 불참 횟수 — Bullet Chart로 임계치 대비 현황 파악
          </CardDescription>
        </div>
        <!-- 동적 범례 -->
        <div class="flex items-center gap-3 text-xs font-medium">
          <span class="flex items-center gap-1.5">
            <span class="w-3 h-1.5 rounded-full bg-emerald-500/30"></span>
            <span class="text-muted-foreground">~{{ thresholds.warning }}</span>
          </span>
          <span class="flex items-center gap-1.5">
            <span class="w-3 h-1.5 rounded-full bg-amber-500/40"></span>
            <span class="text-muted-foreground">{{ thresholds.warning + 1 }}~{{ thresholds.danger }}</span>
          </span>
          <span class="flex items-center gap-1.5">
            <span class="w-3 h-1.5 rounded-full bg-red-500/40"></span>
            <span class="text-muted-foreground">{{ thresholds.danger }}+</span>
          </span>
        </div>
      </div>
    </CardHeader>
    <CardContent class="pt-0">
      <div class="h-[320px] w-full">
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
    </CardContent>
  </Card>
</template>
