<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseAdvancedChart from '@/shared/components/charts/BaseAdvancedChart.vue'
import BaseChart from '@/shared/components/charts/BaseChart.vue'
import { useStats } from '../composables/useStats'
import { useThemeStore } from '@/stores/theme'
import { escapeHtml } from '@/shared/utils/text'
import { getChartSeriesPalette, getChartUiPalette, withAlpha } from '@/shared/utils/chartTheme'
import { STATS_CONFIG } from '@/shared/constants/config'

type DeviationView = 'scatter' | 'diverging'
type ScatterTooltipDatum = { name: string; count: number; normalized: number }
type ScatterTooltipParam = { data: ScatterTooltipDatum }

const { stats } = useStats()
const themeStore = useThemeStore()

const deviationView = ref<DeviationView>('scatter')

const colors = computed(() => {
  const isDark = themeStore.effectiveTheme === 'dark'
  const ui = getChartUiPalette()
  const series = getChartSeriesPalette()

  return {
    isDark,
    text: ui.text,
    textStrong: ui.textStrong,
    surface: ui.surface,
    border: ui.border,
    zoneExcessive: withAlpha(series.danger, isDark ? 0.08 : 0.06),
    zoneDiligent: withAlpha(series.success, isDark ? 0.08 : 0.06),
    pointExcessive: series.danger,
    pointDiligent: series.success,
    pointNeutral: ui.text,
    medianLine: series.warning,
    grid: ui.grid,
  }
})

const statusThreshold = STATS_CONFIG.ABSENCE_DEVIATION_STATUS_THRESHOLD

const deviationRows = computed(() => {
  const dev = stats.value.absenceDeviation
  return dev.names.map((name, idx) => ({
    name,
    count: dev.counts[idx] ?? 0,
    normalized: dev.normalized[idx] ?? 0,
  }))
})

const sortedRowsForDiverging = computed(() => {
  return [...deviationRows.value].sort((a, b) => {
    if (b.normalized !== a.normalized) return b.normalized - a.normalized
    return a.name.localeCompare(b.name, 'ko')
  })
})

const scatterOption = computed(() => {
  const c = colors.value
  const rows = deviationRows.value
  if (rows.length === 0) return {}

  const maxAbs = Math.max(...rows.map((row) => Math.abs(row.normalized)), 1.5)
  const extent = Math.ceil(maxAbs * 1.2 * 10) / 10
  const enableNameZoom = rows.length > 12
  const startPct = Math.max(0, 100 - Math.min(100, (12 / rows.length) * 100))

  const scatterData = rows.map((row) => {
    const norm = row.normalized
    let color = c.pointNeutral
    if (norm > statusThreshold) color = c.pointExcessive
    else if (norm < -statusThreshold) color = c.pointDiligent

    return {
      value: [norm, row.name],
      name: row.name,
      count: row.count,
      normalized: norm,
      itemStyle: {
        color,
        borderColor: color,
        borderWidth: 2,
        shadowBlur: 8,
        shadowColor: `${color}40`
      }
    }
  })

  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: c.surface,
      borderColor: c.border,
      borderWidth: 1,
      padding: [12, 16],
      textStyle: {
        color: c.textStrong,
        fontSize: 12
      },
      formatter: (params: ScatterTooltipParam) => {
        const { name, count, normalized } = params.data
        const gen = stats.value.memberGenerations[name]
        const genLabel = gen ? ` <span style="opacity: 0.6; font-weight: 400;">(${gen}기)</span>` : ''
        const safeName = escapeHtml(name)
        const statusConfig = normalized > statusThreshold
          ? { color: c.pointExcessive, label: '과다' }
          : (normalized < -statusThreshold
            ? { color: c.pointDiligent, label: '성실' }
            : { color: c.pointNeutral, label: '보통' })

        return `
          <div style="font-weight: 600; margin-bottom: 8px; font-size: 13px;">${safeName}${genLabel}</div>
          <div style="display: flex; justify-content: space-between; gap: 24px; margin-bottom: 4px;">
            <span style="opacity: 0.7;">불참 횟수</span>
            <span style="font-weight: 600;">${count}회</span>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 24px; margin-bottom: 4px;">
            <span style="opacity: 0.7;">편차 (IQR)</span>
            <span style="font-weight: 600;">${normalized.toFixed(2)}</span>
          </div>
          <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid ${c.border}; font-size: 12px;">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${statusConfig.color};margin-right:6px;"></span>${statusConfig.label}
          </div>
        `
      }
    },
    grid: {
      top: 50,
      bottom: 60,
      left: 110,
      right: enableNameZoom ? 54 : 40,
      containLabel: false
    },
    dataZoom: enableNameZoom
      ? [
          {
            type: 'inside',
            yAxisIndex: 0,
            start: startPct,
            end: 100,
            filterMode: 'weakFilter'
          },
          {
            type: 'slider',
            yAxisIndex: 0,
            start: startPct,
            end: 100,
            right: 8,
            top: 50,
            bottom: 60,
            width: 12,
            brushSelect: false,
            borderColor: 'transparent',
            backgroundColor: withAlpha(c.text, c.isDark ? 0.2 : 0.08),
            fillerColor: withAlpha(c.pointNeutral, c.isDark ? 0.3 : 0.16),
            handleSize: 0
          }
        ]
      : undefined,
    xAxis: {
      type: 'value',
      min: -extent,
      max: extent,
      axisLabel: {
        color: c.text,
        fontSize: 12,
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
      data: rows.map((row) => row.name),
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
      {
        name: 'Zone Excessive',
        type: 'scatter',
        silent: true,
        data: [],
        markArea: {
          silent: true,
          itemStyle: { color: c.zoneExcessive },
          data: [[
            { xAxis: statusThreshold, yAxis: rows[0]?.name },
            { xAxis: extent, yAxis: rows[rows.length - 1]?.name }
          ]]
        }
      },
      {
        name: 'Zone Diligent',
        type: 'scatter',
        silent: true,
        data: [],
        markArea: {
          silent: true,
          itemStyle: { color: c.zoneDiligent },
          data: [[
            { xAxis: -extent, yAxis: rows[0]?.name },
            { xAxis: -statusThreshold, yAxis: rows[rows.length - 1]?.name }
          ]]
        }
      },
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
            fontSize: 12,
            fontWeight: 'bold',
            padding: [4, 8],
            backgroundColor: withAlpha(c.medianLine, c.isDark ? 0.15 : 0.12),
            borderRadius: 4
          },
          data: [{ xAxis: 0 }]
        }
      },
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
        animationDelay: (idx: number) => idx * 40
      }
    ],
    legend: { show: false },
    animation: true,
    animationDuration: 800,
    animationEasing: 'cubicOut'
  }
})

