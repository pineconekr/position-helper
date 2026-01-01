import { useRef, useEffect, useCallback } from 'react'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import {
    BarChart,
    HeatmapChart,
    TreemapChart,
} from 'echarts/charts'
import {
    TitleComponent,
    TooltipComponent,
    GridComponent,
    LegendComponent,
    VisualMapComponent,
    DataZoomComponent,
    GraphicComponent,
    MarkLineComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts'
import type { CSSProperties } from 'react'
import { useTheme } from '@/shared/theme/ThemeProvider'
import { getChartPalette } from '@/shared/theme/chartColors'

// Register required components
echarts.use([
    BarChart,
    HeatmapChart,
    TreemapChart,
    TitleComponent,
    TooltipComponent,
    GridComponent,
    LegendComponent,
    VisualMapComponent,
    DataZoomComponent,
    GraphicComponent,
    MarkLineComponent,
    CanvasRenderer,
])

export type ResponsiveChartProps = {
    option: EChartsOption
    height?: number | string
    style?: CSSProperties
    className?: string
    notMerge?: boolean
    lazyUpdate?: boolean
    onEvents?: Record<string, (params: any) => void>
}

export function ResponsiveChart({
    option,
    height = 400,
    style,
    className,
    notMerge = false,
    lazyUpdate = true,
    onEvents,
}: ResponsiveChartProps) {
    const chartRef = useRef<ReactEChartsCore>(null)
    const { theme } = useTheme()
    const palette = getChartPalette()

    // Build theme-aware default options
    const themedOption: EChartsOption = {
        backgroundColor: 'transparent',
        textStyle: {
            fontFamily: 'inherit',
            color: palette.text,
        },
        tooltip: {
            backgroundColor: palette.surface2,
            borderColor: palette.border,
            textStyle: {
                color: palette.text,
                fontFamily: 'inherit',
            },
        },
        ...option,
    }

    // Handle resize on window resize
    const handleResize = useCallback(() => {
        const chart = chartRef.current?.getEchartsInstance()
        chart?.resize()
    }, [])

    useEffect(() => {
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [handleResize])

    // Force resize when theme changes
    useEffect(() => {
        const timer = setTimeout(() => {
            handleResize()
        }, 50)
        return () => clearTimeout(timer)
    }, [theme, handleResize])

    const containerStyle: CSSProperties = {
        width: '100%',
        height: typeof height === 'number' ? `${height}px` : height,
        ...style,
    }

    return (
        <ReactEChartsCore
            ref={chartRef}
            echarts={echarts}
            option={themedOption}
            notMerge={notMerge}
            lazyUpdate={lazyUpdate}
            style={containerStyle}
            className={className}
            onEvents={onEvents}
        />
    )
}

export { echarts }
export type { EChartsOption }
