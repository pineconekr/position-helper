'use client'

import { useMemo, useEffect, useState } from 'react'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import { BarChart } from 'echarts/charts'
import {
	GridComponent,
	TooltipComponent,
	LegendComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { Panel } from '@/shared/components/ui/Panel'
import { useAppStore } from '@/shared/state/store'
import {
	calculateMemberRoleHeatmap,
	extractDisplayName,
	getCSSColor
} from '../utils/statsCalculations'
import type { RoleKey } from '@/shared/types'
import { RoleKeys } from '@/shared/types'

// ECharts 모듈 등록
echarts.use([BarChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

// 역할별 색상 매핑
const ROLE_COLORS: Record<RoleKey, string> = {
	'SW': '--data-series-1',
	'자막': '--data-series-2',
	'고정': '--data-series-3',
	'사이드': '--data-series-4',
	'스케치': '--data-series-5'
}

export default function MemberRoleDistribution() {
	const app = useAppStore((s) => s.app)
	const [colors, setColors] = useState<Record<string, string>>({})

	// CSS 변수에서 색상 추출 (클라이언트에서만)
	useEffect(() => {
		const extractedColors: Record<string, string> = {
			'--color-text-primary': getCSSColor('--color-text-primary'),
			'--color-text-muted': getCSSColor('--color-text-muted'),
			'--color-border-subtle': getCSSColor('--color-border-subtle'),
			'--color-surface-2': getCSSColor('--color-surface-2'),
			'--data-series-1': getCSSColor('--data-series-1'),
			'--data-series-2': getCSSColor('--data-series-2'),
			'--data-series-3': getCSSColor('--data-series-3'),
			'--data-series-4': getCSSColor('--data-series-4'),
			'--data-series-5': getCSSColor('--data-series-5'),
		}
		setColors(extractedColors)
	}, [])

	// 팀원별 역할 배정 데이터 계산
	const chartData = useMemo(() => {
		const heatmapData = calculateMemberRoleHeatmap(app, false)
		
		if (heatmapData.members.length === 0) {
			return null
		}

		// 팀원별로 역할 카운트를 집계
		const memberStats = heatmapData.members.map(memberName => {
			const memberData = heatmapData.data.filter(d => d.memberName === memberName)
			const roleCountMap: Record<RoleKey, number> = {} as Record<RoleKey, number>
			let totalCount = 0

			RoleKeys.forEach(role => {
				const roleData = memberData.find(d => d.role === role)
				const count = roleData?.count || 0
				roleCountMap[role] = count
				totalCount += count
			})

			return {
				name: memberName,
				displayName: extractDisplayName(memberName),
				roleCounts: roleCountMap,
				totalCount,
				attendedWeeks: memberData[0]?.attendedWeeks || 0
			}
		})

		// 총 배정 횟수 기준 내림차순 정렬
		memberStats.sort((a, b) => b.totalCount - a.totalCount)

		return memberStats
	}, [app])

	const option = useMemo(() => {
		if (!chartData || chartData.length === 0 || Object.keys(colors).length === 0) {
			return null
		}

		// Y축 데이터 (팀원 이름)
		const yAxisData = chartData.map(m => m.displayName)

		// 각 역할별 series 데이터
		const series = RoleKeys.map(role => ({
			name: role,
			type: 'bar' as const,
			stack: 'total',
			emphasis: {
				focus: 'series' as const
			},
			itemStyle: {
				color: colors[ROLE_COLORS[role]] || '#666',
				borderRadius: 0
			},
			label: {
				show: true,
				position: 'inside' as const,
				formatter: (params: any) => {
					const value = params.value
					return value > 0 ? value : ''
				},
				fontSize: 11,
				fontWeight: 600,
				color: '#fff',
				textShadowColor: 'rgba(0,0,0,0.3)',
				textShadowBlur: 2
			},
			data: chartData.map(m => m.roleCounts[role])
		}))

		return {
			tooltip: {
				trigger: 'axis' as const,
				axisPointer: {
					type: 'shadow' as const
				},
				formatter: (params: any) => {
					if (!params || params.length === 0) return ''
					
					const memberIndex = params[0].dataIndex
					const member = chartData[memberIndex]
					
					let html = `<div style="font-weight: 600; margin-bottom: 8px; font-size: 14px;">${member.displayName}</div>`
					html += `<div style="color: ${colors['--color-text-muted']}; font-size: 12px; margin-bottom: 8px;">출석 ${member.attendedWeeks}주 / 총 ${member.totalCount}회 배정</div>`
					
					params.forEach((param: any) => {
						if (param.value > 0) {
							const percentage = member.totalCount > 0 
								? ((param.value / member.totalCount) * 100).toFixed(1) 
								: '0'
							html += `<div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;">
								<span style="display: inline-block; width: 10px; height: 10px; border-radius: 2px; background: ${param.color}"></span>
								<span style="flex: 1;">${param.seriesName}</span>
								<span style="font-weight: 600;">${param.value}회</span>
								<span style="color: ${colors['--color-text-muted']}; font-size: 12px;">(${percentage}%)</span>
							</div>`
						}
					})
					
					return html
				},
				backgroundColor: 'rgba(255, 255, 255, 0.98)',
				borderColor: colors['--color-border-subtle'] || '#e2e8f0',
				borderWidth: 1,
				textStyle: {
					color: colors['--color-text-primary'] || '#0f172a',
					fontSize: 13
				},
				padding: [12, 16],
				extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-radius: 8px;'
			},
			legend: {
				data: RoleKeys,
				bottom: 0,
				itemWidth: 16,
				itemHeight: 10,
				itemGap: 20,
				textStyle: {
					color: colors['--color-text-primary'] || '#0f172a',
					fontSize: 12
				}
			},
			grid: {
				left: 80,
				right: 24,
				top: 16,
				bottom: 48
			},
			xAxis: {
				type: 'value' as const,
				axisLine: { show: false },
				axisTick: { show: false },
				splitLine: {
					lineStyle: {
						color: colors['--color-border-subtle'] || '#e2e8f0',
						type: 'dashed' as const
					}
				},
				axisLabel: {
					color: colors['--color-text-muted'] || '#64748b',
					fontSize: 11,
					formatter: (value: number) => `${value}회`
				}
			},
			yAxis: {
				type: 'category' as const,
				data: yAxisData,
				inverse: true,
				axisLine: { show: false },
				axisTick: { show: false },
				axisLabel: {
					color: colors['--color-text-primary'] || '#0f172a',
					fontSize: 12,
					fontWeight: 500
				}
			},
			series
		}
	}, [chartData, colors])

	// 빈 데이터 처리
	if (!chartData || chartData.length === 0) {
		return (
			<Panel style={{ padding: 24 }}>
				<h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 600 }}>
					팀원별 역할 배정 분포
				</h3>
				<p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
					배정 데이터가 없습니다. 배정 탭에서 주차별 배정을 진행해주세요.
				</p>
			</Panel>
		)
	}

	const chartHeight = Math.max(280, chartData.length * 40 + 80)

	// 상위 배정자 하이라이트
	const topMember = chartData[0]
	const totalAssignments = chartData.reduce((sum, m) => sum + m.totalCount, 0)

	return (
		<Panel style={{ padding: 24 }}>
			<div style={{ marginBottom: 16 }}>
				<h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 600 }}>
					팀원별 역할 배정 분포
				</h3>
				<p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
					각 팀원이 역할별로 몇 번 배정받았는지 보여줍니다. 막대가 길수록 총 배정 횟수가 많습니다.
				</p>
			</div>

			{/* 요약 통계 */}
			<div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4 p-3 md:p-4 bg-[var(--color-surface-2)] rounded-lg flex-wrap">
				{/* 총 배정 */}
				<div className="flex items-baseline gap-1.5 shrink-0">
					<span className="text-lg md:text-xl font-bold text-[var(--color-accent)]">
						{totalAssignments}
					</span>
					<span className="text-xs text-[var(--color-text-muted)]">
						총 배정
					</span>
				</div>

				{/* 구분선 */}
				<div className="w-px h-5 bg-[var(--color-border-subtle)]" />

				{/* 최다 배정자 */}
				<div className="flex items-center gap-1.5 shrink-0">
					<span className="text-xs text-[var(--color-text-muted)]">최다 배정</span>
					<span className="text-sm font-semibold text-[var(--color-text-primary)]">
						{topMember.displayName}
					</span>
					<span className="text-xs text-[var(--color-text-muted)]">
						({topMember.totalCount}회)
					</span>
				</div>

				{/* 역할별 색상 레전드 */}
				{RoleKeys.slice(0, 5).map((role) => (
					<div key={role} className="contents">
						<div className="w-px h-5 bg-[var(--color-border-subtle)]" />
						<div className="flex items-center gap-1.5 shrink-0">
							<div 
								className="w-2.5 h-2.5 rounded-sm shrink-0"
								style={{ background: colors[ROLE_COLORS[role]] || '#666' }}
							/>
							<span className="text-xs md:text-[0.8125rem] text-[var(--color-text-primary)]">
								{role}
							</span>
						</div>
					</div>
				))}
			</div>

			{/* 차트 */}
			{option && (
				<div className="rounded-lg border border-[var(--color-border-subtle)]">
					<ReactEChartsCore
						echarts={echarts}
						option={option}
						style={{ height: chartHeight, width: '100%' }}
						opts={{ renderer: 'canvas' }}
						notMerge={true}
						lazyUpdate={true}
					/>
				</div>
			)}
		</Panel>
	)
}

