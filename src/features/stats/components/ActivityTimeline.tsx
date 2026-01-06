'use client'

import { useMemo, useState } from 'react'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import { CustomChart, HeatmapChart, EffectScatterChart } from 'echarts/charts'
import {
	GridComponent,
	TooltipComponent,
	LegendComponent,
	DataZoomComponent,
	VisualMapComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { Panel } from '@/shared/components/ui/Panel'
import { useAppStore } from '@/shared/state/store'
import { useTheme } from '@/shared/theme/ThemeProvider'
import {
	calculateActivityTimeline,
	getRoleAbbr,
	type MemberWeekStatus
} from '../utils/statsCalculations'
import { getChartThemeColors, getRoleColor } from '../utils/chartTheme'
import { stripCohort } from '@/shared/utils/assignment'
import type { RoleKey } from '@/shared/types'

// ECharts 모듈 등록
echarts.use([
	CustomChart,
	HeatmapChart,
	EffectScatterChart,
	GridComponent,
	TooltipComponent,
	LegendComponent,
	DataZoomComponent,
	VisualMapComponent,
	CanvasRenderer
])

// 역할별 그라데이션 생성
const getRoleGradient = (role: string, isDark: boolean) => {
	const baseColor = getRoleColor(role, isDark)
	return new echarts.graphic.LinearGradient(0, 0, 1, 1, [
		{ offset: 0, color: baseColor },
		{ offset: 1, color: isDark ? `${baseColor}cc` : `${baseColor}dd` }
	])
}

export default function ActivityTimeline() {
	const app = useAppStore((s) => s.app)
	const { effectiveTheme } = useTheme()
	const isDark = effectiveTheme === 'dark'

	const [selectedMember, setSelectedMember] = useState<string | null>(null)

	// 공통 테마 색상 사용
	const themeColors = useMemo(() => getChartThemeColors(isDark), [isDark])

	const timelineData = useMemo(() => {
		return calculateActivityTimeline(app, false)
	}, [app])

	// 통계 계산
	const stats = useMemo(() => {
		if (!timelineData || !timelineData.matrix) return null

		let totalAssignments = 0
		let totalAbsences = 0
		let consecutiveWarnings = 0
		let totalAttendances = 0

		timelineData.matrix.forEach(memberRow => {
			memberRow.forEach(status => {
				if (status.status === 'assigned') {
					totalAssignments++
					if (status.isConsecutive) consecutiveWarnings++
				} else if (status.status === 'absent') {
					totalAbsences++
				} else if (status.status === 'available') {
					totalAttendances++
				}
			})
		})

		const totalCells = timelineData.matrix.length * (timelineData.weekDates?.length || 0)
		const attendanceRate = totalCells > 0 ? ((totalCells - totalAbsences) / totalCells * 100) : 0

		return {
			totalAssignments,
			totalAbsences,
			consecutiveWarnings,
			attendanceRate: attendanceRate.toFixed(1)
		}
	}, [timelineData])

	const option = useMemo(() => {
		if (!timelineData || (timelineData.weekDates || []).length === 0 || (timelineData.members || []).length === 0) {
			return null
		}

		const { formattedDates, members, matrix } = timelineData

		// 셀 크기 계산
		const cellWidth = 60
		const cellHeight = 42

		// 커스텀 시리즈 데이터 생성
		const seriesData: any[] = []
		const highlightData: any[] = [] // 연속 배정 하이라이트

		matrix.forEach((memberRow, memberIdx) => {
			memberRow.forEach((status, weekIdx) => {
				const dataPoint = {
					value: [weekIdx, memberIdx],
					status,
					memberName: members[memberIdx],
					weekDate: formattedDates[weekIdx]
				}
				seriesData.push(dataPoint)

				// 연속 배정인 경우 별도 저장
				if (status.status === 'assigned' && status.isConsecutive) {
					highlightData.push(dataPoint)
				}
			})
		})

		return {
			animation: true,
			animationDuration: 600,
			animationEasing: 'cubicOut',
			tooltip: {
				trigger: 'item',
				formatter: (params: any) => {
					// effectScatter 시리즈는 status가 없으므로 체크
					if (!params.data || !params.data.status) return ''

					const status: MemberWeekStatus = params.data.status
					const displayName = stripCohort(status.memberName)
					const weekLabel = params.data.weekDate

					let html = `<div style="font-weight: 700; font-size: 14px; color: ${themeColors.textPrimary}; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
						${displayName}
						<span style="font-size: 11px; font-weight: 400; color: ${themeColors.textMuted};">${weekLabel}</span>
					</div>`

					if (status.status === 'absent') {
						const reason = status.absenceReason || '사유 미기재'
						html += `<div style="display: flex; align-items: center; gap: 6px; color: ${themeColors.danger};">
							<span style="font-size: 16px;">✕</span>
							<span style="font-weight: 500;">불참</span>
							<span style="color: ${themeColors.textMuted}; font-size: 12px;">(${reason})</span>
						</div>`
					} else if (status.status === 'available') {
						html += `<div style="display: flex; align-items: center; gap: 6px; color: ${themeColors.textMuted};">
							<span style="width: 8px; height: 8px; border-radius: 50%; border: 2px dashed ${themeColors.textSubtle};"></span>
							<span>출석 (미배정)</span>
						</div>`
					} else if (status.status === 'assigned') {
						html += `<div style="margin-bottom: 8px;">`
						status.roles.forEach(role => {
							const roleColor = getRoleColor(role, isDark)
							html += `<span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; margin-right: 4px; border-radius: 6px; background: ${roleColor}20; font-size: 12px;">
								<span style="width: 8px; height: 8px; border-radius: 3px; background: ${roleColor};"></span>
								<span style="color: ${themeColors.textPrimary}; font-weight: 500;">${role}</span>
							</span>`
						})
						html += `</div>`

						if (status.isConsecutive) {
							html += `<div style="display: flex; align-items: center; gap: 6px; color: ${themeColors.warning}; font-size: 12px; padding-top: 4px; border-top: 1px solid ${themeColors.border};">
								<span style="font-size: 16px;">⚠️</span>
								<span style="font-weight: 600;">연속 배정 주의</span>
							</div>`
						}
					}

					return html
				},
				backgroundColor: themeColors.tooltipBg,
				borderColor: themeColors.border,
				borderWidth: 1,
				textStyle: {
					color: themeColors.textPrimary,
					fontSize: 13
				},
				padding: [14, 18],
				extraCssText: 'box-shadow: 0 12px 40px rgba(0,0,0,0.15); border-radius: 12px; backdrop-filter: blur(12px);'
			},
			grid: {
				left: 110,
				right: 24,
				top: 48,
				bottom: formattedDates.length > 10 ? 60 : 24
			},
			xAxis: {
				type: 'category',
				data: formattedDates,
				position: 'top',
				axisLine: { show: false },
				axisTick: { show: false },
				axisLabel: {
					color: themeColors.textMuted,
					fontSize: 11,
					fontWeight: 500,
					interval: 0,
					rotate: formattedDates.length > 12 ? 45 : 0
				},
				splitLine: { show: false }
			},
			yAxis: {
				type: 'category',
				data: members.map(stripCohort),
				inverse: true,
				axisLine: { show: false },
				axisTick: { show: false },
				axisLabel: {
					color: (value: string, index: number) => {
						// 선택된 멤버 하이라이트
						if (selectedMember && members[index] === selectedMember) {
							return themeColors.accent
						}
						return themeColors.textPrimary
					},
					fontSize: 12,
					fontWeight: 600
				},
				splitLine: { show: false }
			},
			series: [
				// 메인 매트릭스
				{
					type: 'custom',
					renderItem: (params: any, api: any) => {
						const dataIndex = params.dataIndex
						const data = seriesData[dataIndex]
						const status: MemberWeekStatus = data.status

						const [x, y] = api.coord([data.value[0], data.value[1]])
						const width = cellWidth - 6
						const height = cellHeight - 6

						// 기본 스타일
						let fill: any = themeColors.cellEmpty
						let stroke = themeColors.cellBorder
						let strokeWidth = 1
						let text = ''
						let textColor = themeColors.textPrimary
						let cornerRadius = 8
						let shadowBlur = 0
						let shadowColor = 'transparent'

						if (status.status === 'absent') {
							fill = isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(241, 245, 249, 0.9)'
							stroke = themeColors.textSubtle
							text = '✕'
							textColor = themeColors.textSubtle
						} else if (status.status === 'available') {
							fill = 'transparent'
							stroke = themeColors.cellBorder
							strokeWidth = 1.5
							// 점선 효과를 위한 대시 패턴은 ECharts에서 직접 지원하지 않으므로 얇은 테두리로 대체
						} else if (status.status === 'assigned') {
							const primaryRole = status.roles[0]
							fill = getRoleGradient(primaryRole, isDark)
							stroke = 'transparent'
							text = status.roles.map(r => getRoleAbbr(r)).join('+')
							textColor = '#ffffff'
							shadowBlur = 8
							shadowColor = `${getRoleColor(primaryRole, isDark)}40`

							if (status.isConsecutive) {
								stroke = themeColors.warning
								strokeWidth = 3
							}
						}

						const children: any[] = [
							{
								type: 'rect',
								shape: {
									x: x - width / 2,
									y: y - height / 2,
									width,
									height,
									r: cornerRadius
								},
								style: {
									fill,
									stroke,
									lineWidth: strokeWidth,
									shadowBlur,
									shadowColor
								}
							}
						]

						if (text) {
							children.push({
								type: 'text',
								style: {
									x,
									y,
									text,
									fill: textColor,
									fontSize: status.status === 'absent' ? 14 : 11,
									fontWeight: 600,
									textAlign: 'center',
									textVerticalAlign: 'middle'
								}
							})
						}

						return {
							type: 'group',
							children
						}
					},
					data: seriesData,
					z: 2
				},
				// 연속 배정 펄스 효과
				...(highlightData.length > 0 ? [{
					type: 'effectScatter' as const,
					data: highlightData.map((d: any) => ({
						value: d.value,
						symbolSize: 8
					})),
					symbolSize: 4,
					showEffectOn: 'render' as const,
					rippleEffect: {
						period: 2,
						scale: 3,
						brushType: 'stroke' as const,
						color: themeColors.warning
					},
					itemStyle: {
						color: themeColors.warning
					},
					z: 3
				}] : [])
			],
			// DataZoom for horizontal scrolling
			dataZoom: formattedDates.length > 10 ? [
				{
					type: 'slider',
					xAxisIndex: 0,
					start: Math.max(0, 100 - (800 / formattedDates.length)),
					end: 100,
					height: 24,
					bottom: 8,
					borderColor: 'transparent',
					backgroundColor: themeColors.surface,
					fillerColor: isDark ? 'rgba(96,165,250,0.25)' : 'rgba(59,130,246,0.2)',
					handleStyle: {
						color: themeColors.accent,
						borderColor: themeColors.accent,
						borderRadius: 4
					},
					moveHandleStyle: {
						color: themeColors.accent
					},
					emphasis: {
						handleStyle: {
							color: themeColors.accent
						}
					},
					textStyle: {
						color: themeColors.textMuted,
						fontSize: 10
					},
					brushSelect: false,
					dataBackground: {
						lineStyle: { color: 'transparent' },
						areaStyle: { color: 'transparent' }
					},
					selectedDataBackground: {
						lineStyle: { color: themeColors.accent },
						areaStyle: { color: `${themeColors.accent}20` }
					}
				}
			] : []
		}
	}, [timelineData, themeColors, isDark, selectedMember])

	// 빈 데이터 처리
	if (!timelineData || (timelineData.weekDates || []).length === 0) {
		return (
			<Panel className="p-6">
				<h3 className="m-0 mb-2 text-base font-semibold text-[var(--color-label-primary)]">
					주차별 활동 현황
				</h3>
				<p className="m-0 text-sm text-[var(--color-label-secondary)]">
					배정 데이터가 없습니다. 배정 탭에서 주차별 배정을 진행해주세요.
				</p>
			</Panel>
		)
	}

	const chartHeight = Math.max(320, ((timelineData?.members || []).length * 48) + 100)

	return (
		<Panel className="p-6">
			{/* 헤더 */}
			<div className="mb-4">
				<h3 className="m-0 mb-1 text-base font-semibold text-[var(--color-label-primary)]">
					주차별 활동 현황
				</h3>
				<p className="m-0 text-sm text-[var(--color-label-secondary)]">
					팀원별 배정 이력, 불참 및 연속 배정을 한눈에 확인할 수 있습니다.
				</p>
			</div>

			{/* 통계 요약 바 */}
			{stats && (
				<div className="flex flex-wrap items-center gap-3 mb-4 p-4 bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-xl">
					{/* KPI 카드들 */}
					<div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-accent)]/10 rounded-lg">
						<span className="text-lg font-bold text-[var(--color-accent)]">{stats.totalAssignments}</span>
						<span className="text-xs text-[var(--color-label-secondary)]">총 배정</span>
					</div>

					<div className="w-px h-6 bg-[var(--color-border-subtle)]" />

					<div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-success)]/10 rounded-lg">
						<span className="text-lg font-bold text-[var(--color-success)]">{stats.attendanceRate}%</span>
						<span className="text-xs text-[var(--color-label-secondary)]">출석률</span>
					</div>

					<div className="w-px h-6 bg-[var(--color-border-subtle)]" />

					{stats.consecutiveWarnings > 0 && (
						<>
							<div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-warning)]/10 rounded-lg animate-pulse">
								<span className="text-lg font-bold text-[var(--color-warning)]">{stats.consecutiveWarnings}</span>
								<span className="text-xs text-[var(--color-label-secondary)]">연속 배정</span>
							</div>
							<div className="w-px h-6 bg-[var(--color-border-subtle)]" />
						</>
					)}

					{/* 역할 범례 */}
					<div className="flex items-center gap-3 ml-auto">
						{(['SW', '자막', '고정', '사이드', '스케치'] as RoleKey[]).map(role => (
							<div key={role} className="flex items-center gap-1.5">
								<div
									className="w-3 h-3 rounded-md shadow-sm"
									style={{ background: getRoleColor(role, isDark) }}
								/>
								<span className="text-xs text-[var(--color-label-secondary)] font-medium">
									{role}
								</span>
							</div>
						))}
					</div>
				</div>
			)}

			{/* 범례 */}
			<div className="flex items-center gap-4 mb-3 text-xs text-[var(--color-label-tertiary)]">
				<div className="flex items-center gap-1.5">
					<div className="w-4 h-4 rounded-md border border-[var(--color-border)] flex items-center justify-center text-[8px]">✕</div>
					<span>불참</span>
				</div>
				<div className="flex items-center gap-1.5">
					<div className="w-4 h-4 rounded-md border-2 border-dashed border-[var(--color-border)]" />
					<span>출석(미배정)</span>
				</div>
				<div className="flex items-center gap-1.5">
					<div className="w-4 h-4 rounded-md border-[3px] border-[var(--color-warning)]" style={{ background: getRoleColor('SW', isDark) }} />
					<span>연속 배정</span>
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
		</Panel>
	)
}
