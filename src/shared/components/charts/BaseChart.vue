<script setup lang="ts">
import { use } from 'echarts/core'
import { SVGRenderer } from 'echarts/renderers'
import { BarChart, LineChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent
} from 'echarts/components'
import VChart, { THEME_KEY } from 'vue-echarts'
import { computed, provide } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { getChartUiPalette, withAlpha } from '@/shared/utils/chartTheme'

// Register ECharts components
use([
  SVGRenderer,
  BarChart,
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent
])

type ChartOptions = Record<string, unknown> & {
  tooltip?: Record<string, unknown>
  grid?: Record<string, unknown> | Array<Record<string, unknown>>
}

const props = defineProps<{
  options: ChartOptions
  height?: string
}>()

const themeStore = useThemeStore()
const isDark = computed(() => themeStore.effectiveTheme === 'dark')

// Provide the theme for vue-echarts
// 'dark' is a built-in theme in ECharts. For light we use default (undefined/null)
const chartTheme = computed(() => isDark.value ? 'dark' : undefined)
const chartThemeKey = computed(() => (isDark.value ? 'echart-dark' : 'echart-light'))
const initOptions = { renderer: 'svg' as const }

provide(THEME_KEY, chartTheme)

// Default styling options to match app design
const defaultOptions = computed(() => {
  const ui = getChartUiPalette()
  return {
  backgroundColor: 'transparent',
  textStyle: {
    fontFamily: 'var(--font-sans, "Pretendard Variable", "Noto Sans KR", sans-serif)',
    fontSize: 12
  },
  tooltip: {
    backgroundColor: ui.surface,
    borderColor: ui.border,
    textStyle: {
      color: ui.textStrong
    },
    padding: [8, 12],
    borderRadius: 8,
    borderWidth: 1,
    shadowBlur: 10,
    shadowColor: withAlpha(ui.textStrong, 0.14)
  },
  grid: {
    top: 40,
    right: 20,
    bottom: 20,
    left: 20,
    containLabel: true
  }
}})

const mergedOptions = computed(() => {
  const sourceGrid = props.options.grid
  const mergedGrid = Array.isArray(sourceGrid)
    ? sourceGrid
    : {
        ...defaultOptions.value.grid,
        ...(sourceGrid || {})
      }

  // Deep merge would be better but for now shallow merge of top-level keys
  // and specific nested merges manually where important
  return {
    ...defaultOptions.value,
    ...props.options,
    tooltip: {
      ...defaultOptions.value.tooltip,
      ...props.options.tooltip
    },
    grid: mergedGrid
  }
})

</script>

<template>
  <div :style="{ height: height || '350px', width: '100%' }">
    <VChart
      :key="chartThemeKey"
      class="chart"
      :option="mergedOptions"
      :init-options="initOptions"
      autoresize
    />
  </div>
</template>

<style scoped>
.chart {
  height: 100%;
  width: 100%;
}
</style>
