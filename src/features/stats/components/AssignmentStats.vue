<script setup lang="ts">
import { computed, ref } from 'vue'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import BaseChart from '@/shared/components/charts/BaseChart.vue'
import { useStats } from '../composables/useStats'
import { useThemeStore } from '@/stores/theme'
import { RoleKeys } from '@/shared/types'
import { getChartSeriesPalette, getChartUiPalette, withAlpha } from '@/shared/utils/chartTheme'
import { escapeHtml } from '@/shared/utils/text'

type AllViewMode = 'ranking' | 'pareto'
type AxisTooltipParam = { name: string; value: number; seriesName: string; marker: string; dataIndex: number }
type ItemTooltipParam = { name: string; value: number }

const { stats } = useStats()
const themeStore = useThemeStore()

const selectedMember = ref<string>('all')
const allViewMode = ref<AllViewMode>('ranking')
const topNLimit = ref<'12' | '20' | 'all'>('20')

const isAllMode = computed(() => selectedMember.value === 'all')

const allModeRows = computed(() => {
  const source = stats.value.workloadRanking
  if (topNLimit.value === 'all') return source
  return source.slice(0, Number(topNLimit.value))
})

const allModeQuestion = computed(() => {
  if (!isAllMode.value) return ''
  return allViewMode.value === 'pareto'
    ? '질문: 누적 80%가 몇 명에서 형성되는가?'
    : '질문: 배정 상위 인원이 과도하게 집중되어 있는가?'
})

const visibleAssignmentsTotal = computed(() =>
  allModeRows.value.reduce((sum, row) => sum + row.value, 0)
)

const colors = computed(() => {
  const isDark = themeStore.effectiveTheme === 'dark'
  const ui = getChartUiPalette()
  const series = getChartSeriesPalette()
  const roleColors = {
    SW: series.roleSw,
    자막: series.roleCaption,
    고정: series.roleFixed,
    사이드: series.roleSide,
    스케치: series.roleSketch,
  } as const

  return {
    isDark,
    text: ui.text,
    textStrong: ui.textStrong,
    surface: ui.surface,
    grid: ui.grid,
    border: ui.border,
    barMain: series.primary,
    barGradient: [withAlpha(series.primary, isDark ? 0.75 : 0.6), series.primary] as [string, string],
    threshold: series.warning,
    cumulative: series.info,
    roleColors,
  }
})

