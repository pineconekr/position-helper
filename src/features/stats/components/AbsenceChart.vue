<script setup lang="ts">
import { computed } from 'vue'
import BaseChart from '@/shared/components/charts/BaseChart.vue'
import { useStats } from '../composables/useStats'
import { useThemeStore } from '@/stores/theme'
import { getChartSeriesPalette, getChartUiPalette, withAlpha } from '@/shared/utils/chartTheme'
import { escapeHtml } from '@/shared/utils/text'

type AxisTooltipParam = {
  seriesName: string
  value: number
  dataIndex: number
}
type BarColorParam = { dataIndex: number }

const { stats } = useStats()
const themeStore = useThemeStore()

const colors = computed(() => {
  const isDark = themeStore.effectiveTheme === 'dark'
  const ui = getChartUiPalette()
  const series = getChartSeriesPalette()
  return {
    text: ui.text,
    textStrong: ui.textStrong,
    border: ui.border,
    grid: ui.grid,
    barTrack: withAlpha(ui.text, isDark ? 0.12 : 0.08),
    barMain: series.primary,
    barHigh: series.warning,
    barTop: series.danger,
    cumulative: series.info,
    referenceAvg: ui.text,
    referenceQ3: series.warning,
  }
})

type AbsenceRow = {
  name: string
  value: number
  rank: number
  share: number
  cumulative: number
}

function getPercentile(values: number[], p: number): number {
  if (values.length === 0) return 0
  if (values.length === 1) return values[0]
  const sorted = [...values].sort((a, b) => a - b)
  const idx = (sorted.length - 1) * p
  const lower = Math.floor(idx)
  const upper = Math.ceil(idx)
  const weight = idx - lower
  return sorted[lower] * (1 - weight) + sorted[upper] * weight
}

const chartSummary = computed(() => {
  const ranked = stats.value.absenceRanking.slice(0, 10).map((item, index) => ({
    name: item.name,
    value: item.value,
    rank: index + 1,
  }))

  if (ranked.length === 0) {
    return {
      rows: [] as AbsenceRow[],
      max: 1,
      avg: 0,
      q3: 0,
      top3Share: 0,
      top10ShareOverall: 0,
    }
  }

  const topTotal = ranked.reduce((sum, item) => sum + item.value, 0)
  const overallTotal = stats.value.absenceRanking.reduce((sum, item) => sum + item.value, 0)
  let running = 0
  const rows: AbsenceRow[] = ranked.map((item) => {
    running += item.value
    const share = topTotal > 0 ? item.value / topTotal : 0
    const cumulative = topTotal > 0 ? running / topTotal : 0
    return { ...item, share, cumulative }
  })

  const values = rows.map((row) => row.value)
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length
  const q3 = getPercentile(values, 0.75)
  const max = Math.max(...values)
  const top3Total = rows.slice(0, 3).reduce((sum, row) => sum + row.value, 0)
  const top3Share = topTotal > 0 ? top3Total / topTotal : 0
  const top10ShareOverall = overallTotal > 0 ? topTotal / overallTotal : 0

  return { rows, max, avg, q3, top3Share, top10ShareOverall }
})

