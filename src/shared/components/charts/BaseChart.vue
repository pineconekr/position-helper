<script setup lang="ts">
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, PieChart, LineChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DataZoomComponent,
  ToolboxComponent
} from 'echarts/components'
import VChart, { THEME_KEY } from 'vue-echarts'
import { computed, provide } from 'vue'
import { useThemeStore } from '@/stores/theme'

// Register ECharts components
use([
  CanvasRenderer,
  BarChart,
  PieChart,
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DataZoomComponent,
  ToolboxComponent
])

const props = defineProps<{
  options: any
  height?: string
}>()

const themeStore = useThemeStore()
const isDark = computed(() => themeStore.effectiveTheme === 'dark')

// Provide the theme for vue-echarts
// 'dark' is a built-in theme in ECharts. For light we use default (undefined/null)
const chartTheme = computed(() => isDark.value ? 'dark' : undefined)

provide(THEME_KEY, chartTheme)

// Default styling options to match app design
const defaultOptions = computed(() => ({
  backgroundColor: 'transparent',
  textStyle: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  tooltip: {
    backgroundColor: isDark.value ? '#1e293b' : '#ffffff',
    borderColor: isDark.value ? '#334155' : '#e2e8f0',
    textStyle: {
      color: isDark.value ? '#f8fafc' : '#0f172a'
    },
    padding: [8, 12],
    borderRadius: 8,
    borderWidth: 1,
    shadowBlur: 10,
    shadowColor: 'rgba(0, 0, 0, 0.1)'
  },
  grid: {
    top: 40,
    right: 20,
    bottom: 20,
    left: 20,
    containLabel: true
  }
}))

const mergedOptions = computed(() => {
  // Deep merge would be better but for now shallow merge of top-level keys
  // and specific nested merges manually where important
  return {
    ...defaultOptions.value,
    ...props.options,
    tooltip: {
      ...defaultOptions.value.tooltip,
      ...props.options.tooltip
    },
    grid: {
      ...defaultOptions.value.grid,
      ...props.options.grid
    }
  }
})

</script>

<template>
  <div :style="{ height: height || '350px', width: '100%' }">
    <VChart class="chart" :option="mergedOptions" autoresize />
  </div>
</template>

<style scoped>
.chart {
  height: 100%;
  width: 100%;
}
</style>
