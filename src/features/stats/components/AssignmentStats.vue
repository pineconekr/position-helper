<script setup lang="ts">
import { computed, ref } from 'vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import BaseChart from '@/shared/components/charts/BaseChart.vue'
import { useStats } from '../composables/useStats'
import { useThemeStore } from '@/stores/theme'
import { RoleKeys } from '@/shared/types'

const { stats } = useStats()
const themeStore = useThemeStore()

const selectedMember = ref<string>('all')

// 역할별 색상 정의 - 그라데이션 포함
const ROLE_COLORS: Record<string, { main: string; light: string; gradient: [string, string] }> = {
  'SW': { main: '#3b82f6', light: 'rgba(59, 130, 246, 0.15)', gradient: ['#60a5fa', '#3b82f6'] },
  '자막': { main: '#10b981', light: 'rgba(16, 185, 129, 0.15)', gradient: ['#34d399', '#10b981'] },
  '고정': { main: '#8b5cf6', light: 'rgba(139, 92, 246, 0.15)', gradient: ['#a78bfa', '#8b5cf6'] },
  '사이드': { main: '#f59e0b', light: 'rgba(245, 158, 11, 0.15)', gradient: ['#fbbf24', '#f59e0b'] },
  '스케치': { main: '#ec4899', light: 'rgba(236, 72, 153, 0.15)', gradient: ['#f472b6', '#ec4899'] }
}

// 색상 테마
const colors = computed(() => {
  const isDark = themeStore.effectiveTheme === 'dark'
  return {
    isDark,
    text: isDark ? '#94a3b8' : '#64748b',
    textStrong: isDark ? '#e2e8f0' : '#334155',
    grid: isDark ? '#334155' : '#e2e8f0',
    gridLight: isDark ? '#1e293b' : '#f8fafc',
    // 전체 모드 색상
    barMain: '#3b82f6',
    barGradient: ['#60a5fa', '#3b82f6'] as [string, string]
  }
})

const chartOption = computed(() => {
  const c = colors.value

  // 1. 전체 보기 모드 (누적 배정 횟수 랭킹)
  if (selectedMember.value === 'all') {
    const data = stats.value.workloadRanking
    if (data.length === 0) return {}

    // 평균값 계산 (임계선용)
    const avg = data.reduce((a, b) => a + b.value, 0) / data.length
    
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
          const d = params[0]
          const rank = data.findIndex(i => i.name === d.name) + 1
          const gen = stats.value.memberGenerations[d.name]
          const genLabel = gen ? `${gen}기` : ''
          return `
            <div style="font-weight: 600; margin-bottom: 8px;">${d.name} ${genLabel ? `<span style="opacity: 0.6; font-weight: 400;">(${genLabel})</span>` : ''}</div>
            <div style="display: flex; justify-content: space-between; gap: 20px; margin: 4px 0;">
              <span style="opacity: 0.7;">순위</span>
              <span style="font-weight: 600;">#${rank}</span>
            </div>
            <div style="display: flex; justify-content: space-between; gap: 20px;">
              <span style="opacity: 0.7;">총 배정</span>
              <span style="font-weight: 600;">${d.value}회</span>
            </div>
          `
        }
      },
      grid: {
        top: 30,
        left: 20,
        right: 30,
        bottom: 60,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: data.map(i => i.name),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: c.grid } },
        axisLabel: { 
          color: c.text, 
          fontSize: 11,
          interval: 0, 
          rotate: data.length > 8 ? 45 : 0
        }
      },
      yAxis: {
        type: 'value',
        splitLine: { 
          lineStyle: { 
            color: c.grid,
            type: 'dashed',
            opacity: 0.5
          } 
        },
        axisLabel: { color: c.text }
      },
      series: [
        {
          name: '총 배정',
          type: 'bar',
          data: data.map(i => i.value),
          itemStyle: {
            borderRadius: [6, 6, 0, 0],
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: c.barGradient[0] },
                { offset: 1, color: c.barGradient[1] }
              ]
            }
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(59, 130, 246, 0.4)'
            }
          },
          barMaxWidth: 40,
          label: {
            show: true,
            position: 'top',
            color: c.text,
            fontWeight: 600,
            fontSize: 11
          },
          // 평균선
          markLine: avg > 0 ? {
            silent: true,
            symbol: 'none',
            lineStyle: {
              color: c.isDark ? '#fbbf24' : '#f59e0b',
              width: 2,
              type: 'dashed'
            },
            label: {
              show: true,
              position: 'insideEndTop',
              formatter: `평균 ${avg.toFixed(1)}`,
              color: c.isDark ? '#fbbf24' : '#f59e0b',
              fontSize: 10,
              fontWeight: 'bold'
            },
            data: [{ yAxis: avg }]
          } : undefined
        }
      ],
      animation: true,
      animationDuration: 600,
      animationEasing: 'cubicOut'
    }
  } 
  
  // 2. 개인별 보기 모드 (역할별 빈도)
  else {
    const memberName = selectedMember.value
    const counts = stats.value.roleCounts[memberName] || { 'SW': 0, '자막': 0, '고정': 0, '사이드': 0, '스케치': 0 }
    
    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: c.isDark ? '#1e293b' : '#ffffff',
        borderColor: c.isDark ? '#475569' : '#e2e8f0',
        borderWidth: 1,
        padding: [12, 16],
        textStyle: { color: c.textStrong },
        formatter: (params: any) => {
          const role = params.name
          const value = params.value
          const total = RoleKeys.reduce((sum, r) => sum + (counts[r] || 0), 0)
          const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0'
          return `
            <div style="font-weight: 600; margin-bottom: 8px;">${role}</div>
            <div style="display: flex; justify-content: space-between; gap: 20px; margin: 4px 0;">
              <span style="opacity: 0.7;">수행 횟수</span>
              <span style="font-weight: 600;">${value}회</span>
            </div>
            <div style="display: flex; justify-content: space-between; gap: 20px;">
              <span style="opacity: 0.7;">비율</span>
              <span style="font-weight: 600;">${pct}%</span>
            </div>
          `
        }
      },
      grid: {
        top: 30,
        left: 20,
        right: 20,
        bottom: 30,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: RoleKeys,
        axisTick: { show: false },
        axisLine: { lineStyle: { color: c.grid } },
        axisLabel: { 
          color: c.text,
          fontWeight: 500
        }
      },
      yAxis: {
        type: 'value',
        splitLine: { 
          lineStyle: { 
            color: c.grid,
            type: 'dashed',
            opacity: 0.5
          } 
        },
        axisLabel: { color: c.text },
        minInterval: 1
      },
      series: [
        {
          name: '역할 수행 횟수',
          type: 'bar',
          data: RoleKeys.map(role => ({
            value: counts[role],
            itemStyle: { 
              color: {
                type: 'linear',
                x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: ROLE_COLORS[role].gradient[0] },
                  { offset: 1, color: ROLE_COLORS[role].gradient[1] }
                ]
              },
              borderRadius: [6, 6, 0, 0]
            }
          })),
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.3)'
            }
          },
          barMaxWidth: 50,
          label: {
            show: true,
            position: 'top',
            color: c.text,
            fontWeight: 600
          }
        }
      ],
      animation: true,
      animationDuration: 600,
      animationEasing: 'cubicOut'
    }
  }
})