const chartOption = computed(() => {
  const c = colors.value

  if (isAllMode.value) {
    const data = allModeRows.value
    if (data.length === 0) return {}

    const avg = data.reduce((a, b) => a + b.value, 0) / data.length
    const enableZoom = data.length > 12
    const startPct = Math.max(0, 100 - Math.min(100, (12 / data.length) * 100))
    const isPareto = allViewMode.value === 'pareto'

    const cumulative = (() => {
      const total = data.reduce((sum, row) => sum + row.value, 0)
      if (total === 0) return data.map(() => 0)
      let running = 0
      return data.map((row) => {
        running += row.value
        return Number(((running / total) * 100).toFixed(1))
      })
    })()

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: c.surface,
        borderColor: c.border,
        borderWidth: 1,
        padding: [12, 16],
        textStyle: { color: c.textStrong, fontSize: 13 },
        formatter: (params: AxisTooltipParam[]) => {
          const base = params[0]
          const row = data[base.dataIndex]
          if (!row) return ''

          const safeName = escapeHtml(row.name)
          const gen = stats.value.memberGenerations[row.name]
          const genLabel = gen ? `${gen}기` : ''
          const rank = base.dataIndex + 1

          if (!isPareto) {
            return `
              <div style="font-weight: 600; margin-bottom: 8px;">${safeName} ${genLabel ? `<span style="opacity: 0.6; font-weight: 400;">(${genLabel})</span>` : ''}</div>
              <div style="display: flex; justify-content: space-between; gap: 20px; margin: 4px 0;">
                <span style="opacity: 0.7;">순위</span>
                <span style="font-weight: 600;">#${rank}</span>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 20px;">
                <span style="opacity: 0.7;">총 배정</span>
                <span style="font-weight: 600;">${row.value}회</span>
              </div>
            `
          }

          const cumulativeValue = cumulative[base.dataIndex] ?? 0
          return `
            <div style="font-weight: 600; margin-bottom: 8px;">#${rank} ${safeName} ${genLabel ? `<span style="opacity: 0.6; font-weight: 400;">(${genLabel})</span>` : ''}</div>
            <div style="display: flex; justify-content: space-between; gap: 20px; margin: 4px 0;">
              <span style="opacity: 0.7;">개인 배정</span>
              <span style="font-weight: 600;">${row.value}회</span>
            </div>
            <div style="display: flex; justify-content: space-between; gap: 20px; margin: 4px 0;">
              <span style="opacity: 0.7;">누적 점유율</span>
              <span style="font-weight: 600;">${cumulativeValue.toFixed(1)}%</span>
            </div>
          `
        }
      },
      legend: isPareto
        ? {
            top: 0,
            right: 0,
            data: ['총 배정', '누적 점유율'],
            icon: 'circle',
            itemWidth: 9,
            itemHeight: 9,
            itemGap: 12,
            textStyle: { color: c.text, fontSize: 12, fontWeight: 500 },
          }
        : undefined,
      grid: {
        top: isPareto ? 38 : 30,
        left: 20,
        right: isPareto ? 54 : 30,
        bottom: enableZoom ? 78 : 60,
        containLabel: true
      },
      dataZoom: enableZoom
        ? [
            {
              type: 'inside',
              xAxisIndex: 0,
              start: startPct,
              end: 100,
              filterMode: 'none'
            },
            {
              type: 'slider',
              xAxisIndex: 0,
              start: startPct,
              end: 100,
              height: 14,
              bottom: 10,
              brushSelect: false,
              borderColor: 'transparent',
              backgroundColor: withAlpha(c.text, c.isDark ? 0.2 : 0.08),
              fillerColor: withAlpha(c.barMain, c.isDark ? 0.32 : 0.18),
              handleSize: 0
            }
          ]
        : undefined,
      xAxis: {
        type: 'category',
        data: data.map((row) => row.name),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: c.grid } },
        axisLabel: {
          color: c.text,
          fontSize: 12,
          interval: data.length > 24 ? 1 : 0,
          rotate: data.length > 8 ? 45 : 0
        }
      },
      yAxis: isPareto
        ? [
            {
              type: 'value',
              splitLine: {
                lineStyle: {
                  color: c.grid,
                  type: 'dashed',
                  opacity: 0.5
                }
              },
              axisLabel: { color: c.text, fontSize: 12 }
            },
            {
              type: 'value',
              min: 0,
              max: 100,
              position: 'right',
              splitLine: { show: false },
              axisLabel: {
                color: c.cumulative,
                fontSize: 12,
                formatter: '{value}%'
              },
              axisLine: { show: true, lineStyle: { color: c.cumulative } }
            }
          ]
        : {
            type: 'value',
            splitLine: {
              lineStyle: {
                color: c.grid,
                type: 'dashed',
                opacity: 0.5
              }
            },
            axisLabel: { color: c.text, fontSize: 12 }
          },
      series: isPareto
        ? [
            {
              name: '총 배정',
              type: 'bar',
              data: data.map((row) => row.value),
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
              barMaxWidth: 40,
              label: {
                show: true,
                position: 'top',
                color: c.text,
                fontWeight: 600,
                fontSize: 12
              }
            },
            {
              name: '누적 점유율',
              type: 'line',
              yAxisIndex: 1,
              data: cumulative,
              smooth: true,
              symbol: 'circle',
              symbolSize: 6,
              itemStyle: { color: c.cumulative },
              lineStyle: { color: c.cumulative, width: 2.5 },
              label: {
                show: true,
                color: c.cumulative,
                fontSize: 12,
                formatter: (p: { dataIndex: number; value: number }) =>
                  p.dataIndex === cumulative.length - 1 ? `${Number(p.value).toFixed(0)}%` : ''
              },
              markLine: {
                symbol: 'none',
                silent: true,
                lineStyle: {
                  color: withAlpha(c.cumulative, 0.55),
                  type: 'dashed'
                },
                label: {
                  show: true,
                  color: c.cumulative,
                  formatter: '80%'
                },
                data: [{ yAxis: 80 }]
              }
            }
          ]
        : [
            {
              name: '총 배정',
              type: 'bar',
              data: data.map((row) => row.value),
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
                  shadowColor: withAlpha(c.barMain, 0.4)
                }
              },
              barMaxWidth: 40,
              label: {
                show: true,
                position: 'top',
                color: c.text,
                fontWeight: 600,
                fontSize: 12
              },
              markLine: avg > 0
                ? {
                    silent: true,
                    symbol: 'none',
                    lineStyle: {
                      color: c.threshold,
                      width: 2,
                      type: 'dashed'
                    },
                    label: {
                      show: true,
                      position: 'insideEndTop',
                      formatter: `평균 ${avg.toFixed(1)}`,
                      color: c.threshold,
                      fontSize: 12,
                      fontWeight: 'bold'
                    },
                    data: [{ yAxis: avg }]
                  }
                : undefined
            }
          ],
      animation: true,
      animationDuration: 650,
      animationEasing: 'cubicOut'
    }
  }

  const memberName = selectedMember.value
  const counts = stats.value.roleCounts[memberName] || { SW: 0, 자막: 0, 고정: 0, 사이드: 0, 스케치: 0 }

  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: c.surface,
      borderColor: c.border,
      borderWidth: 1,
      padding: [12, 16],
      textStyle: { color: c.textStrong, fontSize: 13 },
      formatter: (params: ItemTooltipParam) => {
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
        fontWeight: 500,
        fontSize: 12
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
      axisLabel: { color: c.text, fontSize: 12 },
      minInterval: 1
    },
    series: [
      {
        name: '역할 수행 횟수',
        type: 'bar',
        data: RoleKeys.map((role) => ({
          value: counts[role],
          itemStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: withAlpha(c.roleColors[role], c.isDark ? 0.75 : 0.62) },
                { offset: 1, color: c.roleColors[role] }
              ]
            },
            borderRadius: [6, 6, 0, 0]
          }
        })),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: withAlpha(c.roleColors.스케치, c.isDark ? 0.3 : 0.22)
          }
        },
        barMaxWidth: 50,
        label: {
          show: true,
          position: 'top',
          color: c.text,
          fontWeight: 600,
          fontSize: 12
        }
      }
    ],
    animation: true,
    animationDuration: 600,
    animationEasing: 'cubicOut'
  }
})

