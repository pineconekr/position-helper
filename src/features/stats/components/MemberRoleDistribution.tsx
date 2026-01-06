'use client'

import { useMemo, useState } from 'react'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import { BarChart, PieChart } from 'echarts/charts'
import {
	GridComponent,
	TooltipComponent,
	LegendComponent,
	PolarComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { Panel } from '@/shared/components/ui/Panel'
import { useAppStore } from '@/shared/state/store'
import { useTheme } from '@/shared/theme/ThemeProvider'
import {
	calculateMemberRoleHeatmap
} from '../utils/statsCalculations'
import { getChartThemeColors, getRoleColor } from '../utils/chartTheme'
import { stripCohort, extractCohort } from '@/shared/utils/assignment'
import type { RoleKey } from '@/shared/types'
import { RoleKeys } from '@/shared/types'

// ECharts 모듈 등록
echarts.use([BarChart, PieChart, GridComponent, TooltipComponent, LegendComponent, PolarComponent, CanvasRenderer])

// 정렬 타입
type SortType = 'total' | 'rate' | 'cohort'

// 역할별 그라데이션 (더 부드러운 효과)
const getRoleGradient = (role: RoleKey, isDark: boolean) => {
	const color = getRoleColor(role, isDark)
	return new echarts.graphic.LinearGradient(0, 0, 1, 0, [
		{ offset: 0, color: color },
		{ offset: 0.5, color: color },
		{ offset: 1, color: isDark ? `${color}90` : `${color}b0` }
	])
}

interface MemberData {
	name: string
	displayName: string
	cohort: number | null
	roleCounts: Record<RoleKey, number>
	totalCount: number
	attendedWeeks: number
	assignmentRate: number
}

export default function MemberRoleDistribution() {
	const app = useAppStore((s) => s.app)
	const { effectiveTheme } = useTheme()
	const isDark = effectiveTheme === 'dark'

	const [sortType, setSortType] = useState<SortType>('total')

	// 공통 테마 색상 사용
	const themeColors = useMemo(() => getChartThemeColors(isDark), [isDark])

	// 팀원별 역할 배정 데이터 계산
	const chartData = useMemo((): MemberData[] | null => {
		const heatmapData = calculateMemberRoleHeatmap(app, false)

		if (!heatmapData || (heatmapData.members || []).length === 0) {
			return null
		}

		// 팀원별로 역할 카운트를 집계
		return heatmapData.members.map(memberName => {
			const memberData = heatmapData.data.filter(d => d.memberName === memberName)
			const roleCountMap: Record<RoleKey, number> = {} as Record<RoleKey, number>
			let totalCount = 0

			RoleKeys.forEach(role => {
				const roleData = memberData.find(d => d.role === role)
				const count = roleData?.count || 0
				roleCountMap[role] = count
				totalCount += count
			})

			const attendedWeeks = memberData[0]?.attendedWeeks || 0
			const assignmentRate = attendedWeeks > 0 ? totalCount / attendedWeeks : 0

			return {
				name: memberName,
				displayName: stripCohort(memberName),
				cohort: extractCohort(memberName),
				roleCounts: roleCountMap,
				totalCount,
				attendedWeeks,
				assignmentRate
			}
		})
	}, [app])

	// 정렬된 데이터
	const sortedData = useMemo(() => {
		if (!chartData) return null

		return [...chartData].sort((a, b) => {
			switch (sortType) {
				case 'total':
					return b.totalCount - a.totalCount
				case 'rate':
					return b.assignmentRate - a.assignmentRate
				case 'cohort':
					return (a.cohort || 99) - (b.cohort || 99)
				default:
					return 0
			}
		})
	}, [chartData, sortType])

	// 역할별 총계 계산
	const roleTotals = useMemo(() => {
		if (!chartData) return null

		const totals: Record<RoleKey, number> = {} as Record<RoleKey, number>
		RoleKeys.forEach(role => {
			totals[role] = chartData.reduce((sum, m) => sum + m.roleCounts[role], 0)
		})

		return totals
	}, [chartData])

	const option = useMemo(() => {
		if (!sortedData || sortedData.length === 0) {
			return null
		}

		// Y축 데이터 (팀원 이름)
		const yAxisData = sortedData.map(m => m.displayName)

		// 각 역할별 series 데이터 (rounded bar 효과)
		const series = RoleKeys.map((role, roleIdx) => ({
			name: role,
			type: 'bar' as const,
			stack: 'total',
			emphasis: {
				focus: 'series' as const,
				blurScope: 'coordinateSystem' as const
			},
			itemStyle: {
				color: getRoleGradient(role, isDark),
				borderRadius: roleIdx === RoleKeys.length - 1 ? [0, 6, 6, 0] : roleIdx === 0 ? [6, 0, 0, 6] : 0,
				shadowBlur: 4,
				shadowColor: `${getRoleColor(role, isDark)}30`,
			},
			label: {
				show: true,
				position: 'inside' as const,
				formatter: (params: any) => {
					const value = params.value
					return value > 0 ? String(value) : ''
				},
				fontSize: 11,
				fontWeight: 600,
				color: '#fff',
				textShadowColor: 'rgba(0,0,0,0.3)',
				textShadowBlur: 2
			},
			barWidth: 28,
			barGap: '-100%',
			data: sortedData.map(m => m.roleCounts[role])
		}))

		return {
			animation: true,
			animationDuration: 800,
			animationEasing: 'elasticOut',
			tooltip: {
				trigger: 'axis' as const,
				axisPointer: {
					type: 'shadow' as const,
					shadowStyle: {
						color: isDark ? 'rgba(96, 165, 250, 0.08)' : 'rgba(59, 130, 246, 0.06)'
					}
				},
				formatter: (params: any) => {
					if (!params || params.length === 0) return ''

					const memberIndex = params[0].dataIndex
					const member = sortedData[memberIndex]

					let html = `
						<div style="font-weight: 700; font-size: 15px; margin-bottom: 8px; color: ${themeColors.textPrimary}; display: flex; align-items: center; gap: 8px;">
							${member.displayName}
							${member.cohort ? `<span style="font-size: 11px; font-weight: 400; color: ${themeColors.textMuted}; padding: 2px 6px; background: ${themeColors.surfaceElevated}; border-radius: 4px;">${member.cohort}기</span>` : ''}
						</div>
					`

					// 요약 정보
					html += `
						<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px; padding: 10px; background: ${themeColors.surfaceElevated}; border-radius: 8px;">
							<div style="text-align: center;">
								<div style="font-size: 18px; font-weight: 700; color: ${themeColors.accent};">${member.totalCount}</div>
								<div style="font-size: 10px; color: ${themeColors.textMuted};">총 배정</div>
							</div>
							<div style="text-align: center;">
								<div style="font-size: 18px; font-weight: 700; color: ${themeColors.textPrimary};">${member.attendedWeeks}</div>
								<div style="font-size: 10px; color: ${themeColors.textMuted};">출석 주</div>
							</div>
							<div style="text-align: center;">
								<div style="font-size: 18px; font-weight: 700; color: ${themeColors.textPrimary};">${member.assignmentRate.toFixed(2)}</div>
								<div style="font-size: 10px; color: ${themeColors.textMuted};">주당 배정</div>
							</div>
						</div>
					`

					// 역할별 배정 현황
					html += `<div style="display: flex; flex-wrap: wrap; gap: 6px;">`
					params.forEach((param: any) => {
						if (param.value > 0) {
							const role = param.seriesName
							const percentage = member.attendedWeeks > 0
								? ((param.value / member.attendedWeeks) * 100).toFixed(0)
								: '0'

							html += `
								<div style="display: flex; align-items: center; gap: 6px; padding: 6px 10px; background: ${param.color.colorStops ? param.color.colorStops[0].color : param.color}15; border-radius: 6px; border: 1px solid ${param.color.colorStops ? param.color.colorStops[0].color : param.color}30;">
									<span style="width: 8px; height: 8px; border-radius: 3px; background: ${param.color.colorStops ? param.color.colorStops[0].color : param.color};"></span>
									<span style="font-weight: 600; color: ${themeColors.textPrimary};">${role}</span>
									<span style="font-weight: 700; color: ${param.color.colorStops ? param.color.colorStops[0].color : param.color};">${param.value}</span>
									<span style="font-size: 10px; color: ${themeColors.textMuted};">(${percentage}%)</span>
								</div>
							`
						}
					})
					html += `</div>`

					return html
				},
				backgroundColor: themeColors.tooltipBg,
				borderColor: themeColors.border,
				borderWidth: 1,
				textStyle: {
					color: themeColors.textPrimary,
					fontSize: 13
				},
				padding: [16, 20],
				extraCssText: 'box-shadow: 0 12px 48px rgba(0,0,0,0.15); border-radius: 14px; backdrop-filter: blur(12px);'
			},
			legend: {
				show: false // 상단에 별도로 표시
			},
			grid: {
				left: 90,
				right: 24,
				top: 16,
				bottom: 16
			},
			xAxis: {
				type: 'value' as const,
				axisLine: { show: false },
				axisTick: { show: false },
				splitLine: {
					lineStyle: {
						color: themeColors.gridLine,
						type: 'dashed' as const
					}
				},
				axisLabel: {
					color: themeColors.textMuted,
					fontSize: 11,
					formatter: (value: number) => `${value}`
				}
			},
			yAxis: {
				type: 'category' as const,
				data: yAxisData,
				inverse: true,
				axisLine: { show: false },
				axisTick: { show: false },
				axisLabel: {
					color: themeColors.textPrimary,
					fontSize: 12,
					fontWeight: 600,
					margin: 12
				}
			},
			series
		}
	}, [sortedData, isDark, themeColors])

	// 빈 데이터 처리
	if (!sortedData || sortedData.length === 0) {
		return (
			<Panel className="p-6">
				<h3 className="m-0 mb-2 text-base font-semibold text-[var(--color-label-primary)]">
					팀원별 역할 배정 분포
				</h3>
				<p className="m-0 text-sm text-[var(--color-label-secondary)]">
					배정 데이터가 없습니다. 배정 탭에서 주차별 배정을 진행해주세요.
				</p>
			</Panel>
		)
	}

	const chartHeight = Math.max(320, sortedData.length * 44 + 60)
	const totalAssignments = sortedData.reduce((sum, m) => sum + m.totalCount, 0)
	const avgRate = sortedData.length > 0
		? (sortedData.reduce((sum, m) => sum + m.assignmentRate, 0) / sortedData.length).toFixed(2)
		: '0'

	// 정렬 버튼 컴포넌트
	const SortButton = ({ type, label }: { type: SortType; label: string }) => {
		const isActive = sortType === type
		return (
			<button
				onClick={() => setSortType(type)}
				className={`
					px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
					${isActive
						? 'bg-[var(--color-accent)] text-white shadow-md'
						: 'text-[var(--color-label-secondary)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-label-primary)]'
					}
				`}
				style={{
					boxShadow: isActive ? `0 4px 12px ${themeColors.accent}40` : 'none'
				}}
			>
				{label}
			</button>
		)
	}

	return (
		<Panel className="p-6">
			{/* 헤더 */}
			<div className="mb-4">
				<h3 className="m-0 mb-1 text-base font-semibold text-[var(--color-label-primary)]">
					팀원별 역할 배정 분포
				</h3>
				<p className="m-0 text-sm text-[var(--color-label-secondary)]">
					각 팀원이 역할별로 몇 번 배정받았는지 보여줍니다. 막대가 길수록 총 배정 횟수가 많습니다.
				</p>
			</div>

			{/* 요약 통계 및 컨트롤 */}
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 p-4 bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-xl">
				{/* 통계 */}
				<div className="flex flex-wrap items-center gap-4">
					{/* 총 배정 */}
					<div className="flex items-center gap-2">
						<div className="w-10 h-10 rounded-xl bg-[var(--color-accent)]/10 flex items-center justify-center">
							<span className="text-lg font-bold text-[var(--color-accent)]">{totalAssignments}</span>
						</div>
						<div>
							<div className="text-xs text-[var(--color-label-tertiary)]">총 배정</div>
							<div className="text-sm font-semibold text-[var(--color-label-primary)]">{sortedData.length}명</div>
						</div>
					</div>

					<div className="w-px h-8 bg-[var(--color-border-subtle)]" />

					{/* 평균 주당 배정 */}
					<div className="flex items-center gap-2">
						<div className="text-xs text-[var(--color-label-tertiary)]">평균 주당</div>
						<div className="text-lg font-bold text-[var(--color-label-primary)]">{avgRate}</div>
						<div className="text-xs text-[var(--color-label-tertiary)]">회</div>
					</div>

					<div className="w-px h-8 bg-[var(--color-border-subtle)]" />

					{/* 역할별 배정 현황 (미니 도넛) */}
					{roleTotals && (
						<div className="flex items-center gap-2">
							{RoleKeys.map(role => (
								<div key={role} className="flex flex-col items-center gap-0.5">
									<div
										className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
										style={{ background: getRoleColor(role, isDark) }}
									>
										{roleTotals[role]}
									</div>
									<span className="text-[9px] text-[var(--color-label-tertiary)]">{role}</span>
								</div>
							))}
						</div>
					)}
				</div>

				{/* 정렬 컨트롤 */}
				<div className="flex items-center gap-1.5 p-1 bg-[var(--color-surface-elevated)] rounded-lg">
					<SortButton type="total" label="배정순" />
					<SortButton type="rate" label="배정률순" />
					<SortButton type="cohort" label="기수순" />
				</div>
			</div>

			{/* 차트 */}
			{option && (
				<div className="rounded-xl border border-[var(--color-border-subtle)] overflow-hidden bg-[var(--color-canvas)]">
					<ReactEChartsCore
						echarts={echarts}
						option={option}
						style={{ height: chartHeight, width: '100%' }}
						opts={{ renderer: 'canvas' }}
						notMerge={true}
						lazyUpdate={true}
						theme={isDark ? 'dark' : undefined}
					/>
				</div>
			)}

			{/* 하단 범례 */}
			<div className="mt-4 flex flex-wrap items-center justify-center gap-4">
				{RoleKeys.map(role => (
					<div key={role} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-subtle)]">
						<div
							className="w-3 h-3 rounded-md"
							style={{ background: getRoleColor(role, isDark) }}
						/>
						<span className="text-sm font-medium text-[var(--color-label-primary)]">{role}</span>
						{roleTotals && (
							<span className="text-xs text-[var(--color-label-tertiary)]">({roleTotals[role]}회)</span>
						)}
					</div>
				))}
			</div>
		</Panel>
	)
}