const divergingOption = computed(() => {
  const c = colors.value
  const rows = sortedRowsForDiverging.value
  if (rows.length === 0) return {}

  const maxAbs = Math.max(...rows.map((row) => Math.abs(row.normalized)), statusThreshold + 0.2)
  const extent = Math.ceil(maxAbs * 1.2 * 10) / 10
  const enableNameZoom = rows.length > 12
  const startPct = Math.max(0, 100 - Math.min(100, (12 / rows.length) * 100))

  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: c.surface,
      borderColor: c.border,
      borderWidth: 1,
      padding: [12, 16],
      textStyle: { color: c.textStrong, fontSize: 12 },
      formatter: (params: { dataIndex: number }) => {
        const row = rows[params.dataIndex]
        if (!row) return ''
        const gen = stats.value.memberGenerations[row.name]
        const genLabel = gen ? ` (${gen}기)` : ''
        const safeName = escapeHtml(row.name)
        const status = row.normalized > statusThreshold
          ? '과다'
          : row.normalized < -statusThreshold
            ? '성실'
            : '보통'

        return `
          <div style="font-weight: 600; margin-bottom: 8px; font-size: 13px;">${safeName}${genLabel}</div>
          <div style="display: flex; justify-content: space-between; gap: 24px; margin-bottom: 4px;">
            <span style="opacity: 0.7;">불참 횟수</span>
            <span style="font-weight: 600;">${row.count}회</span>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 24px; margin-bottom: 4px;">
            <span style="opacity: 0.7;">편차 (IQR)</span>
            <span style="font-weight: 600;">${row.normalized.toFixed(2)}</span>
          </div>
          <div style="font-size: 12px; opacity: 0.85;">상태: ${status}</div>
        `
      }
    },
    grid: {
      top: 26,
      bottom: 44,
      left: 110,
      right: enableNameZoom ? 54 : 28,
      containLabel: false,
    },
    dataZoom: enableNameZoom
      ? [
          {
            type: 'inside',
            yAxisIndex: 0,
            start: startPct,
            end: 100,
            filterMode: 'weakFilter',
          },
          {
            type: 'slider',
            yAxisIndex: 0,
            start: startPct,
            end: 100,
            right: 8,
            top: 26,
            bottom: 44,
            width: 12,
            brushSelect: false,
            borderColor: 'transparent',
            backgroundColor: withAlpha(c.text, c.isDark ? 0.2 : 0.08),
            fillerColor: withAlpha(c.pointNeutral, c.isDark ? 0.3 : 0.16),
            handleSize: 0,
          }
        ]
      : undefined,
    xAxis: {
      type: 'value',
      min: -extent,
      max: extent,
      axisLabel: {
        color: c.text,
        fontSize: 12,
        formatter: (val: number) => val.toFixed(1),
      },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: {
        lineStyle: {
          color: c.grid,
          type: 'dashed',
          opacity: 0.45,
        }
      }
    },
    yAxis: {
      type: 'category',
      data: rows.map((row) => row.name),
      axisLabel: {
        color: c.text,
        fontSize: 12,
        fontWeight: 500,
        width: 100,
        overflow: 'truncate',
      },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        name: '편차(IQR)',
        type: 'bar',
        data: rows.map((row) => ({
          value: Number(row.normalized.toFixed(2)),
          itemStyle: {
            color: row.normalized > statusThreshold
              ? c.pointExcessive
              : row.normalized < -statusThreshold
                ? c.pointDiligent
                : withAlpha(c.pointNeutral, c.isDark ? 0.7 : 0.75),
            borderRadius: row.normalized >= 0 ? [0, 4, 4, 0] : [4, 0, 0, 4],
          }
        })),
        barMaxWidth: 16,
        label: {
          show: true,
          position: 'right',
          color: c.textStrong,
          fontSize: 11,
          formatter: (params: { value: number }) => `${Number(params.value).toFixed(1)}`
        },
        markLine: {
          symbol: 'none',
          silent: true,
          label: {
            show: true,
            color: c.text,
            fontSize: 11,
          },
          data: [
            {
              name: '중앙',
              xAxis: 0,
              lineStyle: { color: c.medianLine, width: 2 },
              label: { formatter: '중앙' },
            },
            {
              name: '과다 기준',
              xAxis: statusThreshold,
              lineStyle: { color: withAlpha(c.pointExcessive, 0.75), type: 'dashed' },
              label: { formatter: `+${statusThreshold}` },
            },
            {
              name: '성실 기준',
              xAxis: -statusThreshold,
              lineStyle: { color: withAlpha(c.pointDiligent, 0.75), type: 'dashed' },
              label: { formatter: `-${statusThreshold}` },
            }
          ]
        }
      }
    ],
    animation: true,
    animationDuration: 700,
    animationEasing: 'cubicOut'
  }
})