const memberOptions = computed(() => {
  return stats.value.workloadRanking.map((i) => i.name).sort((a, b) => a.localeCompare(b))
})

const selectedTotal = computed(() => {
  if (isAllMode.value) return null
  const counts = stats.value.roleCounts[selectedMember.value]
  if (!counts) return 0
  return RoleKeys.reduce((sum, r) => sum + (counts[r] || 0), 0)
})
</script>

<template>
  <div class="h-full px-0.5 py-0.5">
    <div class="flex flex-col gap-2 pb-1 sm:flex-row sm:items-start sm:justify-between sm:gap-2.5">
      <div class="space-y-1">
        <h4 class="chart-title">직무 배정 통계</h4>
        <p class="chart-subtitle">
          <span v-if="isAllMode">{{ allModeQuestion }}</span>
          <span v-else>{{ selectedMember }} (총 {{ selectedTotal }}회)</span>
        </p>
      </div>

      <div class="flex w-full flex-wrap items-center justify-end gap-1.5 sm:w-auto sm:flex-nowrap">
        <div v-if="isAllMode" class="inline-flex rounded-md border border-border/70 p-0.5">
          <button
            type="button"
            class="rounded-[5px] px-2.5 py-1 text-xs font-medium"
            :class="allViewMode === 'ranking' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'"
            @click="allViewMode = 'ranking'"
          >
            랭킹
          </button>
          <button
            type="button"
            class="rounded-[5px] px-2.5 py-1 text-xs font-medium"
            :class="allViewMode === 'pareto' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'"
            @click="allViewMode = 'pareto'"
          >
            파레토
          </button>
        </div>

        <div v-if="isAllMode" class="inline-flex rounded-md border border-border/70 p-0.5">
          <button
            type="button"
            class="rounded-[5px] px-2.5 py-1 text-xs font-medium"
            :class="topNLimit === '12' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'"
            @click="topNLimit = '12'"
          >
            Top 12
          </button>
          <button
            type="button"
            class="rounded-[5px] px-2.5 py-1 text-xs font-medium"
            :class="topNLimit === '20' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'"
            @click="topNLimit = '20'"
          >
            Top 20
          </button>
          <button
            type="button"
            class="rounded-[5px] px-2.5 py-1 text-xs font-medium"
            :class="topNLimit === 'all' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'"
            @click="topNLimit = 'all'"
          >
            전체
          </button>
        </div>

        <div class="w-full sm:w-[136px]">
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
      </div>
    </div>

    <div class="pt-0">
      <div
        v-if="isAllMode"
        class="chart-meta mb-2.5 flex flex-wrap items-center gap-2.5 font-medium"
      >
        <span class="text-muted-foreground">표시 인원 {{ allModeRows.length }}명</span>
        <span class="text-muted-foreground">표시 구간 배정 {{ visibleAssignmentsTotal }}회</span>
      </div>

      <div
        v-if="!isAllMode"
        class="mb-2.5 flex flex-wrap gap-2 pt-1.5"
      >
        <span
          v-for="role in RoleKeys"
          :key="role"
          class="chart-meta flex items-center gap-1.5 font-medium"
        >
          <span
            class="h-2.5 w-2.5 rounded-full"
            :style="{ backgroundColor: colors.roleColors[role] }"
          ></span>
          <span class="text-[var(--color-label-secondary)]">{{ role }}</span>
        </span>
      </div>

      <div class="h-[300px] w-full sm:h-[360px]">
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
    </div>
  </div>
</template>
