import { useCallback, useEffect, useMemo, useState } from 'react'
import { ResponsiveChart } from './ResponsiveChart'
import type { EChartsOption } from './ResponsiveChart'
import { Panel } from '@/shared/components/ui/Panel'
import { useAppStore } from '@/shared/state/store'
import { getChartPalette } from '@/shared/theme/chartColors'
import { useTheme } from '@/shared/theme/ThemeProvider'
import { motionDurMs, useMotionConfig } from '@/shared/utils/motion'
import type { RoleKey, WeekData } from '@/shared/types'

const roles: RoleKey[] = ['SW', '자막', '고정', '사이드', '스케치']
const chartHelpText = {
	roleAssignments: '전체 탭에서는 각 팀원의 배정 비율을 역할별로 100% 스택 막대로 확인하고, 특정 팀원을 선택하면 역할별 누적 배정 횟수를 보여줍니다.',
	absenceDistribution: '불참률(불참 횟수 / 활동 기간) 순으로 정렬하여, 활동 기간 대비 불참 빈도를 파악합니다. 상위 10%는 빨강, 평균 초과~상위 20%는 주황색으로 표시됩니다.',
	weeklyOperation: '세로축은 팀원, 가로축은 주차입니다. 배정된 역할(색상), 불참(빨강), 휴식(회색) 상태를 한눈에 파악하여, 배정 공백과 특정 인원의 연속 근무 여부를 확인합니다.',
	roleShare: '전체 프로젝트(사각형)를 역할별로 나누고, 그 안에서 각 팀원의 기여도만큼 면적을 할당한 트리맵입니다. 역할 내에서 누구의 지분이 가장 큰지 한눈에 비교할 수 있습니다.',
	memberRoleHeatmap: '행은 팀원, 열은 역할입니다. 색이 진할수록 출석 대비 해당 역할을 자주 맡았음을 의미하며, 호버 시 비율과 횟수를 확인할 수 있습니다.'
} as const

function ChartHelp({ description }: { description: string }) {
	return (
		<span
			className="chart-help badge"
			data-tooltip={description}
			aria-label="차트 해설"
			tabIndex={0}
			role="button"
			style={{ width: 26, height: 26, padding: 0, marginLeft: 8 }}
		>
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2Zm0 15.75a1.25 1.25 0 1 1 0 2.5 1.25 1.25 1.25 0 0 1 0-2.5Zm.08-9.906c1.697 0 2.945 1.09 2.945 2.703 0 1.05-.46 1.794-1.387 2.343l-.56.33c-.45.265-.62.48-.62.987v.38h-1.92v-.46c0-1.006.305-1.595 1.07-2.054l.604-.36c.46-.27.676-.55.676-.965 0-.56-.4-.93-1.003-.93-.64 0-1.102.335-1.3.91l-1.78-.74c.39-1.12 1.47-2.144 3.275-2.144Z" fill="currentColor" />
			</svg>
		</span>
	)
}

