'use client'

import { useMemo, useState, useCallback } from 'react'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import { ScatterChart, EffectScatterChart, CustomChart } from 'echarts/charts'
import {
    GridComponent,
    TooltipComponent,
    MarkLineComponent,
    MarkAreaComponent,
    DataZoomComponent,
    GraphicComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { Panel } from '@/shared/components/ui/Panel'
import { useAppStore } from '@/shared/state/store'
import { useTheme } from '@/shared/theme/ThemeProvider'
import {
    calculateMemberStatistics
} from '../utils/statsCalculations'
import { getChartThemeColors, getRoleColor, getCohortColor, SEMANTIC_COLORS } from '../utils/chartTheme'
import { stripCohort, extractCohort } from '@/shared/utils/assignment'
import type { RoleKey } from '@/shared/types'
import { RoleKeys } from '@/shared/types'
import type { EChartsOption } from 'echarts'

// ECharts 모듈 등록
echarts.use([
    ScatterChart,
    EffectScatterChart,
    CustomChart,
    GridComponent,
    TooltipComponent,
    MarkLineComponent,
    MarkAreaComponent,
    DataZoomComponent,
    GraphicComponent,
    CanvasRenderer
])

// 필터 타입
type FilterType = 'all' | RoleKey

// 편차 레벨 및 색상
const getDeviationLevel = (deviation: number): {
    level: 'negative' | 'balanced' | 'positive'
    label: string
    color: { light: string; dark: string }
} => {
    if (deviation <= -30) {
        return { level: 'negative', label: '과소배정', color: SEMANTIC_COLORS.danger }
    } else if (deviation >= 30) {
        return { level: 'positive', label: '과다배정', color: SEMANTIC_COLORS.info }
    }
    return { level: 'balanced', label: '균형', color: SEMANTIC_COLORS.success }
}

interface MemberDeviationData {
    name: string
    displayName: string
    cohort: number | null
    attendedWeeks: number
    totalAssignments: number
    roleAssignments: Record<RoleKey, number>
    expectedRate: number // 평균 기대 배정률
    actualRate: number   // 실제 배정률
    deviation: number    // 편차 (%)
    roleDeviations: Record<RoleKey, number> // 역할별 편차
}

export default function AssignmentDeviationChart() {
    const app = useAppStore((s) => s.app)
    const { effectiveTheme } = useTheme()
    const isDark = effectiveTheme === 'dark'

    const [activeFilter, setActiveFilter] = useState<FilterType>('all')

    // 공통 테마 색상 사용
    const themeColors = useMemo(() => getChartThemeColors(isDark), [isDark])

    // 멤버별 편차 데이터 계산
    const deviationData = useMemo((): MemberDeviationData[] | null => {
        const stats = calculateMemberStatistics(app, false)
        if (!stats || stats.length === 0) return null

        // 평균 배정률 계산 (출석 주당 배정 횟수)
        const membersWithAttendance = stats.filter(s => s.attendedWeeks > 0)
        if (membersWithAttendance.length === 0) return null

        const avgRate = membersWithAttendance.reduce(
            (sum, s) => sum + (s.totalAssignments / s.attendedWeeks),
            0
        ) / membersWithAttendance.length

        // 역할별 평균 배정률 계산 (해당 역할 경험자 기준)
        const roleAvgRates: Record<RoleKey, number> = {} as Record<RoleKey, number>
        RoleKeys.forEach(role => {
            const membersWithRole = membersWithAttendance.filter(s => s.roleCounts[role] > 0)
            if (membersWithRole.length > 0) {
                roleAvgRates[role] = membersWithRole.reduce(
                    (sum, s) => sum + (s.roleCounts[role] / s.attendedWeeks),
                    0
                ) / membersWithRole.length
            } else {
                roleAvgRates[role] = 0
            }
        })

        return membersWithAttendance.map(s => {
            const actualRate = s.totalAssignments / s.attendedWeeks
            const deviation = avgRate > 0 ? ((actualRate - avgRate) / avgRate) * 100 : 0

            // 역할별 편차 계산
            const roleDeviations: Record<RoleKey, number> = {} as Record<RoleKey, number>
            RoleKeys.forEach(role => {
                const roleRate = s.roleCounts[role] / s.attendedWeeks
                if (roleAvgRates[role] > 0 && s.roleCounts[role] > 0) {
                    roleDeviations[role] = ((roleRate - roleAvgRates[role]) / roleAvgRates[role]) * 100
                } else if (s.roleCounts[role] === 0 && roleAvgRates[role] > 0) {
                    roleDeviations[role] = -100 // 해당 역할 경험 없음
                } else {
                    roleDeviations[role] = 0
                }
            })

            return {
                name: s.name,
                displayName: stripCohort(s.name),
                cohort: extractCohort(s.name),
                attendedWeeks: s.attendedWeeks,
                totalAssignments: s.totalAssignments,
                roleAssignments: s.roleCounts,
                expectedRate: avgRate,
                actualRate,
                deviation,
                roleDeviations
            }
        })
    }, [app])

    // 필터된 데이터 가져오기
    const getFilteredDeviation = useCallback((data: MemberDeviationData[], filter: FilterType) => {
        if (filter === 'all') {
            return data.map(d => ({ ...d, currentDeviation: d.deviation }))
        }
        // 특정 역할 필터: 해당 역할의 경험이 있는 멤버만
        return data
            .filter(d => d.roleAssignments[filter as RoleKey] > 0)
            .map(d => ({ ...d, currentDeviation: d.roleDeviations[filter as RoleKey] }))
    }, [])

    // ECharts 옵션 생성
    const option = useMemo((): EChartsOption | null => {
        if (!deviationData || deviationData.length === 0) return null

        const filteredData = getFilteredDeviation(deviationData, activeFilter)
        if (filteredData.length === 0) return null

        // 편차 범위 계산 (symmetrical)
        const maxAbsDeviation = Math.max(
            ...filteredData.map(d => Math.abs(d.currentDeviation)),
            50 // 최소 ±50%
        )
        const axisMax = Math.ceil(maxAbsDeviation / 10) * 10 + 10

        // 세로 위치 계산 (Beeswarm 배치를 위한 힘 기반 시뮬레이션 간단 버전)
        // 비슷한 deviation 값을 가진 점들이 겹치지 않도록 y값을 조정
        const calculateYPositions = () => {
            const sortedData = [...filteredData].sort((a, b) => a.currentDeviation - b.currentDeviation)
            const positions: { x: number; y: number; data: typeof filteredData[0] }[] = []
            const minDistance = 0.8 // y축 최소 거리

            sortedData.forEach(d => {
                let y = 0
                const x = d.currentDeviation

                // 근처에 있는 다른 점들과 충돌 확인 및 y 조정
                const nearbyPoints = positions.filter(p =>
                    Math.abs(p.x - x) < 15 // deviation이 15% 이내
                )

                if (nearbyPoints.length > 0) {
                    // 위아래로 번갈아가며 배치
                    const occupiedYs = nearbyPoints.map(p => p.y)
                    let testY = 0
                    let direction = 1
                    let offset = 0

                    while (occupiedYs.some(oy => Math.abs(oy - testY) < minDistance)) {
                        offset += minDistance
                        testY = offset * direction
                        direction *= -1
                    }
                    y = testY
                }

                positions.push({ x, y, data: d })
            })

            return positions
        }

        const positions = calculateYPositions()

        // 시리즈 데이터 생성
        const seriesData = positions.map(pos => {
            const d = pos.data
            const devLevel = getDeviationLevel(d.currentDeviation)
            const cohortColor = getCohortColor(d.cohort, isDark)

            return {
                value: [pos.x, pos.y],
                name: d.displayName,
                itemStyle: {
                    color: cohortColor,
                    borderColor: devLevel.color[isDark ? 'dark' : 'light'],
                    borderWidth: 2,
                    shadowBlur: 8,
                    shadowColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.15)',
                    opacity: 0.95
                },
                label: {
                    show: true,
                    position: 'top' as const,
                    distance: 8,
                    formatter: d.displayName,
                    fontSize: 11,
                    fontWeight: 500,
                    color: themeColors.textPrimary,
                },
                memberData: d
            }
        })

        // Highlight extremes
        const extremeNegative = positions.filter(p => p.data.currentDeviation <= -30)
        const extremePositive = positions.filter(p => p.data.currentDeviation >= 30)

        const effectScatterData = [...extremeNegative, ...extremePositive].map(pos => {
            const d = pos.data
            const devLevel = getDeviationLevel(d.currentDeviation)
            return {
                value: [pos.x, pos.y],
                itemStyle: {
                    color: devLevel.color[isDark ? 'dark' : 'light'],
                }
            }
        })

        return {
            animation: true,
            animationDuration: 800,
            animationEasing: 'cubicOut',
            tooltip: {
                trigger: 'item',
                formatter: (params: any) => {
                    const d = params.data?.memberData
                    if (!d) return ''

                    const devLevel = getDeviationLevel(d.currentDeviation)
                    const sign = d.currentDeviation >= 0 ? '+' : ''

                    let html = `
						<div style="font-weight: 700; font-size: 15px; margin-bottom: 8px; color: ${themeColors.textPrimary}; display: flex; align-items: center; gap: 8px;">
							${d.displayName}
							<span style="font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 4px; background: ${devLevel.color[isDark ? 'dark' : 'light']}20; color: ${devLevel.color[isDark ? 'dark' : 'light']};">${devLevel.label}</span>
						</div>
					`

                    html += `
						<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; margin-bottom: 12px; font-size: 12px;">
							<div style="color: ${themeColors.textSecondary};">편차</div>
							<div style="font-weight: 600; color: ${devLevel.color[isDark ? 'dark' : 'light']};">${sign}${d.currentDeviation.toFixed(1)}%</div>
							<div style="color: ${themeColors.textSecondary};">출석</div>
							<div style="font-weight: 500; color: ${themeColors.textPrimary};">${d.attendedWeeks}주</div>
							<div style="color: ${themeColors.textSecondary};">배정</div>
							<div style="font-weight: 500; color: ${themeColors.textPrimary};">${d.totalAssignments}회 (주당 ${d.actualRate.toFixed(2)})</div>
						</div>
					`

                    // 역할별 배정 현황
                    html += `<div style="font-size: 11px; color: ${themeColors.textMuted}; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">역할별 배정</div>`
                    html += `<div style="display: flex; flex-wrap: wrap; gap: 4px;">`

                    RoleKeys.forEach(role => {
                        const count = d.roleAssignments[role]
                        if (count > 0) {
                            const roleColor = getRoleColor(role, isDark)
                            html += `<span style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 4px; background: ${roleColor}20; font-size: 11px;">
								<span style="width: 6px; height: 6px; border-radius: 2px; background: ${roleColor};"></span>
								<span style="color: ${themeColors.textPrimary};">${role}</span>
								<span style="font-weight: 600; color: ${roleColor};">${count}</span>
							</span>`
                        }
                    })

                    html += `</div>`

                    return html
                },
                backgroundColor: themeColors.tooltipBg,
                borderColor: themeColors.border,
                borderWidth: 1,
                padding: [14, 18],
                textStyle: {
                    color: themeColors.textPrimary,
                    fontSize: 13
                },
                extraCssText: 'box-shadow: 0 8px 32px rgba(0,0,0,0.12); border-radius: 12px; backdrop-filter: blur(8px);'
            },
            grid: {
                left: 60,
                right: 60,
                top: 50,
                bottom: 60
            },
            xAxis: {
                type: 'value',
                name: '평균 대비 편차 (%)',
                nameLocation: 'middle',
                nameGap: 35,
                nameTextStyle: {
                    color: themeColors.textSecondary,
                    fontSize: 12,
                    fontWeight: 500
                },
                min: -axisMax,
                max: axisMax,
                splitNumber: 8,
                axisLine: {
                    show: true,
                    lineStyle: {
                        color: themeColors.border
                    }
                },
                axisTick: { show: false },
                axisLabel: {
                    color: themeColors.textMuted,
                    fontSize: 11,
                    formatter: (val: number) => `${val > 0 ? '+' : ''}${val}%`
                },
                splitLine: {
                    lineStyle: {
                        color: themeColors.gridLine,
                        type: 'dashed'
                    }
                }
            },
            yAxis: {
                type: 'value',
                show: false,
                min: -5,
                max: 5
            },
            series: [
                // 배경 영역 표시용 커스텀 시리즈
                {
                    type: 'custom',
                    renderItem: (params, api) => {
                        if (!params || !api) return { type: 'group', children: [] }
                        const coordSys = params.coordSys as unknown as { x: number; y: number; width: number; height: number }

                        // @ts-ignore - ECharts API
                        const x0 = api.coord([-30, 0])[0]
                        // @ts-ignore
                        const x1 = api.coord([30, 0])[0]
                        // @ts-ignore
                        const xMin = api.coord([-axisMax, 0])[0]
                        // @ts-ignore
                        const xMax = api.coord([axisMax, 0])[0]

                        const y = coordSys.y
                        const height = coordSys.height

                        return {
                            type: 'group',
                            children: [
                                // 과소배정 영역 (좌측)
                                {
                                    type: 'rect',
                                    shape: {
                                        x: xMin,
                                        y: y,
                                        width: x0 - xMin,
                                        height: height
                                    },
                                    style: {
                                        fill: themeColors.negativeZone
                                    },
                                    z: 0
                                },
                                // 균형 영역 (중앙)
                                {
                                    type: 'rect',
                                    shape: {
                                        x: x0,
                                        y: y,
                                        width: x1 - x0,
                                        height: height
                                    },
                                    style: {
                                        fill: themeColors.balancedZone
                                    },
                                    z: 0
                                },
                                // 과다배정 영역 (우측)
                                {
                                    type: 'rect',
                                    shape: {
                                        x: x1,
                                        y: y,
                                        width: xMax - x1,
                                        height: height
                                    },
                                    style: {
                                        fill: themeColors.positiveZone
                                    },
                                    z: 0
                                }
                            ]
                        }
                    },
                    data: [[0, 0]],
                    z: -1,
                    silent: true
                },
                // 중앙선
                {
                    type: 'scatter',
                    data: [],
                    markLine: {
                        silent: true,
                        symbol: 'none',
                        lineStyle: {
                            color: themeColors.accent,
                            width: 2,
                            type: 'solid'
                        },
                        label: {
                            show: true,
                            position: 'insideStartTop',
                            formatter: '평균',
                            color: themeColors.accent,
                            fontSize: 11,
                            fontWeight: 600,
                            backgroundColor: themeColors.surface,
                            padding: [4, 8],
                            borderRadius: 4
                        },
                        data: [{ xAxis: 0 }]
                    }
                },
                // 메인 산점도
                {
                    type: 'scatter',
                    data: seriesData,
                    symbolSize: 18,
                    emphasis: {
                        scale: 1.5,
                        itemStyle: {
                            shadowBlur: 16,
                            shadowColor: 'rgba(0,0,0,0.3)'
                        }
                    },
                    z: 2
                },
                // 극단값 효과
                ...(effectScatterData.length > 0 ? [{
                    type: 'effectScatter' as const,
                    data: effectScatterData,
                    symbolSize: 22,
                    showEffectOn: 'render' as const,
                    rippleEffect: {
                        period: 3,
                        scale: 2.5,
                        brushType: 'stroke' as const
                    },
                    z: 3
                }] : [])
            ],
            graphic: [
                // 좌측 라벨
                {
                    type: 'text',
                    left: 20,
                    top: 'center',
                    style: {
                        text: '과소\n배정',
                        fill: isDark ? '#f87171' : '#ef4444',
                        fontSize: 12,
                        fontWeight: 600,
                        textAlign: 'center',
                        lineHeight: 18
                    }
                },
                // 우측 라벨
                {
                    type: 'text',
                    right: 20,
                    top: 'center',
                    style: {
                        text: '과다\n배정',
                        fill: isDark ? '#60a5fa' : '#3b82f6',
                        fontSize: 12,
                        fontWeight: 600,
                        textAlign: 'center',
                        lineHeight: 18
                    }
                }
            ] as any
        }
    }, [deviationData, activeFilter, isDark, themeColors, getFilteredDeviation])

    // 필터 버튼 컴포넌트
    const FilterButton = ({ filter, label }: { filter: FilterType; label: string }) => {
        const isActive = activeFilter === filter
        const roleColor = filter !== 'all' ? getRoleColor(filter as RoleKey, isDark) : themeColors.accent

        return (
            <button
                onClick={() => setActiveFilter(filter)}
                className={`
					px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
					${isActive
                        ? 'text-white shadow-md'
                        : 'text-[var(--color-label-secondary)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-label-primary)]'
                    }
				`}
                style={{
                    background: isActive ? roleColor : 'transparent',
                    boxShadow: isActive ? `0 4px 12px ${roleColor}40` : 'none'
                }}
            >
                {label}
            </button>
        )
    }

    // 빈 데이터 처리
    if (!deviationData || deviationData.length === 0) {
        return (
            <Panel className="p-6">
                <h3 className="m-0 mb-2 text-base font-semibold text-[var(--color-label-primary)]">
                    배정 편차 분석
                </h3>
                <p className="m-0 text-sm text-[var(--color-label-secondary)]">
                    배정 데이터가 없습니다. 배정 탭에서 주차별 배정을 진행해주세요.
                </p>
            </Panel>
        )
    }

    // 통계 요약
    const filteredData = getFilteredDeviation(deviationData, activeFilter)
    const underassigned = filteredData.filter(d => d.currentDeviation <= -30).length
    const balanced = filteredData.filter(d => d.currentDeviation > -30 && d.currentDeviation < 30).length
    const overassigned = filteredData.filter(d => d.currentDeviation >= 30).length

    return (
        <Panel className="p-6">
            {/* 헤더 */}
            <div className="mb-4">
                <h3 className="m-0 mb-1 text-base font-semibold text-[var(--color-label-primary)]">
                    배정 편차 분석
                </h3>
                <p className="m-0 text-sm text-[var(--color-label-secondary)]">
                    평균 대비 각 팀원의 배정률 편차를 시각화합니다. 점이 중앙(0%)에 가까울수록 균형 잡힌 배정입니다.
                </p>
            </div>

            {/* 필터 탭 및 요약 */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 p-4 bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-xl">
                {/* 필터 버튼 */}
                <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[var(--color-surface-elevated)] rounded-lg">
                    <FilterButton filter="all" label="전체" />
                    {RoleKeys.map(role => (
                        <FilterButton key={role} filter={role} label={role} />
                    ))}
                </div>

                {/* 요약 통계 */}
                <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: isDark ? '#f87171' : '#ef4444' }} />
                        <span className="text-[var(--color-label-secondary)]">과소</span>
                        <span className="font-semibold text-[var(--color-label-primary)]">{underassigned}명</span>
                    </div>
                    <div className="w-px h-4 bg-[var(--color-border-subtle)]" />
                    <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: isDark ? '#34d399' : '#10b981' }} />
                        <span className="text-[var(--color-label-secondary)]">균형</span>
                        <span className="font-semibold text-[var(--color-label-primary)]">{balanced}명</span>
                    </div>
                    <div className="w-px h-4 bg-[var(--color-border-subtle)]" />
                    <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: isDark ? '#60a5fa' : '#3b82f6' }} />
                        <span className="text-[var(--color-label-secondary)]">과다</span>
                        <span className="font-semibold text-[var(--color-label-primary)]">{overassigned}명</span>
                    </div>
                </div>
            </div>

            {/* 차트 */}
            {option && (
                <div className="rounded-xl border border-[var(--color-border-subtle)] overflow-hidden bg-[var(--color-canvas)]">
                    <ReactEChartsCore
                        echarts={echarts}
                        option={option}
                        style={{ height: 360, width: '100%' }}
                        opts={{ renderer: 'canvas' }}
                        notMerge={true}
                        lazyUpdate={true}
                        theme={isDark ? 'dark' : undefined}
                    />
                </div>
            )}

            {/* 범례 */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-[var(--color-label-tertiary)]">
                <span className="font-medium text-[var(--color-label-secondary)]">기수별 색상:</span>
                {[15, 16, 17, 18, 19, 20, 21].map(cohort => (
                    <div key={cohort} className="flex items-center gap-1">
                        <span
                            className="w-3 h-3 rounded-full border border-[var(--color-border-subtle)]"
                            style={{ background: getCohortColor(cohort, isDark) }}
                        />
                        <span>{cohort}기</span>
                    </div>
                ))}
            </div>
        </Panel>
    )
}
