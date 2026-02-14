<script setup lang="ts">
import { computed } from 'vue'
import BaseChart from '@/shared/components/charts/BaseChart.vue'
import { useAssignmentStore } from '@/stores/assignment'
import { useThemeStore } from '@/stores/theme'
import { RoleKeys, type PartAssignment } from '@/shared/types'
import { getChartSeriesPalette, getChartUiPalette, withAlpha } from '@/shared/utils/chartTheme'
type AxisTooltipParam = { name: string; value: number; seriesName: string; marker: string }

const store = useAssignmentStore()
const themeStore = useThemeStore()

// 색상 테마
const colors = computed(() => {
  const isDark = themeStore.effectiveTheme === 'dark'
  const ui = getChartUiPalette()
  const series = getChartSeriesPalette()
  return {
    isDark,
    text: ui.text,
    textStrong: ui.textStrong,
    grid: ui.grid,
    gridLight: ui.surface,
    border: ui.border,
    // 시리즈 색상
    monthly: series.danger,
    monthlyLight: withAlpha(series.danger, isDark ? 0.12 : 0.06),
    ma3: series.primary,
    ma3Light: withAlpha(series.primary, isDark ? 0.15 : 0.08),
    // 임계선
    threshold: series.warning
  }
})

// 월별 불참률 추세 계산
const monthlyTrend = computed(() => {
    const monthRecords = new Map<number, { absences: number; slots: number }>()
    let minIndex = Number.POSITIVE_INFINITY
    let maxIndex = Number.NEGATIVE_INFINITY
    
    const countSlots = (part: PartAssignment): number => {
        if (!part) return 0
        let total = 0
        RoleKeys.forEach(role => {
            const value = part[role]
            if (role === '사이드') {
                total += Array.isArray(value) 
                    ? value.reduce((acc: number, item: string) => (item && item.trim().length > 0 ? acc + 1 : acc), 0) 
                    : 0
            } else if (typeof value === 'string' && value.trim().length > 0) {
                total += 1
            }
        })
        return total
    }
    
    Object.entries(store.app.weeks).forEach(([date, week]) => {
        const [yearStr, monthStr] = date.split('-')
        const year = Number(yearStr)
        const month = Number(monthStr)
        if (Number.isNaN(year) || Number.isNaN(month)) return
        
        const index = year * 12 + (month - 1)
        if (!monthRecords.has(index)) {
            monthRecords.set(index, { absences: 0, slots: 0 })
        }
        const record = monthRecords.get(index)!
        record.absences += week.absences?.length ?? 0
        record.slots += countSlots(week.part1) + countSlots(week.part2)
        minIndex = Math.min(minIndex, index)
        maxIndex = Math.max(maxIndex, index)
    })
    
    if (!monthRecords.size || !Number.isFinite(minIndex) || !Number.isFinite(maxIndex)) {
        return { labels: [] as string[], rates: [] as number[], ma3: [] as number[] }
    }
    
    const labels: string[] = []
    const rates: number[] = []
    
    for (let idx = minIndex; idx <= maxIndex; idx++) {
        const year = Math.floor(idx / 12)
        const month = (idx % 12) + 1
        const label = `${String(year).slice(-2)}-${String(month).padStart(2, '0')}`
        const record = monthRecords.get(idx)
        const absences = record?.absences ?? 0
        const slots = record?.slots ?? 0
        const totalCapacity = absences + slots
        const rate = totalCapacity === 0 ? 0 : absences / totalCapacity
        labels.push(label)
        rates.push(rate)
    }
    
    // 3개월 이동평균
    const ma3 = rates.map((_, idx) => {
        const start = Math.max(0, idx - 2)
        const slice = rates.slice(start, idx + 1)
        const sum = slice.reduce((acc, value) => acc + value, 0)
        return slice.length > 0 ? sum / slice.length : 0
    })
    
    return { labels, rates, ma3 }
})