export default function StatsView() {
	const app = useAppStore((s) => s.app)
	const [member, setMember] = useState<string>('')
	const { theme } = useTheme()
	const { shouldReduce } = useMotionConfig()
	const getBarChartHeight = (itemCount: number) => Math.max(360, itemCount * 34 + 120)
	const animationDuration = shouldReduce ? 0 : motionDurMs.normal

	const [palette, setPalette] = useState(getChartPalette())

	useEffect(() => {
		const timer = setTimeout(() => {
			setPalette(getChartPalette())
		}, 50)
		return () => clearTimeout(timer)
	}, [theme])

	const memberStatusMap = useMemo(() => {
		const map = new Map<string, boolean>()
		app.members.forEach((m) => {
			if (typeof m.name !== 'string') return
			const trimmed = m.name.trim()
			if (!trimmed) return
			map.set(trimmed, m.active !== false)
		})
		return map
	}, [app.members])

	const getRawName = (value: unknown): string | null => {
		if (value === null || value === undefined) return null
		if (typeof value === 'string') return value
		if (typeof value === 'number' || typeof value === 'boolean') return String(value)
		return null
	}

	const getActiveName = useCallback((value: unknown): string | null => {
		const raw = getRawName(value)
		if (!raw) return null
		const trimmed = raw.trim()
		if (!trimmed) return null
		const status = memberStatusMap.get(trimmed)
		if (status === false) return null
		return trimmed
	}, [memberStatusMap])

	const roleCounts = useMemo(() => {
		const counts = new Map<string, Record<RoleKey, number>>()
		const ensureRecord = (name: string) => {
			const found = counts.get(name)
			if (found) return found
			const next = { SW: 0, 자막: 0, 고정: 0, 사이드: 0, 스케치: 0 }
			counts.set(name, next)
			return next
		}
		const assign = (entry: unknown, role: RoleKey) => {
			if (!entry) return
			if (Array.isArray(entry)) {
				entry.forEach((value) => assign(value, role))
				return
			}
			const activeName = getActiveName(entry)
			if (!activeName) return
			const rec = ensureRecord(activeName)
			rec[role] += 1
		}
		const singleRoles = roles.filter((role) => role !== '사이드')
		for (const week of Object.values(app.weeks)) {
			singleRoles.forEach((role) => {
				assign(week.part1?.[role], role)
				assign(week.part2?.[role], role)
			})
			assign(week.part1?.['사이드'], '사이드')
			assign(week.part2?.['사이드'], '사이드')
		}
		return counts
	}, [app.weeks, getActiveName])

	const getRoleRecord = useCallback(
		(name: string): Record<RoleKey, number> =>
			roleCounts.get(name) ?? { SW: 0, 자막: 0, 고정: 0, 사이드: 0, 스케치: 0 },
		[roleCounts]
	)

	const memberOptions = useMemo(() => {
		const names = new Set<string>()
		app.members.forEach((m) => {
			const activeName = getActiveName(m.name)
			if (activeName) names.add(activeName)
		})
		roleCounts.forEach((_, key) => {
			if (key) names.add(key)
		})
		return Array.from(names).sort((a, b) => a.localeCompare(b, 'ko'))
	}, [app.members, getActiveName, roleCounts])

	const activeMemberNames = useMemo(() => {
		const names = new Set<string>()
		app.members.forEach((member) => {
			const activeName = getActiveName(member.name)
			if (activeName) names.add(activeName)
		})
		return Array.from(names).sort((a, b) => a.localeCompare(b, 'ko'))
	}, [app.members, getActiveName])

	useEffect(() => {
		if (!member) return
		const status = memberStatusMap.get(member)
		if (status === false) setMember('')
	}, [member, memberStatusMap])

	// Role Assignment Chart (Bar)
	const roleChartOption = useMemo((): { height: number; option: EChartsOption } => {
		if (member) {
			const record = getRoleRecord(member)
			const values = roles.map((role) => record[role])
			const colors = roles.map((_, idx) => palette.series[idx % palette.series.length])
			return {
				height: 420,
				option: {
					animation: true,
					animationDuration,
					tooltip: {
						trigger: 'axis',
						axisPointer: { type: 'shadow' },
						formatter: (params: any) => {
							const p = Array.isArray(params) ? params[0] : params
							return `<b>${p.name}</b><br/>${p.value}회 배정`
						}
					},
					grid: { left: 56, right: 32, top: 32, bottom: 64 },
					xAxis: {
						type: 'category',
						data: roles,
						axisLine: { lineStyle: { color: palette.axis } },
						axisLabel: { color: palette.text, fontSize: 13 },
					},
					yAxis: {
						type: 'value',
						name: '배정 횟수',
						nameTextStyle: { color: palette.text, fontSize: 14 },
						axisLine: { lineStyle: { color: palette.axis } },
						axisLabel: { color: palette.text, fontSize: 13 },
						splitLine: { lineStyle: { color: palette.grid } },
					},
					series: [{
						type: 'bar',
						data: values.map((v, i) => ({ value: v, itemStyle: { color: colors[i] } })),
						label: {
							show: true,
							position: 'top',
							formatter: '{c}회',
							color: palette.text,
							fontSize: 12,
						},
						barMaxWidth: 60,
					}],
				}
			}
		}

		// Overview: Stacked bar chart (100%)
		const extractBatchNumber = (name: string): number | null => {
			const match = name.match(/^(\d+)/)
			return match ? parseInt(match[1]!, 10) : null
		}

		const sortedMembers = [...memberOptions].sort((a, b) => {
			const batchA = extractBatchNumber(a)
			const batchB = extractBatchNumber(b)
			if (batchA !== null && batchB !== null) {
				return batchA - batchB || a.localeCompare(b, 'ko')
			}
			if (batchA !== null) return -1
			if (batchB !== null) return 1
			return a.localeCompare(b, 'ko')
		})

		const series = roles.map((role, roleIdx) => {
			const data = sortedMembers.map((name) => {
				const record = getRoleRecord(name)
				const total = Object.values(record).reduce((acc, v) => acc + v, 0)
				return total > 0 ? (record[role] / total) * 100 : 0
			})
			return {
				name: role,
				type: 'bar' as const,
				stack: 'total',
				emphasis: { focus: 'series' as const },
				itemStyle: { color: palette.series[roleIdx % palette.series.length] },
				data,
			}
		})

		return {
			height: getBarChartHeight(sortedMembers.length),
			option: {
				animation: true,
				animationDuration,
				tooltip: {
					trigger: 'axis',
					axisPointer: { type: 'shadow' },
					formatter: (params: any) => {
						if (!Array.isArray(params) || params.length === 0) return ''
						const memberName = params[0].axisValue
						const lines = params.map((p: any) => `${p.marker} ${p.seriesName}: ${p.value.toFixed(1)}%`)
						return `<b>${memberName}</b><br/>${lines.join('<br/>')}`
					}
				},
				legend: {
					top: 0,
					right: 0,
					textStyle: { color: palette.text, fontSize: 13 },
				},
				grid: { left: 64, right: 32, top: 40, bottom: 96 },
				xAxis: {
					type: 'category',
					data: sortedMembers,
					axisLine: { lineStyle: { color: palette.axis } },
					axisLabel: { color: palette.text, rotate: 45, interval: 0, fontSize: 13 },
				},
				yAxis: {
					type: 'value',
					name: '배정 비율',
					max: 100,
					axisLine: { lineStyle: { color: palette.axis } },
					axisLabel: { color: palette.text, formatter: '{value}%', fontSize: 13 },
					splitLine: { lineStyle: { color: palette.grid } },
				},
				series,
			}
		}
	}, [member, memberOptions, getRoleRecord, palette, animationDuration])

	// Absence Summary
	const absenceSummary = useMemo(() => {
		const counts = new Map<string, number>()
		const firstSeen = new Map<string, number>()
		const sortedDates = Object.keys(app.weeks).sort()

		activeMemberNames.forEach((name) => {
			counts.set(name, 0)
		})

		sortedDates.forEach((date, index) => {
			const week = app.weeks[date]
			if (!week) return
			const checkParticipant = (name: string | null | undefined) => {
				const activeName = getActiveName(name)
				if (activeName) {
					if (!firstSeen.has(activeName)) firstSeen.set(activeName, index)
				}
			}

			week.absences?.forEach((absence) => {
				const activeName = getActiveName(absence?.name)
				if (!activeName) return
				checkParticipant(activeName)
				const prev = counts.get(activeName) ?? 0
				counts.set(activeName, prev + 1)
			})

			const scanPart = (p?: WeekData['part1']) => {
				if (!p) return
				roles.forEach(role => {
					const val = p[role]
					if (Array.isArray(val)) val.forEach(v => checkParticipant(v))
					else checkParticipant(val as string)
				})
			}
			scanPart(week.part1)
			scanPart(week.part2)
		})

		const totalWeeks = sortedDates.length
		const entries = Array.from(counts.entries())
			.filter(([name]) => !!name)
			.map(([name, count]) => {
				const firstIndex = firstSeen.get(name) ?? 0
				const possibleWeeks = Math.max(1, totalWeeks - firstIndex)
				const rate = count / possibleWeeks
				return { name, count, total: possibleWeeks, rate }
			})
			.sort((a, b) => (b.rate - a.rate) || (b.count - a.count) || a.name.localeCompare(b.name, 'ko'))

		const validEntries = entries.filter(e => e.total > 0)
		const avgRate = validEntries.length > 0
			? validEntries.reduce((acc, cur) => acc + cur.rate, 0) / validEntries.length
			: 0

		return { points: entries, average: avgRate }
	}, [app.weeks, activeMemberNames, getActiveName])

	// Absence Chart (Horizontal Bar)
	const absenceChartOption = useMemo((): { hasData: boolean; height: number; option: EChartsOption } => {
		const points = absenceSummary.points
		const names = points.map((entry) => entry.name)
		const rates = points.map((entry) => entry.rate * 100)
		const average = absenceSummary.average * 100
		const height = getBarChartHeight(points.length)

		const sortedRates = [...rates].sort((a, b) => b - a)
		const p90 = sortedRates[Math.floor(sortedRates.length * 0.1)] ?? 100
		const p80 = sortedRates[Math.floor(sortedRates.length * 0.2)] ?? 100

		const colors = rates.map((value) => {
			if (value === 0) return palette.neutral
			if (value >= p90 && value > 0) return palette.negative
			if ((value >= p80 || value > average) && value > 0) return palette.warning
			return '#94a3b8'
		})

		return {
			hasData: points.length > 0,
			height,
			option: {
				animation: true,
				animationDuration,
				tooltip: {
					trigger: 'axis',
					axisPointer: { type: 'shadow' },
					formatter: (params: any) => {
						const p = Array.isArray(params) ? params[0] : params
						const idx = p.dataIndex
						const point = points[idx]
						return `<b>${point.name}</b><br/>불참률: ${(point.rate * 100).toFixed(1)}%<br/>(${point.count}회 / ${point.total}주)`
					}
				},
				grid: { left: 100, right: 40, top: 30, bottom: 50 },
				xAxis: {
					type: 'value',
					name: '불참률 (%)',
					nameTextStyle: { color: palette.text, fontSize: 13 },
					axisLine: { lineStyle: { color: palette.axis } },
					axisLabel: { color: palette.text, formatter: '{value}%', fontSize: 13 },
					splitLine: { lineStyle: { color: palette.grid } },
				},
				yAxis: {
					type: 'category',
					data: names,
					inverse: true,
					axisLine: { lineStyle: { color: palette.axis } },
					axisLabel: { color: palette.text, fontWeight: 600, fontSize: 14 },
				},
				series: [{
					type: 'bar',
					data: rates.map((v, i) => ({ value: v, itemStyle: { color: colors[i] } })),
					label: {
						show: true,
						position: 'right',
						formatter: (p: any) => `${p.value.toFixed(0)}%`,
						color: palette.text,
						fontSize: 12,
					},
					barMaxWidth: 24,
					markLine: points.length > 0 ? {
						silent: true,
						symbol: 'none',
						lineStyle: { color: palette.text, type: 'dashed', width: 2 },
						label: {
							formatter: `평균 ${average.toFixed(1)}%`,
							color: palette.text,
							backgroundColor: palette.surface2,
							padding: [4, 8],
							fontSize: 13,
						},
						data: [{ xAxis: average }],
					} : undefined,
				}],
			}
		}
	}, [absenceSummary, palette, animationDuration])

	// Timeline Heatmap
	const formatWeekLabel = (iso: string) => {
		const date = new Date(`${iso}T00:00:00`)
		if (Number.isNaN(date.getTime())) return iso
		const m = date.getMonth() + 1
		const d = date.getDate()
		return `${m}/${d}`
	}

	const timelineSummary = useMemo(() => {
		const dates = Object.keys(app.weeks).sort()
		const members = activeMemberNames
		const roleValueMap: Record<string, number> = {
			'SW': 2, '자막': 3, '고정': 4, '사이드': 5, '스케치': 6
		}

		const z = members.map(() => dates.map(() => 0))
		const text = members.map(() => dates.map(() => ''))
		const roleSets = members.map(() => dates.map(() => new Set<RoleKey>()))
		const highlightCells: { rowIdx: number; colIdx: number; streak: number }[] = []

		dates.forEach((date, colIdx) => {
			const week = app.weeks[date]
			if (!week) return

			week.absences?.forEach(abs => {
				const activeName = getActiveName(abs.name)
				if (!activeName) return
				const rowIdx = members.indexOf(activeName)
				if (rowIdx === -1) return
				z[rowIdx][colIdx] = 1
				text[rowIdx][colIdx] = abs.reason?.trim() || '불참'
				roleSets[rowIdx][colIdx] = new Set<RoleKey>()
			})

			const processRole = (entry: unknown, roleKey: RoleKey) => {
				if (!entry) return
				if (Array.isArray(entry)) {
					entry.forEach(v => processRole(v, roleKey))
					return
				}
				const activeName = getActiveName(entry)
				if (!activeName) return
				const rowIdx = members.indexOf(activeName)
				if (rowIdx === -1) return

				const roleSet = roleSets[rowIdx][colIdx]
				const currentVal = z[rowIdx][colIdx]
				const roleVal = roleValueMap[roleKey] ?? 0
				roleSet.add(roleKey)

				if (currentVal === 1 || (currentVal >= 2 && currentVal !== roleVal)) {
					z[rowIdx][colIdx] = 7
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

		members.forEach((_, rowIdx) => {
			let consecutive = 0
			let lastRoleVal = -1
			const streaks: Record<RoleKey, number> = { SW: 0, 자막: 0, 고정: 0, 사이드: 0, 스케치: 0 }

			dates.forEach((_, colIdx) => {
				const val = z[rowIdx][colIdx]
				const rolesSet = roleSets[rowIdx][colIdx]
				const hasRoles = rolesSet && rolesSet.size > 0

				if (!hasRoles || val === 1) {
					(Object.keys(streaks) as RoleKey[]).forEach((role) => { streaks[role] = 0 })
				} else if (rolesSet) {
					(Object.keys(streaks) as RoleKey[]).forEach((role) => {
						if (rolesSet.has(role)) streaks[role] += 1
						else streaks[role] = 0
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

				if (rolesSet && rolesSet.size > 0 && val !== 1) {
					const orderedRoles = roles.filter((r) => rolesSet.has(r))
					const label = orderedRoles.map((role) => {
						const streak = streaks[role]
						return streak > 1 ? `${role}×${streak}` : role
					}).join('\n')
					text[rowIdx][colIdx] = label
				}
			})
		})

		return { dates, members, z, text, highlightCells }
	}, [app.weeks, activeMemberNames, getActiveName])

	const timelineChartOption = useMemo((): { hasData: boolean; height: number; option: EChartsOption } => {
		const { dates, members, z, text, highlightCells } = timelineSummary
		if (dates.length === 0 || members.length === 0) return { hasData: false, height: 400, option: {} }

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

		// Build heatmap data: [x, y, value, text]
		const heatmapData: [number, number, number, string][] = []
		members.forEach((_, rowIdx) => {
			dates.forEach((_, colIdx) => {
				heatmapData.push([colIdx, rowIdx, z[rowIdx][colIdx], text[rowIdx][colIdx]])
			})
		})

		const xLabels = dates.map(d => formatWeekLabel(d))

		// Highlight markings as graphic elements
		const graphicElements = highlightCells.map(({ rowIdx, colIdx, streak }) => {
			const color = streak >= 5 ? (palette.negative ?? '#ef4444') : (palette.warning ?? '#f59e0b')
			const width = streak >= 5 ? 3 : 2
			return {
				type: 'rect' as const,
				shape: {
					x: 0,
					y: 0,
					width: 1,
					height: 1,
				},
				style: {
					stroke: color,
					lineWidth: width,
					fill: 'transparent',
				},
				z2: 10,
				// Position via custom attribute for later calculation
				_custom: { colIdx, rowIdx },
			}
		})

		return {
			hasData: true,
			height: Math.max(400, members.length * 32 + 100),
			option: {
				animation: true,
				animationDuration,
				tooltip: {
					trigger: 'item',
					formatter: (params: any) => {
						const [colIdx, rowIdx, , label] = params.data
						const memberName = members[rowIdx]
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
					axisLabel: { color: palette.text, fontSize: 14 },
					splitLine: { show: false },
				},
				yAxis: {
					type: 'category',
					data: members,
					inverse: true,
					axisLine: { lineStyle: { color: palette.axis } },
					axisLabel: { color: palette.text, fontWeight: 600, fontSize: 15 },
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
				graphic: graphicElements.length > 0 ? graphicElements : undefined,
			}
		}
	}, [timelineSummary, palette, animationDuration])

	// Member Role Heatmap
	const memberRoleHeatmap = useMemo(() => {
		type MemberStats = { attendance: number; roleWeeks: Record<RoleKey, number> }
		const statsMap = new Map<string, MemberStats>()
		const createRoleWeeks = () => roles.reduce((acc, role) => {
			acc[role] = 0
			return acc
		}, {} as Record<RoleKey, number>)
		const ensureStats = (name: string) => {
			let stats = statsMap.get(name)
			if (!stats) {
				stats = { attendance: 0, roleWeeks: createRoleWeeks() }
				statsMap.set(name, stats)
			}
			return stats
		}

		const weeksEntries = Object.entries(app.weeks).sort((a, b) => a[0].localeCompare(b[0]))
		for (const [, week] of weeksEntries) {
			const weeklyRoles = new Map<string, Set<RoleKey>>()
			const addAssignment = (entry: unknown, role: RoleKey) => {
				if (!entry) return
				if (Array.isArray(entry)) {
					entry.forEach((value) => addAssignment(value, role))
					return
				}
				const activeName = getActiveName(entry)
				if (!activeName) return
				ensureStats(activeName)
				let set = weeklyRoles.get(activeName)
				if (!set) {
					set = new Set<RoleKey>()
					weeklyRoles.set(activeName, set)
				}
				set.add(role)
			}
			const addPart = (part?: WeekData['part1']) => {
				if (!part) return
				addAssignment(part.SW, 'SW')
				addAssignment(part.자막, '자막')
				addAssignment(part.고정, '고정')
				addAssignment(part.스케치, '스케치')
				addAssignment(part['사이드'], '사이드')
			}
			addPart(week.part1)
			addPart(week.part2)
			week.absences?.forEach((absence) => {
				const activeName = getActiveName(absence?.name)
				if (!activeName) return
				ensureStats(activeName)
			})
			weeklyRoles.forEach((rolesSet, name) => {
				const stats = ensureStats(name)
				stats.attendance += 1
				rolesSet.forEach((role) => {
					stats.roleWeeks[role] += 1
				})
			})
		}

		app.members.forEach((member) => {
			const activeName = getActiveName(member.name)
			if (activeName) ensureStats(activeName)
		})

		const rows = Array.from(statsMap.entries())
			.map(([name, stats]) => {
				const ratios = roles.map((role) => {
					if (stats.attendance === 0) return 0
					const ratio = stats.roleWeeks[role] / stats.attendance
					return Number.isFinite(ratio) ? ratio : 0
				})
				const custom = roles.map((role) => {
					return [stats.roleWeeks[role] || 0, stats.attendance || 0] as [number, number]
				})
				return { name, stats, ratios, custom }
			})
			.filter((entry) => entry.stats.attendance > 0)

		rows.sort((a, b) => a.name.localeCompare(b.name, 'ko'))

		// ECharts heatmap data: [x, y, value]
		const heatmapData: [number, number, number][] = []
		const customData: Record<string, [number, number]> = {}

		rows.forEach((row, rowIdx) => {
			row.ratios.forEach((ratio, colIdx) => {
				heatmapData.push([colIdx, rowIdx, ratio])
				customData[`${colIdx}-${rowIdx}`] = row.custom[colIdx]
			})
		})

		return {
			x: roles,
			y: rows.map((row) => row.name),
			data: heatmapData,
			customData,
			hasData: rows.length > 0
		}
	}, [app.members, app.weeks, getActiveName])

	const heatmapChartOption = useMemo((): { hasData: boolean; height: number; option: EChartsOption } => {
		if (!memberRoleHeatmap.hasData) return { hasData: false, height: 400, option: {} }

		const height = getBarChartHeight(memberRoleHeatmap.y.length)

		return {
			hasData: true,
			height,
			option: {
				animation: true,
				animationDuration,
				tooltip: {
					trigger: 'item',
					formatter: (params: any) => {
						const [colIdx, rowIdx, ratio] = params.data
						const custom = memberRoleHeatmap.customData[`${colIdx}-${rowIdx}`] || [0, 0]
						const memberName = memberRoleHeatmap.y[rowIdx]
						const roleName = memberRoleHeatmap.x[colIdx]
						return `<b>${memberName}</b> · ${roleName}<br/>비율: <b>${(ratio * 100).toFixed(1)}%</b><br/>배정: ${custom[0]}회<br/>출석: ${custom[1]}주`
					}
				},
				grid: { left: 140, right: 80, top: 40, bottom: 56 },
				xAxis: {
					type: 'category',
					data: memberRoleHeatmap.x,
					position: 'top',
					axisLine: { lineStyle: { color: palette.axis } },
					axisLabel: { color: palette.text, fontSize: 14 },
					splitLine: { show: false },
				},
				yAxis: {
					type: 'category',
					data: memberRoleHeatmap.y,
					axisLine: { lineStyle: { color: palette.axis } },
					axisLabel: { color: palette.text, fontWeight: 600, fontSize: 14 },
					splitLine: { show: false },
				},
				visualMap: {
					min: 0,
					max: 1,
					calculable: true,
					orient: 'vertical',
					right: 10,
					top: 'center',
					text: ['100%', '0%'],
					textStyle: { color: palette.text, fontSize: 13 },
					inRange: {
						color: ['#440154', '#3b528b', '#21918c', '#5ec962', '#fde725'],
					},
				},
				series: [{
					type: 'heatmap',
					data: memberRoleHeatmap.data,
					label: { show: false },
					emphasis: {
						itemStyle: {
							shadowBlur: 10,
							shadowColor: 'rgba(0, 0, 0, 0.3)',
						}
					},
					itemStyle: {
						borderColor: palette.border,
						borderWidth: 2,
					},
				}],
			}
		}
	}, [memberRoleHeatmap, palette, animationDuration])

	// Role Share Treemap
	const roleShareStats = useMemo(() => {
		interface TreemapNode {
			name: string
			value: number
			itemStyle?: { color: string }
			children?: TreemapNode[]
		}

		const hierarchy: Record<RoleKey, Array<{ name: string; count: number }>> = {
			SW: [], 자막: [], 고정: [], 사이드: [], 스케치: []
		}
		let totalAssignments = 0

		activeMemberNames.forEach((memberName) => {
			const memberRoles = roleCounts.get(memberName)
			if (!memberRoles) return
			roles.forEach((role) => {
				const count = memberRoles[role]
				if (count > 0) {
					hierarchy[role].push({ name: memberName, count })
					totalAssignments += count
				}
			})
		})

		const treeData: TreemapNode[] = roles
			.map((role, idx) => {
				const total = hierarchy[role].reduce((acc, cur) => acc + cur.count, 0)
				if (total === 0) return null
				return {
					name: role,
					value: total,
					itemStyle: { color: palette.series[idx % palette.series.length] },
					children: hierarchy[role]
						.sort((a, b) => b.count - a.count)
						.map((m) => ({
							name: m.name,
							value: m.count,
						}))
				}
			})
			.filter(Boolean) as TreemapNode[]

		return { hasData: totalAssignments > 0, treeData }
	}, [activeMemberNames, roleCounts, palette.series])

	const treemapChartOption = useMemo((): { hasData: boolean; option: EChartsOption } => {
		if (!roleShareStats.hasData) return { hasData: false, option: {} }

		return {
			hasData: true,
			option: {
				animation: true,
				animationDuration,
				tooltip: {
					trigger: 'item',
					formatter: (params: any) => {
						const { name, value, treePathInfo } = params
						const parentName = treePathInfo?.length > 1 ? treePathInfo[treePathInfo.length - 2]?.name : null
						if (parentName) {
							return `<b>${name}</b><br/>${parentName}에서 ${value}회 배정`
						}
						return `<b>${name}</b><br/>${value}회 배정`
					}
				},
				series: [{
					type: 'treemap',
					data: roleShareStats.treeData,
					roam: false,
					nodeClick: false,
					breadcrumb: { show: false },
					label: {
						show: true,
						formatter: '{b}',
						fontSize: 14,
						color: '#ffffff',
						textBorderColor: 'rgba(0, 0, 0, 0.6)',
						textBorderWidth: 2,
					},
					upperLabel: {
						show: true,
						height: 30,
						formatter: (params: any) => {
							const { name, value } = params
							return `${name} (${value})`
						},
						color: '#ffffff',
						textBorderColor: 'rgba(0, 0, 0, 0.6)',
						textBorderWidth: 2,
						fontWeight: 'bold',
						fontSize: 14,
					},
					itemStyle: {
						borderColor: palette.surface2,
						borderWidth: 1,
						gapWidth: 1,
					},
					levels: [
						{
							itemStyle: {
								borderColor: palette.surface2,
								borderWidth: 1,
								gapWidth: 2,
							},
							upperLabel: { show: true },
						},
						{
							colorSaturation: [0.6, 0.95],
							itemStyle: {
								borderColorSaturation: 0.7,
								borderWidth: 1,
								gapWidth: 1,
							},
						}
					],
				}],
			}
		}
	}, [roleShareStats, palette, animationDuration])

	return (
		<div className="col" style={{ gap: 32, maxWidth: 1800, margin: '0 auto', padding: '0 12px', width: '100%' }}>

			{/* 1. 주차별 배정 타임라인 (Timeline) */}
			<Panel style={{ padding: 24 }}>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
					<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
						<div style={{ fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
							<span>주차별 배정 타임라인</span>
							<ChartHelp description={chartHelpText.weeklyOperation} />
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
					<div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
						팀원별 주차 활동(배정 역할, 불참, 휴식)을 타임라인 형태로 시각화하여 운영 공백을 관리합니다.
					</div>
				</div>
				{timelineChartOption.hasData ? (
					<ResponsiveChart
						height={timelineChartOption.height}
						option={timelineChartOption.option}
					/>
				) : (
					<div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-text-muted)', background: 'var(--color-surface-1)', borderRadius: 12, fontSize: '0.875rem' }}>
						주차별 데이터가 없습니다.
					</div>
				)}
			</Panel>

			{/* 2. 직무 배정 통계 (Role Assignments) */}
			<Panel style={{ padding: 24 }}>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
					<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
						<div style={{ fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
							<span>직무 배정 통계</span>
							<ChartHelp description={chartHelpText.roleAssignments} />
						</div>
						<div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--color-surface-1)', border: '1px solid var(--color-border-subtle)', borderRadius: 12, padding: '6px 14px' }}>
							<span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>팀원 필터</span>
							<select
								style={{ border: 'none', background: 'transparent', padding: '4px 0', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-primary)', minWidth: 120, outline: 'none', cursor: 'pointer' }}
								value={member}
								onChange={(e) => setMember(e.target.value)}
							>
								<option value="">전체</option>
								{memberOptions.map((name) => {
									const isActive = memberStatusMap.get(name)
									const label = isActive === false ? `${name} (비활성)` : name
									return <option key={name} value={name}>{label}</option>
								})}
							</select>
						</div>
					</div>
					<div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
						전체 보기에서는 역할별 비율(100%)을, 특정 팀원을 선택하면 누적 배정 횟수를 확인합니다.
					</div>
				</div>
				<ResponsiveChart
					key={member ? `role-member-${member}` : 'role-overview'}
					height={roleChartOption.height}
					option={roleChartOption.option}
				/>
			</Panel>

			{/* 3. Grid: 불참률 (Risk) & 히트맵 (Detail) */}
			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 600px), 1fr))', gap: 28 }}>
				{/* 3-1. 개인 불참 분포 */}
				<Panel style={{ padding: 24 }}>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
						<div style={{ fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
							<span>개인 불참률 순위</span>
							<ChartHelp description={chartHelpText.absenceDistribution} />
						</div>
						<div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
							불참률(불참/참여가능주차)이 높은 순서대로 나열하여 상습 결석 구간을 파악합니다. (빨강: 상위 10%, 주황: 평균~상위 20%)
						</div>
					</div>
					{absenceChartOption.hasData ? (
						<ResponsiveChart
							height={absenceChartOption.height}
							option={absenceChartOption.option}
						/>
					) : (
						<div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-text-muted)', background: 'var(--color-surface-1)', borderRadius: 12, fontSize: '0.875rem' }}>
							불참 데이터가 없습니다.
						</div>
					)}
				</Panel>

				{/* 3-2. 팀원 × 역할 출석 보정 히트맵 */}
				<Panel style={{ padding: 24 }}>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
						<div style={{ fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
							<span>팀원/역할 배정 히트맵</span>
							<ChartHelp description={chartHelpText.memberRoleHeatmap} />
						</div>
						<div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
							출석 횟수 대비 특정 역할을 얼마나 자주 맡았는지(비율) 시각화합니다.
						</div>
					</div>
					{heatmapChartOption.hasData ? (
						<ResponsiveChart
							height={heatmapChartOption.height}
							option={heatmapChartOption.option}
						/>
					) : (
						<div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-text-muted)', background: 'var(--color-surface-1)', borderRadius: 12, fontSize: '0.875rem' }}>
							분석할 데이터가 없습니다.
						</div>
					)}
				</Panel>
			</div>

			{/* 4. 역할별 기여도 (Treemap) */}
			<Panel style={{ padding: 24 }}>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
					<div style={{ fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
						<span>역할별 지분 맵 (Treemap)</span>
						<ChartHelp description={chartHelpText.roleShare} />
					</div>
					<div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
						역할 박스 크기는 총 배정 횟수이며, 내부 칸들은 팀원들의 기여 지분을 나타냅니다.
					</div>
				</div>
				{treemapChartOption.hasData ? (
					<ResponsiveChart
						height={400}
						option={treemapChartOption.option}
					/>
				) : (
					<div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-text-muted)', background: 'var(--color-surface-1)', borderRadius: 12, fontSize: '0.875rem' }}>
						배정 데이터가 없습니다.
					</div>
				)}
			</Panel>
		</div>
	)
}
