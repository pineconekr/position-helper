import { useCallback, useEffect, useMemo, useState } from 'react'
import { ResponsivePlot } from './ResponsivePlot'
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
				<path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2Zm0 15.75a1.25 1.25 0 1 1 0 2.5 1.25 1.25 1.25 0 0 1 0-2.5Zm.08-9.906c1.697 0 2.945 1.09 2.945 2.703 0 1.05-.46 1.794-1.387 2.343l-.56.33c-.45.265-.62.48-.62.987v.38h-1.92v-.46c0-1.006.305-1.595 1.07-2.054l.604-.36c.46-.27.676-.55.676-.965 0-.56-.4-.93-1.003-.93-.64 0-1.102.335-1.3.91l-1.78-.74c.39-1.12 1.47-2.144 3.275-2.144Z" fill="currentColor"/>
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
	const chartTransition = useMemo(
		() => (shouldReduce ? { duration: 0 } : { duration: motionDurMs.normal, easing: 'cubic-in-out' as const }),
		[shouldReduce]
	)

	const [palette, setPalette] = useState(getChartPalette())

	useEffect(() => {
		// Allow CSS variables to update
		const timer = setTimeout(() => {
			setPalette(getChartPalette())
		}, 50)
		return () => clearTimeout(timer)
	}, [theme])

	const baseLayout = useMemo(() => ({
		paper_bgcolor: 'transparent',
		plot_bgcolor: 'transparent',
		font: { color: palette.text, family: 'inherit' },
		margin: { l: 40, r: 20, t: 20, b: 40 },
		hoverlabel: {
			bgcolor: palette.surface2,
			bordercolor: palette.border,
			font: { color: palette.text, family: 'inherit' }
		},
		xaxis: {
			gridcolor: palette.grid,
			zerolinecolor: palette.grid,
			linecolor: palette.axis,
			tickfont: { size: 12 }
		},
		yaxis: {
			gridcolor: palette.grid,
			zerolinecolor: palette.grid,
			linecolor: palette.axis,
			tickfont: { size: 12 }
		},
		transition: chartTransition
	}), [palette, chartTransition])

	const heatmapColorscale = useMemo(
		() => 'Viridis' as any,
		[]
	)

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