const chartOption = computed(() => {
  const c = colors.value
  const summary = chartSummary.value
  if (summary.rows.length === 0) return {}

  const yLabels = summary.rows.map((row) => `#${row.rank} ${row.name}`)

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: getChartUiPalette().surface,
      borderColor: c.border,
      borderWidth: 1,
      padding: [12, 16],
      textStyle: { color: c.textStrong, fontSize: 13 },
      formatter: (params: AxisTooltipParam[]) => {
        const valueParam = params.find((p) => p.seriesName === '불참 횟수')
        const cumulativeParam = params.find((p) => p.seriesName === '누적 점유율')
        if (!valueParam) return ''

        const row = summary.rows[valueParam.dataIndex]
        if (!row) return ''

        const safeName = escapeHtml(row.name)
        const shareText = `${(row.share * 100).toFixed(1)}%`
        const cumulativeText = cumulativeParam ? `${Number(cumulativeParam.value).toFixed(1)}%` : '-'

        return `
          <div style="font-weight: 600; margin-bottom: 8px; font-size: 13px;">#${row.rank} ${safeName}</div>
          <div style="display: flex; justify-content: space-between; gap: 24px; margin-bottom: 4px;">
            <span style="opacity: 0.7;">불참 횟수</span>
            <span style="font-weight: 700; font-size: 13px;">${row.value}회</span>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 24px; margin-bottom: 4px; font-size: 12px;">
            <span style="opacity: 0.7;">상위 10명 내 비중</span>
            <span style="font-weight: 600;">${shareText}</span>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 24px; font-size: 12px;">
            <span style="opacity: 0.7;">누적 점유율</span>
            <span style="font-weight: 600;">${cumulativeText}</span>
          </div>
        `
      },
    },
    legend: {
      top: 0,
      right: 0,
      data: ['불참 횟수', '누적 점유율'],
      icon: 'circle',
      itemWidth: 9,
      itemHeight: 9,
      itemGap: 14,
      textStyle: { color: c.text, fontSize: 12, fontWeight: 500 },
    },
    grid: {
      top: 34,
      left: 18,
      right: 64,
      bottom: 28,
      containLabel: true,
    },
    xAxis: [
      {
        type: 'value',
        min: 0,
        max: summary.max + 1,
        splitLine: {
          lineStyle: { color: c.grid, type: 'dashed', opacity: 0.45 },
        },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: c.text,
          fontSize: 12,
          formatter: '{value}회',
        },
      },
      {
        type: 'value',
        min: 0,
        max: 100,
        position: 'top',
        splitLine: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: c.text,
          fontSize: 12,
          formatter: '{value}%',
        },
      },
    ],
    yAxis: {
      type: 'category',
      inverse: true,
      data: yLabels,
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: {
        color: c.text,
        fontWeight: 500,
        fontSize: 12,
        width: 88,
        overflow: 'truncate',
      },
    },
    series: [
      {
        name: '기준 트랙',
        type: 'bar',
        xAxisIndex: 0,
        silent: true,
        barGap: '-100%',
        barWidth: 18,
        data: summary.rows.map(() => summary.max + 1),
        itemStyle: {
          color: c.barTrack,
          borderRadius: [0, 5, 5, 0],
        },
        tooltip: { show: false },
        z: 1,
      },
      {
        name: '불참 횟수',
        type: 'bar',
        xAxisIndex: 0,
        barGap: '-100%',
        barWidth: 11,
        data: summary.rows.map((row) => row.value),
        itemStyle: {
          borderRadius: [0, 4, 4, 0],
          color: (params: BarColorParam) => {
            const rank = summary.rows[params.dataIndex]?.rank ?? 99
            if (rank === 1) return c.barTop
            if (rank <= 3) return c.barHigh
            return c.barMain
          },
        },
        label: {
          show: true,
          position: 'right',
          distance: 8,
          color: c.textStrong,
          fontWeight: 600,
          fontSize: 12,
          formatter: (params: { dataIndex: number; value: number }) => {
            const row = summary.rows[params.dataIndex]
            if (!row) return `${params.value}`
            return `${params.value}회 · ${(row.share * 100).toFixed(0)}%`
          },
        },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: {
            color: c.referenceAvg,
            width: 1.6,
            type: 'dashed',
          },
          label: {
            show: true,
            position: 'insideEndTop',
            color: c.text,
            fontSize: 12,
            fontWeight: 500,
            backgroundColor: getChartUiPalette().surface,
            padding: [2, 5],
            borderRadius: 3,
            formatter: (param: { name: string }) =>
              param.name === 'Q3' ? `Q3 ${summary.q3.toFixed(1)}` : `평균 ${summary.avg.toFixed(1)}`,
          },
          data: [
            { name: '평균', xAxis: summary.avg },
            {
              name: 'Q3',
              xAxis: summary.q3,
              lineStyle: { color: c.referenceQ3, width: 1.6, type: 'dashed' },
            },
          ],
        },
        z: 3,
      },
      {
        name: '누적 점유율',
        type: 'line',
        xAxisIndex: 1,
        yAxisIndex: 0,
        data: summary.rows.map((row) => Number((row.cumulative * 100).toFixed(1))),
        symbol: 'circle',
        symbolSize: 6,
        smooth: true,
        itemStyle: { color: c.cumulative },
        lineStyle: { color: c.cumulative, width: 2 },
        label: {
          show: true,
          position: 'right',
          color: c.cumulative,
          fontSize: 12,
          formatter: (params: { dataIndex: number; value: number }) =>
            params.dataIndex === summary.rows.length - 1 ? `${Number(params.value).toFixed(0)}%` : '',
        },
        z: 4,
      },
    ],
    animation: true,
    animationDuration: 850,
    animationEasing: 'cubicOut',
  }
})
</script>

<template>
  <div class="h-full px-0.5 py-0.5">
    <div class="pb-1">
      <div class="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 class="chart-title">최다 불참자 (Top 10)</h4>
          <p class="chart-subtitle mt-0.5">상위 불참자 분포와 누적 점유율을 함께 확인합니다.</p>
        </div>
        <div class="chart-meta flex flex-wrap items-center gap-2.5 font-medium">
          <span class="text-muted-foreground">상위 3명 점유 {{ (chartSummary.top3Share * 100).toFixed(0) }}%</span>
          <span class="text-muted-foreground">Top 10 점유 {{ (chartSummary.top10ShareOverall * 100).toFixed(0) }}%</span>
        </div>
      </div>
    </div>
    <div class="pt-0">
      <div class="h-[280px] w-full sm:h-[350px]">
        <BaseChart v-if="chartSummary.rows.length > 0" :options="chartOption" height="100%" />
        <div v-else class="h-full flex items-center justify-center text-muted-foreground text-sm">
          불참 데이터가 없습니다.
        </div>
      </div>
    </div>
  </div>
</template>