const chartOption = computed(() => {
    const c = colors.value
    const data = monthlyTrend.value
    
    if (data.labels.length === 0) return {}
    
    // 평균 불참률 계산 (임계선용)
    const avgRate = data.rates.reduce((a, b) => a + b, 0) / data.rates.length
    
    return {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'cross' },
            backgroundColor: getChartUiPalette().surface,
            borderColor: c.border,
            borderWidth: 1,
            padding: [12, 16],
            textStyle: { color: c.textStrong, fontSize: 14 },
            formatter: (params: AxisTooltipParam[]) => {
                if (!params || params.length === 0) return ''
                const date = params[0].name
                let html = `<div style="font-weight: 600; margin-bottom: 8px;">${date}</div>`
                params.forEach(p => {
                    const value = (p.value * 100).toFixed(1)
                    html += `
                        <div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;">
                            ${p.marker}
                            <span style="flex: 1; opacity: 0.8;">${p.seriesName}</span>
                            <span style="font-weight: 600;">${value}%</span>
                        </div>
                    `
                })
                return html
            }
        },
        grid: {
            top: 50,
            right: 30,
            bottom: 50,
            left: 60,
            containLabel: true
        },
        legend: {
            data: ['월별 불참률', '3개월 이동평균'],
            top: 0,
            textStyle: { color: c.text, fontWeight: 500, fontSize: 13 },
            icon: 'circle',
            itemWidth: 10,
            itemHeight: 10,
            itemGap: 20
        },
        xAxis: {
            type: 'category',
            data: data.labels,
            axisLabel: { 
                color: c.text,
                fontSize: 13,
                rotate: data.labels.length > 12 ? 45 : 0
            },
            axisLine: { lineStyle: { color: c.grid } },
            axisTick: { show: false }
        },
        yAxis: {
            type: 'value',
            name: '불참률',
            nameLocation: 'middle',
            nameGap: 45,
            nameTextStyle: { color: c.text, fontWeight: 'bold', fontSize: 13 },
            min: 0,
            axisLabel: { 
                color: c.text,
                fontSize: 13,
                formatter: (val: number) => `${(val * 100).toFixed(0)}%`
            },
            splitLine: { 
                lineStyle: { 
                    color: c.grid,
                    type: 'dashed',
                    opacity: 0.5
                } 
            }
        },
        series: [
            {
                name: '월별 불참률',
                type: 'line',
                data: data.rates,
                itemStyle: { color: c.monthly },
                lineStyle: { width: 2, color: c.monthly },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: c.monthlyLight },
                            { offset: 1, color: 'transparent' }
                        ]
                    }
                },
                symbol: 'circle',
                symbolSize: 8,
                emphasis: { scale: 1.5 }
            },
            {
                name: '3개월 이동평균',
                type: 'line',
                data: data.ma3,
                smooth: true,
                itemStyle: { color: c.ma3 },
                lineStyle: { width: 3, color: c.ma3 },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: c.ma3Light },
                            { offset: 1, color: 'transparent' }
                        ]
                    }
                },
                symbol: 'none',
                // 평균 임계선
                markLine: avgRate > 0 ? {
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
                        formatter: `평균 ${(avgRate * 100).toFixed(1)}%`,
                        color: c.threshold,
                        fontSize: 12,
                        fontWeight: 'bold'
                    },
                    data: [{ yAxis: avgRate }]
                } : undefined
            }
        ],
        animation: true,
        animationDuration: 800,
        animationEasing: 'cubicOut'
    }
})
</script>

<template>
  <div class="overflow-hidden px-1 py-1">
    <div class="pb-1.5">
      <div class="flex justify-between items-start">
        <div>
          <h4 class="text-2xl font-semibold text-foreground">월별 불참률 추세</h4>
          <p class="mt-1 text-sm text-muted-foreground">
            월별 불참률과 3개월 이동평균으로 장기 추세를 분석합니다
          </p>
        </div>
      </div>
    </div>
    <div class="pt-0">
      <div class="h-[380px] w-full">
        <BaseChart 
          v-if="monthlyTrend.labels.length > 0" 
          :options="chartOption" 
          height="100%" 
        />
        <div 
          v-else 
          class="h-full flex items-center justify-center text-[var(--color-label-tertiary)] text-sm"
        >
          월별 데이터가 충분하지 않습니다.
        </div>
      </div>
    </div>
  </div>
</template>