// 옵션 목록 (전체 + 이름순 정렬된 멤버 리스트)
const memberOptions = computed(() => {
  const members = stats.value.workloadRanking.map(i => i.name).sort((a, b) => a.localeCompare(b))
  return members
})

// 선택된 멤버의 총 배정 횟수
const selectedTotal = computed(() => {
  if (selectedMember.value === 'all') return null
  const counts = stats.value.roleCounts[selectedMember.value]
  if (!counts) return 0
  return RoleKeys.reduce((sum, r) => sum + (counts[r] || 0), 0)
})
</script>

<template>
  <Card class="h-full overflow-hidden">
    <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
      <div class="space-y-1">
        <CardTitle class="text-base font-semibold">직무 배정 통계</CardTitle>
        <CardDescription>
          <span v-if="selectedMember === 'all'">전체 팀원의 배정 횟수를 확인합니다</span>
          <span v-else>{{ selectedMember }} (총 {{ selectedTotal }}회)</span>
        </CardDescription>
      </div>
      <div class="w-[140px]">
        <Select v-model="selectedMember">
          <SelectTrigger>
            <SelectValue placeholder="팀원 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 보기</SelectItem>
            <SelectItem 
              v-for="name in memberOptions" 
              :key="name" 
              :value="name"
            >
              {{ name }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </CardHeader>
    <CardContent class="pt-0">
      <!-- 역할별 범례 (개인 모드에서만 표시) -->
      <div 
        v-if="selectedMember !== 'all'" 
        class="flex flex-wrap gap-3 mb-4 pt-2"
      >
        <span 
          v-for="role in RoleKeys" 
          :key="role"
          class="flex items-center gap-1.5 text-xs font-medium"
        >
          <span 
            class="w-3 h-3 rounded-full" 
            :style="{ backgroundColor: ROLE_COLORS[role].main }"
          ></span>
          <span class="text-[var(--color-label-secondary)]">{{ role }}</span>
        </span>
      </div>
      
      <div class="h-[320px] w-full">
        <BaseChart 
          v-if="stats.workloadRanking.length > 0"
          :options="chartOption" 
          height="100%" 
        />
        <div 
          v-else 
          class="h-full flex items-center justify-center text-[var(--color-label-tertiary)] text-sm"
        >
          배정 데이터가 없습니다.
        </div>
      </div>
    </CardContent>
  </Card>
</template>
