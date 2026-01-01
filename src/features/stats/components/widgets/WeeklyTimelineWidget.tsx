import { useMemo } from 'react'
import { ResponsiveChart } from '../ResponsiveChart'
import type { EChartsOption } from '../ResponsiveChart'
import { ChartHelp } from './ChartHelp'
import { Panel } from '@/shared/components/ui/Panel'
import { getChartPalette } from '@/shared/theme/chartColors'
import type { RoleKey, WeekData, MembersEntry } from '@/shared/types'
import { useTheme } from '@/shared/theme/ThemeProvider'

interface WeeklyTimelineWidgetProps {
	weeks: Record<string, WeekData>
	members: MembersEntry[]
}

const roles: RoleKey[] = ['SW', '자막', '고정', '사이드', '스케치']
const HELP_TEXT = '세로축은 팀원, 가로축은 주차입니다. 배정된 역할(색상), 불참(빨강), 휴식(회색) 상태를 한눈에 파악하여, 배정 공백과 특정 인원의 연속 근무 여부를 확인합니다.'

export function WeeklyTimelineWidget({ weeks, members }: WeeklyTimelineWidgetProps) {
	const { theme } = useTheme()

	const palette = useMemo(() => getChartPalette(), [theme])

	const activeMemberNames = useMemo(() => {
		const names = new Set<string>()
		const memberStatusMap = new Map<string, boolean>()
		members.forEach((m) => {
			if (typeof m.name !== 'string') return
			const trimmed = m.name.trim()
			if (!trimmed) return
			memberStatusMap.set(trimmed, m.active !== false)
		})

		const getActiveName = (val: unknown) => {
			if (typeof val !== 'string') return null
			const t = val.trim()
			return memberStatusMap.get(t) !== false ? t : null
		}

		members.forEach((member) => {
			const activeName = getActiveName(member.name)
			if (activeName) names.add(activeName)
		})
		return Array.from(names).sort((a, b) => a.localeCompare(b, 'ko'))
	}, [members])

	const timelineSummary = useMemo(() => {
		const dates = Object.keys(weeks).sort()
		const mems = activeMemberNames
		const roleValueMap: Record<string, number> = {
			'SW': 2, '자막': 3, '고정': 4, '사이드': 5, '스케치': 6
		}

		const z = mems.map(() => dates.map(() => 0))
		const text = mems.map(() => dates.map(() => ''))
		const roleSets = mems.map(() => dates.map(() => new Set<RoleKey>()))
		const highlightCells: { rowIdx: number; colIdx: number; streak: number }[] = []

		const getActiveName = (val: unknown): string | null => {
			if (typeof val !== 'string') return null
			const t = val.trim()
			return activeMemberNames.includes(t) ? t : null
		}

		dates.forEach((date, colIdx) => {
			const week = weeks[date]
			if (!week) return

			// 1. Mark Absences
			week.absences?.forEach(abs => {
				const activeName = getActiveName(abs.name)
				if (!activeName) return
				const rowIdx = mems.indexOf(activeName)
				if (rowIdx === -1) return

				z[rowIdx][colIdx] = 1 // Absent
				text[rowIdx][colIdx] = abs.reason?.trim() || '불참'
				roleSets[rowIdx][colIdx] = new Set<RoleKey>()
			})

			// 2. Mark Assignments
			const processRole = (entry: unknown, roleKey: RoleKey) => {
				if (!entry) return
				if (Array.isArray(entry)) {
					entry.forEach(v => processRole(v, roleKey))
					return
				}
				const activeName = getActiveName(entry)
				if (!activeName) return
				const rowIdx = mems.indexOf(activeName)
				if (rowIdx === -1) return

				const roleSet = roleSets[rowIdx][colIdx]

				const currentVal = z[rowIdx][colIdx]
				const roleVal = roleValueMap[roleKey] ?? 0
				roleSet.add(roleKey)

				if (currentVal === 1 || (currentVal >= 2 && currentVal !== roleVal)) {
					z[rowIdx][colIdx] = 7 // Mixed
					text[rowIdx][colIdx] += `, ${roleKey}`
				} else {
					z[rowIdx][colIdx] = roleVal
					text[rowIdx][colIdx] = roleKey
				}
			}

			const scanPart = (p?: WeekData['part1']) => {
				if (!p) return
				processRole(p.SW, 'SW')
				processRole(p.자막, '자막')
				processRole(p.고정, '고정')
				processRole(p.스케치, '스케치')
				processRole(p['사이드'], '사이드')
			}
			scanPart(week.part1)
			scanPart(week.part2)
		})

		// Streak Analysis
		mems.forEach((_, rowIdx) => {
			let consecutive = 0
			let lastRoleVal = -1
			const streaks: Record<RoleKey, number> = { SW: 0, 자막: 0, 고정: 0, 사이드: 0, 스케치: 0 }

			dates.forEach((_, colIdx) => {
				const val = z[rowIdx][colIdx]
				const rs = roleSets[rowIdx][colIdx]
				const hasRoles = rs && rs.size > 0

				if (!hasRoles || val === 1) {
					roles.forEach(r => streaks[r] = 0)
				} else if (rs) {
					roles.forEach(r => {
						if (rs.has(r)) streaks[r] += 1
						else streaks[r] = 0
					})
				}

				if (hasRoles && val !== 1) {
					const maxStreak = Math.max(...Object.values(streaks))
					if (maxStreak >= 3) {
						highlightCells.push({ rowIdx, colIdx, streak: maxStreak })
					}
				}

				if (val >= 2 && val <= 6) {
					if (val === lastRoleVal) {
						consecutive++
						text[rowIdx][colIdx] = `${text[rowIdx][colIdx]}×${consecutive}`
					} else {
						consecutive = 1
						lastRoleVal = val
					}
				} else {
					consecutive = 0
					lastRoleVal = -1
				}

				// Multi-role label
				if (rs && rs.size > 0 && val !== 1) {
					const orderedRoles = roles.filter((r) => rs.has(r))
					const label = orderedRoles.map((role) => {
						const s = streaks[role]
						return s > 1 ? `${role}×${s}` : role
					}).join('\n')
					text[rowIdx][colIdx] = label
				}
			})
		})

		return { dates, members: mems, z, text, highlightCells }
	}, [weeks, activeMemberNames])

	const formatWeekLabel = (iso: string) => {
		const date = new Date(`${iso}T00:00:00`)
		if (Number.isNaN(date.getTime())) return iso
		const m = date.getMonth() + 1
		const d = date.getDate()
		return `${m}/${d}`
	}

	const chartOption = useMemo((): { hasData: boolean; height: number; option: EChartsOption } => {
		const { dates, members: mems, z, text, highlightCells } = timelineSummary
		if (dates.length === 0 || mems.length === 0) return { hasData: false, height: 400, option: {} }

		const defaultSeries = ['#93b5f6', '#a5e4f3', '#f6d28f', '#c9b5f6', '#f7b3d4', '#cbd5e1']
		const softSeries = palette.series?.map((c, idx) => c || defaultSeries[idx]) ?? defaultSeries
		const getSeriesColor = (idx: number) => softSeries[idx] ?? defaultSeries[idx] ?? '#93b5f6'

		const colors = [
			palette.surface2 ?? '#f1f5f9',      // 0: Rest
			palette.negative ?? '#ef4444',      // 1: Absent
			getSeriesColor(0),                  // 2: SW
			getSeriesColor(1),                  // 3: 자막
			getSeriesColor(2),                  // 4: 고정
			getSeriesColor(3),                  // 5: 사이드
			getSeriesColor(4),                  // 6: 스케치
			getSeriesColor(5),                  // 7: Mixed
		]

		const xLabels = dates.map(d => formatWeekLabel(d))

		// Build heatmap data: [x, y, value, text]
		const heatmapData: [number, number, number, string][] = []
		mems.forEach((_, rowIdx) => {
			dates.forEach((_, colIdx) => {
				heatmapData.push([colIdx, rowIdx, z[rowIdx][colIdx], text[rowIdx][colIdx]])
			})
		})

		return {
			hasData: true,
			height: Math.max(400, mems.length * 32 + 100),
			option: {
				animation: true,
				animationDuration: 300,
				tooltip: {
					trigger: 'item',
					formatter: (params: any) => {
						const [colIdx, rowIdx, , label] = params.data
						const memberName = mems[rowIdx]
						const dateLabel = xLabels[colIdx]
						return `<b>${memberName}</b><br/>${dateLabel}<br/>${label || '휴식'}`
					}
				},
				grid: { left: 80, right: 20, top: 50, bottom: 60 },
				xAxis: {
					type: 'category',
					data: xLabels,
					position: 'top',
					axisLine: { lineStyle: { color: palette.axis } },
					axisLabel: { color: palette.text, fontSize: 13 },
					splitLine: { show: false },
				},
				yAxis: {
					type: 'category',
					data: mems,
					inverse: true,
					axisLine: { lineStyle: { color: palette.axis } },
					axisLabel: { color: palette.text, fontWeight: 600, fontSize: 14 },
					splitLine: { show: false },
				},
				visualMap: {
					show: false,
					type: 'piecewise',
					categories: [0, 1, 2, 3, 4, 5, 6, 7],
					inRange: {
						color: colors,
					},
					outOfRange: {
						color: palette.surface2,
					},
				},
				series: [{
					type: 'heatmap',
					data: heatmapData,
					label: {
						show: true,
						formatter: (params: any) => params.data[3] || '',
						fontSize: 12,
						fontWeight: 500,
						color: palette.text,
						textBorderColor: palette.surface2,
						textBorderWidth: 2,
					},
					emphasis: {
						itemStyle: {
							shadowBlur: 8,
							shadowColor: 'rgba(0, 0, 0, 0.25)',
							borderColor: '#000',
							borderWidth: 2,
						}
					},
					itemStyle: {
						borderColor: palette.surface2,
						borderWidth: 2,
						borderRadius: 4,
					},
				}],
			}
		}
	}, [timelineSummary, palette])

	if (!chartOption.hasData) {
		return (
			<div className="p-4 text-center text-muted text-sm bg-surface-1 rounded">
				데이터가 없습니다.
			</div>
		)
	}

	return (
		<Panel style={{ padding: 24 }}>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
					<div style={{ fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
						<span>주차별 배정 타임라인</span>
						<ChartHelp description={HELP_TEXT} />
					</div>

					{/* Legend */}
					<div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: '0.8125rem' }}>
						{[
							{ label: '휴식', color: 'var(--color-surface-2)', border: 'var(--color-border-subtle)' },
							{ label: '불참', color: 'var(--data-negative)' },
							{ label: 'SW', color: 'var(--data-series-1)' },
							{ label: '자막', color: 'var(--data-series-2)' },
							{ label: '고정', color: 'var(--data-series-3)' },
							{ label: '사이드', color: 'var(--data-series-4)' },
							{ label: '스케치', color: 'var(--data-series-5)' },
						].map(item => (
							<div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
								<span style={{
									width: '10px', height: '10px', borderRadius: '2px',
									backgroundColor: item.color,
									border: item.border ? `1px solid ${item.border}` : 'none'
								}} />
								<span style={{ color: 'var(--color-text-muted)' }}>{item.label}</span>
							</div>
						))}
					</div>
				</div>
			</div>
			<ResponsiveChart
				height={chartOption.height}
				option={chartOption.option}
			/>
		</Panel>
	)
}
