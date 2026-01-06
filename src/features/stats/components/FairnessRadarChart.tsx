'use client'

import { useMemo, useState } from 'react'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import { RadarChart } from 'echarts/charts'
import { TooltipComponent, RadarComponent, GraphicComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useTheme } from '@/shared/theme/ThemeProvider'
import { getChartThemeColors, getScoreColor } from '../utils/chartTheme'

// Register ECharts modules
echarts.use([RadarChart, TooltipComponent, RadarComponent, GraphicComponent, CanvasRenderer])

type BreakdownData = {
    opportunityEquality: { score: number; weight: number; description: string }
    roleDiversity: { score: number; weight: number; description: string }
    workloadBalance: { score: number; weight: number; description: string }
    consecutiveAvoidance: { score: number; weight: number; description: string }
}

interface FairnessRadarChartProps {
    breakdown: BreakdownData
    compact?: boolean
}

// 지표 라벨 및 아이콘
const INDICATOR_CONFIG: Record<keyof BreakdownData, { label: string; icon: string; color: { light: string; dark: string } }> = {
    opportunityEquality: {
        label: '배정 기회',
        icon: '⚖️',
        color: { light: '#3b82f6', dark: '#60a5fa' }
    },
    roleDiversity: {
        label: '역할 다양성',
        icon: '🎭',
        color: { light: '#8b5cf6', dark: '#a78bfa' }
    },
    workloadBalance: {
        label: '부담도 균형',
        icon: '⚡',
        color: { light: '#f59e0b', dark: '#fbbf24' }
    },
    consecutiveAvoidance: {
        label: '연속 회피',
        icon: '🔄',
        color: { light: '#10b981', dark: '#34d399' }
    }
}