const roleChart = useMemo(() => {
	if (member) {
		const record = getRoleRecord(member)
		const values = roles.map((role) => record[role])
		const colors = roles.map((_, idx) => palette.series[idx % palette.series.length])
		const total = values.reduce((acc, value) => acc + value, 0)
		const text = values.map((count) => `${count}회`)
		return {
			height: 420,
			layout: {
				...baseLayout,
				margin: { l: 56, r: 32, t: 32, b: 64 },
				xaxis: {
					...baseLayout.xaxis,
					title: '',
					type: 'category'
				},
				yaxis: {
					...baseLayout.yaxis,
					title: '배정 횟수',
					rangemode: 'tozero',
					tickformat: 'd'
				}
			},
			data: [{
				type: 'bar' as const,
				x: roles,
				y: values,
				text,
				textposition: 'outside' as const,
				insidetextanchor: 'middle' as const,
				marker: { color: colors },
				hovertemplate: '%{x}<br>%{y}회 배정<extra></extra>',
				name: member,
				showlegend: false
			}],
			total
		}
	}

	// 기수 추출 함수: 이름에서 숫자를 추출 (예: "20 박예" -> 20, "박예" -> null)
	const extractBatchNumber = (name: string): number | null => {
		const match = name.match(/^(\d+)/)
		return match ? parseInt(match[1]!, 10) : null
	}

	const sortedMembers = [...memberOptions].sort((a, b) => {
		const batchA = extractBatchNumber(a)
		const batchB = extractBatchNumber(b)
		
		// 기수가 있는 경우: 기수 우선 정렬
		if (batchA !== null && batchB !== null) {
			return batchA - batchB || a.localeCompare(b, 'ko')
		}
		// 한쪽만 기수가 있는 경우: 기수가 있는 쪽이 앞으로
		if (batchA !== null) return -1
		if (batchB !== null) return 1
		// 둘 다 기수가 없는 경우: 가나다 순
		return a.localeCompare(b, 'ko')
	})
	const traces = roles.map((role, roleIdx) => {
		const counts = sortedMembers.map((name) => getRoleRecord(name)[role])
		const totals = sortedMembers.map((name) =>
			Object.values(getRoleRecord(name)).reduce((acc, value) => acc + value, 0)
		)
		const fractions = counts.map((value, idx) => {
			const total = totals[idx] ?? 0
			return total > 0 ? value / total : 0
		})
		const customdata = counts.map((value, idx) => [value, fractions[idx]] as [number, number])
		return {
			type: 'bar' as const,
			name: role,
			x: sortedMembers,
			y: counts,
			customdata,
			hovertemplate: `<b>${role}</b><br>%{x}<br>` +
				`배정: %{customdata[0]}회<br>` +
				`비율: %{customdata[1]:.1%}<extra></extra>`,
			marker: { color: palette.series[roleIdx % palette.series.length] }
		}
	})
	return {
		height: getBarChartHeight(sortedMembers.length),
		layout: {
			...baseLayout,
			margin: { l: 64, r: 32, t: 32, b: 96 },
			xaxis: {
				...baseLayout.xaxis,
				tickangle: -45,
				automargin: true,
				showticklabels: true
			},
			yaxis: {
				...baseLayout.yaxis,
				title: '배정 비율',
				tickformat: '.0%',
				rangemode: 'tozero'
			},
			barmode: 'stack' as const,
			barnorm: 'fraction' as const,
			legend: {
				orientation: 'h' as const,
				yanchor: 'bottom' as const,
				y: 1.02,
				xanchor: 'right' as const,
				x: 1
			}
		},
		data: traces
	}
}, [member, memberOptions, getRoleRecord, palette.series, baseLayout])

// 불참 데이터 집계
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

		// Check absences
		week.absences?.forEach((absence) => {
			const activeName = getActiveName(absence?.name)
			if (!activeName) return
			checkParticipant(activeName)
			const prev = counts.get(activeName) ?? 0
			counts.set(activeName, prev + 1)
		})

		// Check assignments (to detect start date)
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

	return {
		points: entries,
		average: avgRate
	}
}, [app.weeks, activeMemberNames, getActiveName])