const containerHeight = computed(() => {
  const count = stats.value.absenceDeviation.names.length
  return Math.max(330, count * 34 + 84) + 'px'
})

const medianLabel = computed(() => stats.value.absenceDeviation.stats.median.toFixed(1))
const activeOption = computed(() => (deviationView.value === 'scatter' ? scatterOption.value : divergingOption.value))
</script>

<template>
  <div class="h-full overflow-hidden px-0.5 py-0.5">
    <div class="pb-1">
      <div class="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div class="flex-1">
          <h4 class="chart-title">개인 불참 편차</h4>
          <p class="chart-subtitle mt-0.5">
            중앙값({{ medianLabel }}회) 대비 편차를 IQR로 분석합니다.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-1.5">
          <div class="inline-flex rounded-md border border-border/70 p-0.5">
            <button
              type="button"
              class="rounded-[5px] px-2.5 py-1 text-xs font-medium"
              :class="deviationView === 'scatter' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'"
              @click="deviationView = 'scatter'"
            >
              산점도
            </button>
            <button
              type="button"
              class="rounded-[5px] px-2.5 py-1 text-xs font-medium"
              :class="deviationView === 'diverging' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'"
              @click="deviationView = 'diverging'"
            >
              편차 막대
            </button>
          </div>
          <div class="chart-meta">질문: 누가 과다/성실 구간에 속하는가?</div>
        </div>
      </div>
    </div>

    <div class="pt-0">
      <div
        v-if="stats.absenceDeviation.names.length > 0"
        :style="{ height: `clamp(300px, 58vh, ${containerHeight})`, width: '100%' }"
      >
        <BaseAdvancedChart
          v-if="deviationView === 'scatter'"
          :options="activeOption"
          height="100%"
        />
        <BaseChart
          v-else
          :options="activeOption"
          height="100%"
        />
      </div>
      <div
        v-else
        class="flex h-[240px] items-center justify-center text-sm text-[var(--color-label-tertiary)] sm:h-[280px]"
      >
        분석할 데이터가 충분하지 않습니다.
      </div>

      <div
        v-if="stats.absenceDeviation.names.length > 0"
        class="chart-meta mt-1.5 flex items-center justify-between px-2 font-medium sm:px-3"
      >
        <span :style="{ color: colors.pointDiligent }">← 성실</span>
        <span class="text-[var(--color-label-tertiary)]">IQR 편차 (기준 ±{{ statusThreshold }})</span>
        <span :style="{ color: colors.pointExcessive }">과다 →</span>
      </div>
    </div>
  </div>
</template>
