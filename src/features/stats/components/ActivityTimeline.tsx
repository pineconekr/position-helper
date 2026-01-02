'use client'

import { useMemo, useEffect, useState } from 'react'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import { CustomChart } from 'echarts/charts'
import {
	GridComponent,
	TooltipComponent,
	LegendComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { Panel } from '@/shared/components/ui/Panel'
import { useAppStore } from '@/shared/state/store'
import {
	calculateActivityTimeline,
	extractDisplayName,
	getRoleColor,
	getRoleAbbr,
	getCSSColor,
	type MemberWeekStatus
} from '../utils/statsCalculations'
import type { RoleKey } from '@/shared/types'

// ECharts 모듈 등록
echarts.use([CustomChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

// 역할별 색상 인덱스
const ROLE_COLOR_MAP: Record<RoleKey, string> = {
	'SW': '--data-series-1',
	'자막': '--data-series-2',
	'고정': '--data-series-3',
	'사이드': '--data-series-4',
	'스케치': '--data-series-5'
}

export default function ActivityTimeline() {
	const app = useAppStore((s) => s.app)
	const [colors, setColors] = useState<Record<string, string>>({})

	// CSS 변수에서 색상 추출 (클라이언트에서만)
	useEffect(() => {
		const extractedColors: Record<string, string> = {
			'--data-series-1': getCSSColor('--data-series-1'),
			'--data-series-2': getCSSColor('--data-series-2'),
			'--data-series-3': getCSSColor('--data-series-3'),
			'--data-series-4': getCSSColor('--data-series-4'),
			'--data-series-5': getCSSColor('--data-series-5'),
			'--color-text-muted': getCSSColor('--color-text-muted'),
			'--color-text-subtle': getCSSColor('--color-text-subtle'),
			'--color-text-primary': getCSSColor('--color-text-primary'),
			'--color-surface-2': getCSSColor('--color-surface-2'),
			'--color-critical': getCSSColor('--color-critical'),
			'--color-warning': getCSSColor('--color-warning'),
			'--chart-grid': getCSSColor('--chart-grid'),
			'--color-border-subtle': getCSSColor('--color-border-subtle'),
		}
		setColors(extractedColors)
	}, [])

	const timelineData = useMemo(() => {
		return calculateActivityTimeline(app, false)
	}, [app])

	const option = useMemo(() => {
		if (timelineData.weekDates.length === 0 || timelineData.members.length === 0) {
			return null
		}

		const { formattedDates, members, matrix } = timelineData

		// 셀 크기 계산
		const cellWidth = 56
		const cellHeight = 36

		// 커스텀 시리즈 데이터 생성
		const seriesData: any[] = []

		matrix.forEach((memberRow, memberIdx) => {
			memberRow.forEach((status, weekIdx) => {
				seriesData.push({
					value: [weekIdx, memberIdx],
					status,
					memberName: members[memberIdx],
					weekDate: formattedDates[weekIdx]
				})
			})
		})

		return {
			tooltip: {
				trigger: 'item',
				formatter: (params: any) => {
					const status: MemberWeekStatus = params.data.status
					const displayName = extractDisplayName(status.memberName)
					const weekLabel = params.data.weekDate

					if (status.status === 'absent') {
						const reason = status.absenceReason ? ` (${status.absenceReason})` : ''
						return `<strong>${displayName}</strong> - ${weekLabel}<br/>불참${reason}`
					}

					if (status.status === 'available') {
						return `<strong>${displayName}</strong> - ${weekLabel}<br/>출석 (미배정)`
					}

					const rolesText = status.roles.map(r => r).join(', ')
					const consecutiveWarning = status.isConsecutive 
						? '<br/><span style="color: #f59e0b;">⚠️ 연속 배정</span>' 
						: ''
					return `<strong>${displayName}</strong> - ${weekLabel}<br/>역할: ${rolesText}${consecutiveWarning}`
				},
				backgroundColor: 'rgba(255, 255, 255, 0.95)',
				borderColor: colors['--color-border-subtle'] || '#e2e8f0',
				borderWidth: 1,
				textStyle: {
					color: colors['--color-text-primary'] || '#0f172a',
					fontSize: 13
				},
				padding: [8, 12]
			},
			grid: {
				left: 100,
				right: 20,
				top: 40,
				bottom: 30
			},
			xAxis: {
				type: 'category',
				data: formattedDates,
				position: 'top',
				axisLine: { show: false },
				axisTick: { show: false },
				axisLabel: {
					color: colors['--color-text-muted'] || '#64748b',
					fontSize: 11,
					fontWeight: 500
				},
				splitLine: { show: false }
			},
			yAxis: {
				type: 'category',
				data: members.map(extractDisplayName),
				inverse: true,
				axisLine: { show: false },
				axisTick: { show: false },
				axisLabel: {
					color: colors['--color-text-primary'] || '#0f172a',
					fontSize: 12,
					fontWeight: 600
				},
				splitLine: { show: false }
			},
			series: [{
				type: 'custom',
				renderItem: (params: any, api: any) => {
					const dataIndex = params.dataIndex
					const data = seriesData[dataIndex]
					const status: MemberWeekStatus = data.status

					const [x, y] = api.coord([data.value[0], data.value[1]])
					const width = cellWidth - 4
					const height = cellHeight - 4

					// 기본 스타일
					let fill = 'transparent'
					let stroke = colors['--color-border-subtle'] || '#e2e8f0'
					let strokeWidth = 1
					let text = ''
					let textColor = colors['--color-text-primary'] || '#0f172a'
					let textFontWeight = 600

					if (status.status === 'absent') {
						// 불참: 회색 배경 + X
						fill = colors['--color-surface-2'] || '#f1f5f9'
						stroke = colors['--color-text-subtle'] || '#94a3b8'
						text = '✕'
						textColor = colors['--color-text-subtle'] || '#94a3b8'
					} else if (status.status === 'available') {
						// 출석했지만 미배정: 점선 테두리
						fill = 'transparent'
						stroke = colors['--color-border-subtle'] || '#e2e8f0'
						text = ''
					} else if (status.status === 'assigned') {
						// 배정됨: 역할 색상
						const primaryRole = status.roles[0]
						const roleColorVar = ROLE_COLOR_MAP[primaryRole]
						fill = colors[roleColorVar] || '#4E79A7'
						stroke = 'transparent'
						text = status.roles.map(r => getRoleAbbr(r)).join('+')
						textColor = '#ffffff'

						// 연속 배정 경고
						if (status.isConsecutive) {
							stroke = colors['--color-warning'] || '#f59e0b'
							strokeWidth = 2
						}
					}

					// 다중 역할인 경우 그라데이션 효과 (간단히 첫 번째 색상 사용)
					return {
						type: 'group',
						children: [
							{
								type: 'rect',
								shape: {
									x: x - width / 2,
									y: y - height / 2,
									width,
									height,
									r: 6
								},
								style: {
									fill,
									stroke,
									lineWidth: strokeWidth
								}
							},
							{
								type: 'text',
								style: {
									x,
									y,
									text,
									fill: textColor,
									fontSize: 11,
									fontWeight: textFontWeight,
									textAlign: 'center',
									textVerticalAlign: 'middle'
								}
							}
						]
					}
				},
				data: seriesData,
				z: 2
			}]
		}
	}, [timelineData, colors])

	// 빈 데이터 처리
	if (timelineData.weekDates.length === 0) {
		return (
			<Panel style={{ padding: 24 }}>
				<h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 600 }}>
					주차별 활동 현황
				</h3>
				<p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
					배정 데이터가 없습니다. 배정 탭에서 주차별 배정을 진행해주세요.
				</p>
			</Panel>
		)
	}

	const chartHeight = Math.max(300, timelineData.members.length * 40 + 80)

	return (
		<Panel style={{ padding: 24 }}>
			<div style={{ marginBottom: 16 }}>
				<h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 600 }}>
					주차별 활동 현황
				</h3>
				<p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
					팀원별 배정 이력, 불참 및 연속 근무를 한눈에 확인할 수 있습니다.
				</p>
			</div>

			{/* 범례 */}
			<div style={{ 
				display: 'flex', 
				flexWrap: 'wrap', 
				gap: 16, 
				marginBottom: 16,
				padding: '10px 12px',
				background: 'var(--color-surface-2)',
				borderRadius: 'var(--radius-sm)'
			}}>
				{(['SW', '자막', '고정', '사이드', '스케치'] as RoleKey[]).map(role => (
					<div key={role} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
						<div style={{
							width: 16,
							height: 16,
							borderRadius: 4,
							background: colors[ROLE_COLOR_MAP[role]] || '#666'
						}} />
						<span style={{ fontSize: '0.8125rem', color: 'var(--color-text-primary)' }}>
							{role}
						</span>
					</div>
				))}
				<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
					<div style={{
						width: 16,
						height: 16,
						borderRadius: 4,
						background: 'var(--color-surface-2)',
						border: '1px solid var(--color-text-subtle)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						fontSize: '0.625rem',
						color: 'var(--color-text-subtle)'
					}}>✕</div>
					<span style={{ fontSize: '0.8125rem', color: 'var(--color-text-primary)' }}>
						불참
					</span>
				</div>
				<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
					<div style={{
						width: 16,
						height: 16,
						borderRadius: 4,
						border: '2px solid var(--color-warning)',
						background: 'transparent'
					}} />
					<span style={{ fontSize: '0.8125rem', color: 'var(--color-text-primary)' }}>
						연속 배정
					</span>
				</div>
			</div>

			{option && (
				<ReactEChartsCore
					echarts={echarts}
					option={option}
					style={{ height: chartHeight, width: '100%' }}
					opts={{ renderer: 'canvas' }}
					notMerge={true}
					lazyUpdate={true}
				/>
			)}
		</Panel>
	)
}