const absenceChart = useMemo(() => {
	const points = absenceSummary.points
	const names = points.map((entry) => entry.name)
	const rates = points.map((entry) => entry.rate * 100) // Percentage
	const average = absenceSummary.average * 100
	const averageLabel = average.toFixed(1)
	const height = getBarChartHeight(points.length)
	
	const markerColors = rates.map((value) => {
		const sortedRates = [...rates].sort((a, b) => b - a)
		const p90 = sortedRates[Math.floor(sortedRates.length * 0.1)] ?? 100 // Top 10%
		const p80 = sortedRates[Math.floor(sortedRates.length * 0.2)] ?? 100 // Top 20%
		
		if (value === 0) return palette.neutral
		if (value >= p90 && value > 0) return palette.negative // Top 10%: Red
		if ((value >= p80 || value > average) && value > 0) return palette.warning // Top 20% or Above Average: Orange
		return '#94a3b8' // Slate 400 (Neutral/Safe)
	})

	return {
		hasData: points.length > 0,
		height,
		data: [{
			type: 'bar' as const,
			orientation: 'h' as const,
			x: rates,
			y: names,
			text: points.map(p => `${(p.rate * 100).toFixed(0)}%`),
			textposition: 'auto' as const,
			customdata: points.map(p => [p.count, p.total]),
			marker: {
				color: markerColors,
				line: { width: 0 }
			},
			hovertemplate: '%{y}<br>불참률: %{x:.1f}%<br>(%{customdata[0]}회 / %{customdata[1]}주)<extra></extra>'
		}],
		layout: {
			...baseLayout,
			margin: { l: 100, r: 40, t: 30, b: 50 },
			xaxis: {
				...baseLayout.xaxis,
				title: '불참률 (%)',
				rangemode: 'tozero' as const,
				tickformat: '.0f',
				showgrid: true,
				gridwidth: 1,
			},
			yaxis: {
				...baseLayout.yaxis,
				type: 'category' as const,
				autorange: 'reversed' as const,
				automargin: true,
				tickfont: { size: 13, weight: 600 }
			},
			shapes: points.length > 0 ? [{
				type: 'line' as const,
				xref: 'x' as const,
				yref: 'paper' as const,
				x0: average,
				x1: average,
				y0: 0,
				y1: 1,
				line: { color: palette.text, width: 2, dash: 'dot' as const }
			}] : [],
			annotations: points.length > 0 ? [{
				x: average,
				y: 1,
				xref: 'x' as const,
				yref: 'paper' as const,
				text: `평균 ${averageLabel}%`,
				showarrow: false,
				xanchor: 'left' as const,
				yanchor: 'bottom' as const,
				font: { color: palette.text, size: 12, weight: 600 },
				bgcolor: palette.surface2,
				borderpad: 4,
			}] : []
		}
	}
}, [absenceSummary, palette, baseLayout])

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

		// Z-matrix: rows=members, cols=weeks
		const z = members.map(() => dates.map(() => 0))
		const text = members.map(() => dates.map(() => ''))
		const roleSets = members.map(() => dates.map(() => new Set<RoleKey>()))
		const highlightCells: { rowIdx: number; colIdx: number; streak: number }[] = []

		dates.forEach((date, colIdx) => {
			const week = app.weeks[date]
			if (!week) return

			// 1. Mark Absences
			week.absences?.forEach(abs => {
				const activeName = getActiveName(abs.name)
				if (!activeName) return
				const rowIdx = members.indexOf(activeName)
				if (rowIdx === -1) return
				const rowZ = z[rowIdx] ?? (z[rowIdx] = dates.map(() => 0))
				const rowText = text[rowIdx] ?? (text[rowIdx] = dates.map(() => ''))
				const rowRoles = roleSets[rowIdx] ?? (roleSets[rowIdx] = dates.map(() => new Set<RoleKey>()))
				rowZ[colIdx] = 1 // Absent
				rowText[colIdx] = abs.reason?.trim() || '불참'
				rowRoles[colIdx] = new Set<RoleKey>() // reset roles for absence
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
				const rowIdx = members.indexOf(activeName)
				if (rowIdx === -1) return
				const rowZ = z[rowIdx] ?? (z[rowIdx] = dates.map(() => 0))
				const rowText = text[rowIdx] ?? (text[rowIdx] = dates.map(() => ''))
				const rowRoles = roleSets[rowIdx] ?? (roleSets[rowIdx] = dates.map(() => new Set<RoleKey>()))
				const roleSet = rowRoles[colIdx] ?? new Set<RoleKey>()
				rowRoles[colIdx] = roleSet

				const currentVal = rowZ[colIdx] ?? 0
				const roleVal = roleValueMap[roleKey] ?? 0
				roleSet.add(roleKey)
				
				if (currentVal === 1 || (currentVal >= 2 && currentVal !== roleVal)) {
					rowZ[colIdx] = 7 // Mixed
					rowText[colIdx] += `, ${roleKey}`
				} else {
					rowZ[colIdx] = roleVal
					rowText[colIdx] = roleKey
				}
			}

			// Part 1 & 2
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

		// Post-process: Consecutive roles count
		members.forEach((_, rowIdx) => {
			let consecutive = 0
			let lastRoleVal = -1
			const rowZ = z[rowIdx] ?? (z[rowIdx] = dates.map(() => 0))
			const rowText = text[rowIdx] ?? (text[rowIdx] = dates.map(() => ''))
			const rowRoles = roleSets[rowIdx] ?? (roleSets[rowIdx] = dates.map(() => new Set<RoleKey>()))
			const streaks: Record<RoleKey, number> = { SW: 0, 자막: 0, 고정: 0, 사이드: 0, 스케치: 0 }
			
			dates.forEach((_, colIdx) => {
				const val = rowZ[colIdx] ?? 0
				const rolesSet = rowRoles[colIdx]
				const hasRoles = rolesSet && rolesSet.size > 0

				if (!hasRoles || val === 1) {
					// reset all streaks on absence or no role
					(Object.keys(streaks) as RoleKey[]).forEach((role) => { streaks[role] = 0 })
				} else if (rolesSet) {
					(Object.keys(streaks) as RoleKey[]).forEach((role) => {
						if (rolesSet.has(role)) {
							streaks[role] += 1
						} else {
							streaks[role] = 0
						}
					})
				}

				if (hasRoles && val !== 1) {
					const maxStreak = Math.max(...Object.values(streaks))
					if (maxStreak >= 3) {
						highlightCells.push({ rowIdx, colIdx, streak: maxStreak })
					}
				}

				// Check if it's a valid single role (2..6)
				if (val >= 2 && val <= 6) {
					if (val === lastRoleVal) {
						consecutive++
						rowText[colIdx] = `${rowText[colIdx]}×${consecutive}`
					} else {
						consecutive = 1
						lastRoleVal = val
					}
				} else {
					consecutive = 0
					lastRoleVal = -1
				}

				// For multi-role weeks, append streak markers per role in set
				if (rolesSet && rolesSet.size > 0 && val !== 1) {
					const orderedRoles = roles.filter((r) => rolesSet.has(r))
					const label = orderedRoles.map((role) => {
						const streak = streaks[role]
						return streak > 1 ? `${role}×${streak}` : role
					}).join(',<br>')
					rowText[colIdx] = label
				}
			})
		})

		return { dates, members, z, text, highlightCells }
	}, [app.weeks, activeMemberNames, getActiveName])

	const timelineChart = useMemo(() => {
		const { dates, members, z, text, highlightCells } = timelineSummary
		if (dates.length === 0 || members.length === 0) return { hasData: false, data: [], layout: {} }

		// Construct discrete colorscale
		const defaultSeries = ['#93b5f6', '#a5e4f3', '#f6d28f', '#c9b5f6', '#f7b3d4', '#cbd5e1']
		const softSeries = palette.series?.map((c, idx) => c || defaultSeries[idx]) ?? defaultSeries
		const getSeriesColor = (idx: number) => softSeries[idx] ?? defaultSeries[idx] ?? '#93b5f6'
		const colors = [
			palette.surface2 ?? '#f1f5f9',      // 0: Rest
			palette.negative ?? '#ef4444',      // 1: Absent (high saturation)
			getSeriesColor(0),                  // 2: SW (soft)
			getSeriesColor(1),                  // 3: 자막 (soft)
			getSeriesColor(2),                  // 4: 고정 (soft)
			getSeriesColor(3),                  // 5: 사이드 (soft)
			getSeriesColor(4),                  // 6: 스케치 (soft)
			getSeriesColor(5),                  // 7: Mixed/Other (soft)
		]

		const scale: [number, string][] = []
		const n = 8
		for (let i = 0; i < n; i++) {
			const color = colors[i] ?? defaultSeries[i % defaultSeries.length] ?? '#3b82f6'
			scale.push([i / n, color])
			scale.push([(i + 1) / n, color])
		}

		const xLabels = dates.map(d => formatWeekLabel(d))

		const shapes = highlightCells.map(({ rowIdx, colIdx, streak }) => {
			const color = streak >= 5 ? (palette.negative ?? '#ef4444') : (palette.warning ?? '#f59e0b')
			const width = streak >= 5 ? 3 : 2
			return {
				type: 'rect',
				x0: colIdx - 0.45,
				x1: colIdx + 0.45,
				y0: rowIdx - 0.45,
				y1: rowIdx + 0.45,
				xref: 'x',
				yref: 'y',
				line: { color, width },
				fillcolor: 'transparent'
			}
		})

		return {
			hasData: true,
			height: Math.max(400, members.length * 32 + 100),
			data: [{
				type: 'heatmap' as const,
				x: dates.map((_, i) => i),
				y: members.map((_, i) => i),
				z: z,
				text: text,
				texttemplate: '%{text}',
				textfont: { size: 11 },
				hoverinfo: 'text' as const,
				hovertemplate: 
					'<b>%{y}</b><br>' +
					'%{x}<br>' +
					'%{text}<extra></extra>',
				colorscale: scale,
				showscale: false, 
				colorbar: {
					tickvals: [0.5/8, 1.5/8, 2.5/8, 3.5/8, 4.5/8, 5.5/8, 6.5/8, 7.5/8].map(v => v * 8 * (1/8)), 
				},
				zmin: 0,
				zmax: 8 
			}],
			layout: {
				...baseLayout,
				shapes,
				margin: { l: 80, r: 20, t: 40, b: 80 },
				xaxis: {
					...baseLayout.xaxis,
					tickvals: dates.map((_, i) => i),
					ticktext: xLabels,
					tickangle: 0,
					side: 'top' as const
				},
				yaxis: {
					...baseLayout.yaxis,
					tickvals: members.map((_, i) => i),
					ticktext: members,
					autorange: 'reversed' as const,
					tickfont: { size: 13, weight: 600 }
				}
			}
		}
	}, [timelineSummary, palette, baseLayout])
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
					if (stats.attendance === 0) return null
					const ratio = stats.roleWeeks[role] / stats.attendance
					return Number.isFinite(ratio) ? ratio : null
				})
				const custom = roles.map((role) => {
					// customdata는 항상 유효한 배열로 설정 (null이면 [0, 0])
					return [stats.roleWeeks[role] || 0, stats.attendance || 0] as [number, number]
				})
				return { name, stats, ratios, custom }
			})
			.filter((entry) => entry.stats.attendance > 0)

		rows.sort((a, b) => a.name.localeCompare(b.name, 'ko'))

		return {
			x: roles,
			y: rows.map((row) => row.name),
			z: rows.map((row) => row.ratios),
			customData: rows.map((row) => row.custom),
			hasData: rows.length > 0
		}
	}, [app.members, app.weeks, getActiveName])

	const heatmapHeight = getBarChartHeight(memberRoleHeatmap.y.length)
	// Sankey 차트는 높이가 좀 더 확보되어야 예쁩니다.
	const monthlyChartHeight = Math.max(500, activeMemberNames.length * 28)

	// 역할별 기여도 점유율 (Treemap)
	const roleShareStats = useMemo(() => {
		const clamp = (v: number) => Math.min(255, Math.max(0, v))
		const adjustHex = (hex: string, delta: number) => {
			if (!hex || !hex.startsWith('#') || (hex.length !== 7 && hex.length !== 9)) return hex
			const r = clamp(parseInt(hex.slice(1, 3), 16) + delta)
			const g = clamp(parseInt(hex.slice(3, 5), 16) + delta)
			const b = clamp(parseInt(hex.slice(5, 7), 16) + delta)
			return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
		}
		const withAlpha = (hex: string, alpha: string) => {
			if (!hex || !hex.startsWith('#') || (hex.length !== 7 && hex.length !== 9)) return hex
			return `${hex.slice(0, 7)}${alpha}`
		}

		// 1. 데이터 집계
		const hierarchy: Record<RoleKey, Array<{ name: string; count: number; roleIdx: number }>> = {
			SW: [], 자막: [], 고정: [], 사이드: [], 스케치: []
		}
		let totalAssignments = 0

		activeMemberNames.forEach((memberName) => {
			const memberRoles = roleCounts.get(memberName)
			if (!memberRoles) return
			roles.forEach((role, roleIdx) => {
				const count = memberRoles[role]
				if (count > 0) {
					hierarchy[role].push({ name: memberName, count, roleIdx })
					totalAssignments += count
				}
			})
		})

		// 역할별 총합을 기준으로 정렬 (Finviz 스타일 가독성)
		const roleTotals = roles
			.map((role, idx) => ({ role, idx, total: hierarchy[role].reduce((acc, cur) => acc + cur.count, 0) }))
			.filter((r) => r.total > 0)
			.sort((a, b) => b.total - a.total)

		// 2. Treemap 데이터 포맷
		const ids: string[] = []
		const labels: string[] = []
		const parents: string[] = []
		const values: number[] = []
		const colors: string[] = []
		const lineColors: string[] = []
		const lineWidths: number[] = []
		const textTemplates: string[] = []

		roleTotals.forEach(({ role, idx: origIdx, total: roleTotal }) => {
			const baseColor = palette.series[origIdx % palette.series.length] ?? '#3b82f6'
			const roleColor = adjustHex(baseColor, -10) // 진한 톤
			const roleLine = adjustHex(baseColor, -35)
			const memberColor = withAlpha(adjustHex(baseColor, 12), 'd0') // 살짝 밝게 + 투명
			const memberLine = adjustHex(baseColor, -28)

			// Role Node
			ids.push(role)
			labels.push(role)
			parents.push('')
			values.push(roleTotal)
			colors.push(roleColor)
			lineColors.push(roleLine)
			lineWidths.push(1.5)
			textTemplates.push('%{label}<br>%{percentRoot:.1%}')

			// Member Nodes
			hierarchy[role]
				.sort((a, b) => b.count - a.count)
				.forEach((m) => {
					ids.push(`${role}-${m.name}`)
					labels.push(m.name)
					parents.push(role)
					values.push(m.count)
					colors.push(memberColor) // 동일 계열, 명도만 조정
					lineColors.push(memberLine)
					lineWidths.push(1)
					textTemplates.push('%{label}<br>%{percentParent:.1%}')
				})
		})

		return {
			hasData: totalAssignments > 0,
			data: {
				type: 'treemap' as const,
				ids,
				labels,
				parents,
				values,
				texttemplate: textTemplates,
				textinfo: 'none', // 텍스트 템플릿으로만 노출 (절제)
				marker: { 
					colors,
					line: { color: lineColors, width: lineWidths }
				},
				textfont: {
					color: '#f8fafc',
					size: 13
				},
				branchvalues: 'total' as const,
				pathbar: { visible: false }, // 상단 경로 바 숨김 (깔끔하게)
				tiling: {
					packing: 'squarify', // 정사각형에 가깝게 분할
					pad: 3.5 // 간격 조금 넓혀서 가독성 향상
				},
				hovertemplate: '<b>%{label}</b><br>%{value}회<br>점유율: %{percentParent:.1%}<extra></extra>'
			}
		}
	}, [activeMemberNames, roleCounts, palette.series, roles])

	return (
		<div className="col" style={{ gap: 32, maxWidth: 1800, margin: '0 auto', padding: '0 12px', width: '100%' }}>
			
			{/* 1. 주차별 배정 타임라인 (Timeline) - 최상단 중요도 (Operations) */}
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
								{ label: '휴식', color: palette.surface2, border: palette.border },
								{ label: '불참', color: palette.negative },
								{ label: 'SW', color: palette.series[0] },
								{ label: '자막', color: palette.series[1] },
								{ label: '고정', color: palette.series[2] },
								{ label: '사이드', color: palette.series[3] },
								{ label: '스케치', color: palette.series[4] },
							].map(item => (
								<div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
									<span style={{ 
										width: 10, height: 10, borderRadius: 2, 
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
				{timelineChart.hasData ? (
					<ResponsivePlot
						height={timelineChart.height}
						data={timelineChart.data}
						layout={timelineChart.layout}
						config={{ displayModeBar: false }}
					/>
				) : (
					<div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-text-muted)', background: 'var(--color-surface-1)', borderRadius: 12, fontSize: '0.875rem' }}>
						주차별 데이터가 없습니다.
					</div>
				)}
			</Panel>

			{/* 2. 직무 배정 통계 (Role Assignments) - 핵심 성과 (Results) */}
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
				<ResponsivePlot
					key={member ? `role-member-${member}` : 'role-overview'}
					height={roleChart.height}
					data={roleChart.data}
					layout={roleChart.layout}
					config={{ displayModeBar: false }}
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
					{absenceChart.hasData ? (
						<ResponsivePlot
							height={absenceChart.height}
							key="absence-distribution-chart"
							data={absenceChart.data}
							layout={absenceChart.layout}
							config={{ displayModeBar: false }}
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
					{memberRoleHeatmap.hasData ? (
						<ResponsivePlot
							height={heatmapHeight}
							data={[{
								type: 'heatmap',
								x: memberRoleHeatmap.x,
								y: memberRoleHeatmap.y,
								z: memberRoleHeatmap.z,
								customdata: memberRoleHeatmap.customData,
								colorscale: heatmapColorscale as any,
								zmin: 0,
								zmax: 1,
								xgap: 2,
								ygap: 2,
								colorbar: {
									title: { text: '배정 비율', font: { size: 13 } },
									tickvals: [0, 0.5, 1],
									ticktext: ['0%', '50%', '100%'],
									tickfont: { size: 12 },
									thickness: 16,
									len: 0.8
								},
								hovertemplate:
									'<b>%{y}</b> · %{x}<br>' +
									'비율: <b>%{z:.1%}</b><br>' +
									'배정: %{customdata[0]}회<br>' +
									'출석: %{customdata[1]}주' +
									'<extra></extra>'
							}]}
							layout={{
								...baseLayout,
								margin: { l: 140, r: 48, t: 28, b: 56 },
								yaxis: {
									...baseLayout.yaxis,
									type: 'category',
									automargin: true,
									tickfont: { size: 14, color: palette.text, weight: 600 }
								},
								xaxis: {
									...baseLayout.xaxis,
									title: '',
									type: 'category',
									tickfont: { size: 14, color: palette.text },
									side: 'top'
								},
								hoverlabel: {
									...baseLayout.hoverlabel,
									font: { size: 13, color: palette.text, family: 'inherit' }
								}
							}}
							config={{ displayModeBar: false }}
						/>
					) : (
						<div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-text-muted)', background: 'var(--color-surface-1)', borderRadius: 12, fontSize: '0.875rem' }}>
							분석할 데이터가 없습니다.
						</div>
					)}
				</Panel>
			</div>

			{/* 4. 역할별 기여도 (Sunburst -> Treemap) - 시각적 요약 (Visual Summary) */}
			<Panel style={{ padding: 24 }}>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
					<div style={{ fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
						<span>역할별 지분 맵 (Treemap)</span>
						<ChartHelp description={chartHelpText.roleShare} />
					</div>
					<div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
						역할 박스 크기는 총 배정 횟수이며, 내부 칸들은 팀원들의 기여 지분을 나타냅니다. 테두리로 팀원 구획이 항상 보이도록 처리했습니다.
					</div>
				</div>
				{roleShareStats.hasData ? (
					<ResponsivePlot
						height={400} // Treemap은 높이가 너무 높지 않아도 잘 보입니다.
						data={[roleShareStats.data]}
						layout={{
							...baseLayout,
							margin: { l: 0, r: 0, t: 0, b: 0 }, // 꽉 채우기
							showlegend: false,
							font: { size: 13, color: '#fff' }, // 내부 텍스트는 흰색이 잘 보임 (보통)
							paper_bgcolor: 'transparent',
							plot_bgcolor: 'transparent'
						}}
						config={{ displayModeBar: false }}
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
