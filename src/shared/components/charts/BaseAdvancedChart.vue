<script setup lang="ts">
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { HeatmapChart, ScatterChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  VisualMapComponent,
  MarkAreaComponent,
  MarkLineComponent
} from 'echarts/components'
import VChart, { THEME_KEY } from 'vue-echarts'
import { computed, provide } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { getChartUiPalette, withAlpha } from '@/shared/utils/chartTheme'

use([
  CanvasRenderer,
  HeatmapChart,
  ScatterChart,
  GridComponent,
  TooltipComponent,
  VisualMapComponent,
  MarkAreaComponent,
  MarkLineComponent
])

const props = defineProps<{
  options: any
  height?: string
}>()

const themeStore = useThemeStore()
const isDark = computed(() => themeStore.effectiveTheme === 'dark')
const chartTheme = computed(() => isDark.value ? 'dark' : undefined)
const chartThemeKey = computed(() => (isDark.value ? 'echart-advanced-dark' : 'echart-advanced-light'))

provide(THEME_KEY, chartTheme)

const defaultOptions = computed(() => {
  const ui = getChartUiPalette()
  return {
  backgroundColor: 'transparent',
  textStyle: {
    fontFamily: 'var(--font-sans, "Pretendard Variable", "Noto Sans KR", sans-serif)'
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
    <VChart :key="chartThemeKey" class="chart" :option="mergedOptions" autoresize />
  </div>
</template>

<style scoped>
.chart {
  height: 100%;
  width: 100%;
}
</style>