export default function FairnessRadarChart({ breakdown, compact = false }: FairnessRadarChartProps) {
    const { effectiveTheme } = useTheme()
    const isDark = effectiveTheme === 'dark'
    const [hoveredIndicator, setHoveredIndicator] = useState<keyof BreakdownData | null>(null)

    // 공통 테마 색상 사용
    const themeColors = useMemo(() => getChartThemeColors(isDark), [isDark])

    // 전체 평균 점수 계산
    const avgScore = useMemo(() => {
        const keys = Object.keys(breakdown) as (keyof BreakdownData)[]
        const totalWeight = keys.reduce((sum, k) => sum + breakdown[k].weight, 0)
        const weightedSum = keys.reduce((sum, k) => sum + breakdown[k].score * breakdown[k].weight, 0)
        return Math.round(weightedSum / totalWeight)
    }, [breakdown])

    const option = useMemo(() => {
        const keys = Object.keys(breakdown) as (keyof BreakdownData)[]
        const values = keys.map(k => breakdown[k].score)

        // 각 점에 대한 개별 색상
        const pointColors = keys.map(k => getScoreColor(breakdown[k].score, isDark))

        return {
            animation: true,
            animationDuration: 1000,
            animationEasing: 'elasticOut',
            tooltip: {
                trigger: 'item',
                backgroundColor: themeColors.tooltipBg,
                borderColor: themeColors.border,
                borderWidth: 1,
                padding: [16, 20],
                extraCssText: 'box-shadow: 0 12px 40px rgba(0,0,0,0.15); border-radius: 12px; backdrop-filter: blur(12px);',
                textStyle: { color: themeColors.textPrimary, fontSize: 13 },
                formatter: () => {
                    let html = `<div style="text-align: center; margin-bottom: 12px;">
                        <div style="font-size: 28px; font-weight: 800; color: ${getScoreColor(avgScore, isDark)};">${avgScore}</div>
                        <div style="font-size: 11px; color: ${themeColors.textMuted}; text-transform: uppercase; letter-spacing: 1px;">종합 점수</div>
                    </div>`

                    html += `<div style="display: grid; gap: 8px;">`
                    keys.forEach((k, i) => {
                        const config = INDICATOR_CONFIG[k]
                        const score = breakdown[k].score
                        const color = getScoreColor(score, isDark)
                        const barWidth = score

                        html += `
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-size: 14px;">${config.icon}</span>
                                <div style="flex: 1; min-width: 80px;">
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                                        <span style="font-size: 11px; color: ${themeColors.textSecondary};">${config.label}</span>
                                        <span style="font-size: 12px; font-weight: 700; color: ${color};">${score}</span>
                                    </div>
                                    <div style="height: 4px; background: ${themeColors.surfaceElevated}; border-radius: 2px; overflow: hidden;">
                                        <div style="width: ${barWidth}%; height: 100%; background: ${color}; border-radius: 2px; transition: width 0.3s ease;"></div>
                                    </div>
                                </div>
                            </div>
                        `
                    })
                    html += `</div>`

                    return html
                }
            },
            radar: {
                indicator: keys.map(k => ({
                    name: `${INDICATOR_CONFIG[k].icon} ${INDICATOR_CONFIG[k].label}`,
                    max: 100
                })),
                shape: 'polygon',
                radius: compact ? '60%' : '68%',
                center: ['50%', '52%'],
                startAngle: 90,
                axisName: {
                    color: themeColors.textSecondary,
                    fontSize: compact ? 10 : 11,
                    fontWeight: 500,
                    padding: [3, 5],
                    borderRadius: 4,
                    backgroundColor: 'transparent'
                },
                axisLine: {
                    lineStyle: {
                        color: themeColors.radarAxis,
                        width: 1
                    }
                },
                splitLine: {
                    lineStyle: {
                        color: themeColors.radarSplit,
                        width: 1
                    }
                },
                splitArea: {
                    show: true,
                    areaStyle: {
                        color: [
                            isDark ? 'rgba(51, 65, 85, 0.1)' : 'rgba(241, 245, 249, 0.3)',
                            isDark ? 'rgba(51, 65, 85, 0.05)' : 'rgba(241, 245, 249, 0.15)'
                        ]
                    }
                }
            },
            series: [{
                type: 'radar',
                data: [{
                    value: values,
                    name: '공정성 점수',
                    areaStyle: {
                        color: new echarts.graphic.RadialGradient(0.5, 0.5, 1, [
                            { offset: 0, color: isDark ? 'rgba(96, 165, 250, 0.4)' : 'rgba(59, 130, 246, 0.35)' },
                            { offset: 0.7, color: isDark ? 'rgba(96, 165, 250, 0.2)' : 'rgba(59, 130, 246, 0.15)' },
                            { offset: 1, color: isDark ? 'rgba(96, 165, 250, 0.05)' : 'rgba(59, 130, 246, 0.05)' }
                        ])
                    },
                    lineStyle: {
                        color: isDark ? '#60a5fa' : '#3b82f6',
                        width: 2.5,
                        shadowBlur: 8,
                        shadowColor: isDark ? 'rgba(96, 165, 250, 0.4)' : 'rgba(59, 130, 246, 0.3)'
                    },
                    itemStyle: {
                        color: isDark ? '#f8fafc' : '#ffffff',
                        borderColor: isDark ? '#60a5fa' : '#3b82f6',
                        borderWidth: 2.5,
                        shadowBlur: 6,
                        shadowColor: isDark ? 'rgba(96, 165, 250, 0.5)' : 'rgba(59, 130, 246, 0.4)'
                    },
                    symbol: 'circle',
                    symbolSize: compact ? 6 : 8
                }],
                emphasis: {
                    lineStyle: {
                        width: 3
                    },
                    itemStyle: {
                        borderWidth: 3
                    }
                }
            }],
            // 중앙 점수 표시
            graphic: !compact ? [
                {
                    type: 'group',
                    left: 'center',
                    top: 'center',
                    children: [
                        {
                            type: 'circle',
                            shape: {
                                r: 28
                            },
                            style: {
                                fill: isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.95)',
                                stroke: getScoreColor(avgScore, isDark),
                                lineWidth: 3,
                                shadowBlur: 12,
                                shadowColor: `${getScoreColor(avgScore, isDark)}40`
                            }
                        },
                        {
                            type: 'text',
                            style: {
                                text: String(avgScore),
                                x: 0,
                                y: -4,
                                fill: getScoreColor(avgScore, isDark),
                                fontSize: 20,
                                fontWeight: 'bold',
                                textAlign: 'center',
                                textVerticalAlign: 'middle'
                            }
                        },
                        {
                            type: 'text',
                            style: {
                                text: '점',
                                x: 0,
                                y: 14,
                                fill: themeColors.textMuted,
                                fontSize: 9,
                                textAlign: 'center',
                                textVerticalAlign: 'middle'
                            }
                        }
                    ]
                }
            ] : []
        }
    }, [breakdown, themeColors, isDark, compact, avgScore])

    const chartSize = compact ? 180 : 220

    return (
        <div className="relative">
            {/* 차트 */}
            <div className="flex items-center justify-center">
                <ReactEChartsCore
                    echarts={echarts}
                    option={option}
                    style={{ height: chartSize, width: chartSize }}
                    opts={{ renderer: 'canvas' }}
                    notMerge={true}
                    lazyUpdate={true}
                />
            </div>

            {/* 하단 세부 점수 표시 (compact 모드가 아닐 때) */}
            {!compact && (
                <div className="grid grid-cols-4 gap-2 mt-2">
                    {(Object.keys(breakdown) as (keyof BreakdownData)[]).map(key => {
                        const config = INDICATOR_CONFIG[key]
                        const score = breakdown[key].score
                        const color = getScoreColor(score, isDark)

                        return (
                            <div
                                key={key}
                                className="text-center p-2 rounded-lg transition-all duration-200 cursor-default"
                                style={{
                                    background: hoveredIndicator === key ? `${color}15` : 'transparent'
                                }}
                                onMouseEnter={() => setHoveredIndicator(key)}
                                onMouseLeave={() => setHoveredIndicator(null)}
                            >
                                <div className="text-lg font-bold" style={{ color }}>
                                    {score}
                                </div>
                                <div className="text-[10px] text-[var(--color-label-tertiary)] truncate">
                                    {config.label}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
