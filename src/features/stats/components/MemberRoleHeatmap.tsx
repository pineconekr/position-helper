'use client'

import { useMemo, useEffect, useState } from 'react'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import { HeatmapChart } from 'echarts/charts'
import {
	GridComponent,
	TooltipComponent,
	VisualMapComponent
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

// ECharts 모듈 등록
echarts.use([HeatmapChart, GridComponent, TooltipComponent, VisualMapComponent, CanvasRenderer])

// 역할 레이블
const ROLE_LABELS: Record<RoleKey, string> = {
	'SW': 'SW',
	'자막': '자막',
	'고정': '고정',
	'사이드': '사이드',
	'스케치': '스케치'
}

export default function MemberRoleHeatmap() {
	const app = useAppStore((s) => s.app)
	const [colors, setColors] = useState<Record<string, string>>({})

	// CSS 변수에서 색상 추출 (클라이언트에서만)
	useEffect(() => {
		const extractedColors: Record<string, string> = {
			'--color-text-primary': getCSSColor('--color-text-primary'),
			'--color-text-muted': getCSSColor('--color-text-muted'),
			'--color-border-subtle': getCSSColor('--color-border-subtle'),
			'--color-accent': getCSSColor('--color-accent'),
			'--color-accent-soft': getCSSColor('--color-accent-soft'),
			'--data-series-1': getCSSColor('--data-series-1'),
		}
		setColors(extractedColors)
	}, [])

	const heatmapData = useMemo(() => {
		return calculateMemberRoleHeatmap(app, false)
	}, [app])

	const option = useMemo(() => {
		if (heatmapData.members.length === 0) {
			return null
		}

		const { members, roles, data, maxRatio } = heatmapData

		// ECharts heatmap 데이터 형식: [x, y, value]
		const seriesData = data.map(d => {
			const xIndex = roles.indexOf(d.role)
			const yIndex = members.indexOf(d.memberName)
			return {
				value: [xIndex, yIndex, d.ratio],
				count: d.count,
				attended: d.attendedWeeks,
				memberName: d.memberName,
				role: d.role
			}
		})

		// 색상 범위 계산 (0% ~ maxRatio, 최소 100%)
		const visualMapMax = Math.max(100, Math.ceil(maxRatio / 10) * 10)

		return {
			tooltip: {
				position: 'top',
				formatter: (params: any) => {
					const { memberName, role, count, attended, value } = params.data
					const ratio = value[2]
					const displayName = extractDisplayName(memberName)
					
					if (attended === 0) {
						return `<strong>${displayName}</strong><br/>
							${ROLE_LABELS[role as RoleKey]}: 출석 기록 없음`
					}
					
					return `<strong>${displayName}</strong><br/>
						${ROLE_LABELS[role as RoleKey]}: ${count}회 / ${attended}주 출석<br/>
						<span style="font-size: 14px; font-weight: 600; color: ${colors['--color-accent'] || '#3b82f6'}">
							배정률 ${ratio.toFixed(1)}%
						</span>`
				},
				backgroundColor: 'rgba(255, 255, 255, 0.95)',
				borderColor: colors['--color-border-subtle'] || '#e2e8f0',
				borderWidth: 1,
				textStyle: {
					color: colors['--color-text-primary'] || '#0f172a',
					fontSize: 13
				},
				padding: [10, 14]
			},
			grid: {
				left: 90,
				right: 80,
				top: 50,
				bottom: 30
			},
			xAxis: {
				type: 'category',
				data: roles.map(r => ROLE_LABELS[r]),
				position: 'top',
				splitArea: { show: false },
				axisLine: { show: false },
				axisTick: { show: false },
				axisLabel: {
					color: colors['--color-text-primary'] || '#0f172a',
					fontSize: 12,
					fontWeight: 600
				}
			},
			yAxis: {
				type: 'category',
				data: members.map(extractDisplayName),
				inverse: true,
				splitArea: { show: false },
				axisLine: { show: false },
				axisTick: { show: false },
				axisLabel: {
					color: colors['--color-text-primary'] || '#0f172a',
					fontSize: 12,
					fontWeight: 500
				}
			},
			visualMap: {
				min: 0,
				max: visualMapMax,
				calculable: true,
				orient: 'vertical',
				right: 10,
				top: 'center',
				itemWidth: 14,
				itemHeight: 120,
				precision: 0,
				text: ['높음', '낮음'],
				textStyle: {
					color: colors['--color-text-muted'] || '#64748b',
					fontSize: 11
				},
				inRange: {
					color: [
						'#f1f5f9', // 매우 연한 색 (0%)
						'#bfdbfe', // 연한 파랑
						'#60a5fa', // 중간 파랑
						'#3b82f6', // 기본 파랑
						'#1d4ed8'  // 진한 파랑
					]
				},
				formatter: (value: number) => `${Math.round(value)}%`
			},
			series: [{
				type: 'heatmap',
				data: seriesData,
				label: {
					show: true,
					formatter: (params: any) => {
						const ratio = params.data.value[2]
						if (ratio === 0) return ''
						if (ratio >= 10) return `${Math.round(ratio)}%`
						return ''
					},
					fontSize: 10,
					fontWeight: 500,
					color: (params: any) => {
						const ratio = params.data.value[2]
						return ratio > 50 ? '#fff' : colors['--color-text-primary'] || '#0f172a'
					}
				},
				emphasis: {
					itemStyle: {
						shadowBlur: 10,
						shadowColor: 'rgba(0, 0, 0, 0.3)'
					}
				},
				itemStyle: {
					borderColor: '#fff',
					borderWidth: 2,
					borderRadius: 4
				}
			}]
		}
	}, [heatmapData, colors])

	// 빈 데이터 처리
	if (heatmapData.members.length === 0) {
		return (
			<Panel style={{ padding: 24 }}>
				<h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 600 }}>
					팀원별 역할 배정률
				</h3>
				<p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
					배정 데이터가 없습니다. 배정 탭에서 주차별 배정을 진행해주세요.
				</p>
			</Panel>
		)
	}

	const chartHeight = Math.max(300, heatmapData.members.length * 36 + 100)

	return (
		<Panel style={{ padding: 24 }}>
			<div style={{ marginBottom: 16 }}>
				<h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 600 }}>
					팀원별 역할 배정률
				</h3>
				<p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
					출석 횟수 대비 각 역할을 얼마나 자주 맡았는지 보여줍니다. 색상이 진할수록 해당 역할에 집중되어 있습니다.
				</p>
			</div>

			{/* 해석 가이드 */}
			<div style={{
				display: 'flex',
				alignItems: 'center',
				gap: 16,
				marginBottom: 16,
				padding: '10px 14px',
				background: 'var(--color-accent-soft)',
				borderRadius: 'var(--radius-sm)',
				fontSize: '0.8125rem',
				color: 'var(--color-text-primary)'
			}}>
				<span style={{ fontWeight: 600 }}>해석 방법:</span>
				<span>
					배정률 = (해당 역할 배정 횟수 ÷ 출석 주차 수) × 100
				</span>
				<span style={{ color: 'var(--color-text-muted)' }}>
					예) 12주 출석 중 SW 8회 = 66.7%
				</span>
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

