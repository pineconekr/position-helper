import { useCallback, useEffect, useMemo, useState } from 'react'
import { ResponsivePlot } from './ResponsivePlot'
import { Panel } from '@/shared/components/ui/Panel'
import { useAppStore } from '@/shared/state/store'
import { getChartPalette, HEATMAP_BLUES, HEATMAP_BLUES_DARK } from '@/shared/theme/chartColors'
import { useTheme } from '@/shared/theme/ThemeProvider'
import { motionDurMs, useMotionConfig } from '@/shared/utils/motion'
import type { RoleKey, WeekData } from '@/shared/types'

const roles: RoleKey[] = ['SW', '자막', '고정', '사이드', '스케치']
const chartHelpText = {
	roleAssignments: '전체 탭에서는 각 팀원의 배정 비율을 역할별로 100% 스택 막대로 확인하고, 특정 팀원을 선택하면 역할별 누적 배정 횟수를 보여줍니다.',
	absenceDistribution: '가로축은 결석 횟수, 세로축은 팀원입니다. 점 위치와 평균선으로 상대적인 결석 분포를 파악할 수 있습니다.',
	weeklyOperation: '막대는 해당 주에 배정·불참·휴식 인원의 비율(전체 활성 멤버 기준)을 뜻하며, 운영 여유나 과부하 구간을 빠르게 확인할 수 있습니다.',
	monthlyAbsence: 'X축은 YYYY-MM 입니다. 첫 꺾은선은 월별 불참률, 두 번째는 3개월 이동평균으로 추세 변화를 보여줍니다.',
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
				<path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2Zm0 15.75a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Zm.08-9.906c1.697 0 2.945 1.09 2.945 2.703 0 1.05-.46 1.794-1.387 2.343l-.56.33c-.45.265-.62.48-.62.987v.38h-1.92v-.46c0-1.006.305-1.595 1.07-2.054l.604-.36c.46-.27.676-.55.676-.965 0-.56-.4-.93-1.003-.93-.64 0-1.102.335-1.3.91l-1.78-.74c.39-1.12 1.47-2.144 3.275-2.144Z" fill="currentColor"/>
			</svg>
		</span>
	)
}

export default function StatsView() {
	const app = useAppStore((s) => s.app)
	const [member, setMember] = useState<string>('')
	const { theme, effectiveTheme } = useTheme()
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
		() => (effectiveTheme === 'dark' ? HEATMAP_BLUES_DARK : HEATMAP_BLUES),
		[effectiveTheme]
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

	const sortedMembers = [...memberOptions].sort((a, b) => {
		const totalA = Object.values(getRoleRecord(a)).reduce((acc, value) => acc + value, 0)
		const totalB = Object.values(getRoleRecord(b)).reduce((acc, value) => acc + value, 0)
		return totalB - totalA || a.localeCompare(b, 'ko')
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
	activeMemberNames.forEach((name) => counts.set(name, 0))

	Object.values(app.weeks).forEach((week) => {
		week.absences?.forEach((absence) => {
			const activeName = getActiveName(absence?.name)
			if (!activeName) return
			const prev = counts.get(activeName) ?? 0
			counts.set(activeName, prev + 1)
		})
	})

	const entries = Array.from(counts.entries())
		.filter(([name]) => !!name)
		.map(([name, count]) => ({ name, count }))
		.sort((a, b) => (b.count - a.count) || a.name.localeCompare(b.name, 'ko'))

	const total = entries.reduce((acc, entry) => acc + entry.count, 0)
	const average = entries.length > 0 ? total / entries.length : 0
	const maxCount = entries.reduce((acc, entry) => Math.max(acc, entry.count), 0)

	return {
		points: entries,
		average,
		maxCount
	}
}, [app.weeks, activeMemberNames, getActiveName])

const absenceChart = useMemo(() => {
	const points = absenceSummary.points
	const names = points.map((entry) => entry.name)
	const counts = points.map((entry) => entry.count)
	const average = absenceSummary.average
	const averageLabel = Number.isFinite(average) ? (Number.isInteger(average) ? `${average}` : average.toFixed(1)) : '0'
	const height = getBarChartHeight(points.length)
	const markerColors = counts.map((value) => {
		if (value === 0) return palette.neutral
		if (value > average) return palette.negative
		return palette.series[2]
	})
	const customdata = counts.map((value) => [value] as [number])

	return {
		hasData: points.length > 0,
		height,
		data: [{
			type: 'scatter' as const,
			mode: 'markers' as const,
			x: counts,
			y: names,
			customdata,
			marker: {
				size: 14,
				color: markerColors,
				line: { color: palette.border, width: 1 }
			},
			hovertemplate: '%{y}<br>결석: %{x}회<extra></extra>'
		}],
		layout: {
			...baseLayout,
			margin: { l: 140, r: 40, t: 28, b: 52 },
			xaxis: {
				...baseLayout.xaxis,
				title: '결석 횟수',
				rangemode: 'tozero' as const,
				tickformat: 'd',
				dtick: 1
			},
			yaxis: {
				...baseLayout.yaxis,
				type: 'category' as const,
				autorange: 'reversed' as const,
				automargin: true
			},
			shapes: points.length > 0 ? [{
				type: 'line' as const,
				xref: 'x' as const,
				yref: 'paper' as const,
				x0: average,
				x1: average,
				y0: 0,
				y1: 1,
				line: { color: palette.series[4], width: 2, dash: 'dash' as const }
			}] : [],
			annotations: points.length > 0 ? [{
				x: average,
				y: 1,
				xref: 'x' as const,
				yref: 'paper' as const,
				text: `평균 ${averageLabel}회`,
				showarrow: false,
				xanchor: 'left' as const,
				yanchor: 'bottom' as const,
				font: { color: palette.series[4], size: 12 },
				bgcolor: palette.surface2,
				bordercolor: palette.series[4],
				borderwidth: 0
			}] : []
		}
	}
}, [absenceSummary, palette, baseLayout])

const formatWeekLabel = (iso: string) => {
	const date = new Date(`${iso}T00:00:00`)
	if (Number.isNaN(date.getTime())) return iso
	return date.toLocaleDateString('ko-KR', {
		month: 'numeric',
		day: 'numeric',
		weekday: 'short'
	})
}

const weeklyOperation = useMemo(() => {
	const entries = Object.entries(app.weeks).sort((a, b) => a[0].localeCompare(b[0]))
	const isoDates: string[] = []
	const labels: string[] = []
	const assignedCounts: number[] = []
	const absenceCounts: number[] = []
	const restCounts: number[] = []
	const totals: number[] = []

	const activeSet = new Set(activeMemberNames)

	const collectAssignment = (acc: Set<string>, entry: unknown) => {
		if (!entry) return
		if (Array.isArray(entry)) {
			entry.forEach((value) => collectAssignment(acc, value))
			return
		}
		const activeName = getActiveName(entry)
		if (!activeName) return
		acc.add(activeName)
	}

	for (const [date, week] of entries) {
		const assigned = new Set<string>()
		collectAssignment(assigned, week.part1?.SW)
		collectAssignment(assigned, week.part1?.자막)
		collectAssignment(assigned, week.part1?.고정)
		collectAssignment(assigned, week.part1?.스케치)
		collectAssignment(assigned, week.part1?.['사이드'])
		collectAssignment(assigned, week.part2?.SW)
		collectAssignment(assigned, week.part2?.자막)
		collectAssignment(assigned, week.part2?.고정)
		collectAssignment(assigned, week.part2?.스케치)
		collectAssignment(assigned, week.part2?.['사이드'])

		const absentees = new Set<string>()
		week.absences?.forEach((absence) => {
			const activeName = getActiveName(absence?.name)
			if (!activeName) return
			absentees.add(activeName)
		})

		const baseline = activeSet.size > 0
			? activeSet.size
			: new Set([...assigned, ...absentees]).size

		if (baseline === 0) continue

		const assignedCount = assigned.size
		const absenceCount = absentees.size
		const restCount = Math.max(baseline - assignedCount - absenceCount, 0)

		isoDates.push(date)
		labels.push(formatWeekLabel(date))
		assignedCounts.push(assignedCount)
		absenceCounts.push(absenceCount)
		restCounts.push(restCount)
		totals.push(baseline)
	}

	const fractions = (values: number[], totalsArr: number[]) =>
		values.map((value, idx) => {
			const total = totalsArr[idx] ?? 0
			return total > 0 ? value / total : 0
		})

	return {
		isoDates,
		labels,
		assigned: assignedCounts,
		absence: absenceCounts,
		rest: restCounts,
		totals,
		fractions: {
			assigned: fractions(assignedCounts, totals),
			absence: fractions(absenceCounts, totals),
			rest: fractions(restCounts, totals)
		}
	}
}, [app.weeks, activeMemberNames, getActiveName])

const weeklyOperationChart = useMemo(() => {
	const { labels, assigned, absence, rest, totals, fractions } = weeklyOperation
	const makeCustomData = (values: number[], ratio: number[]) =>
		values.map((value, idx) => [value, totals[idx] ?? 0, ratio[idx] ?? 0] as [number, number, number])

	return {
		hasData: labels.length > 0,
		data: [{
			type: 'bar' as const,
			name: '배정됨',
			x: labels,
			y: assigned,
			customdata: makeCustomData(assigned, fractions.assigned),
			marker: { color: palette.series[3], opacity: 0.95 },
			hovertemplate: '%{x}<br>배정: %{customdata[0]}명 (%{customdata[2]:.0%})<br>기준: %{customdata[1]}명<extra></extra>'
		}, {
			type: 'bar' as const,
			name: '미배정(휴식)',
			x: labels,
			y: rest,
			customdata: makeCustomData(rest, fractions.rest),
			marker: { color: palette.neutral, opacity: 0.9 },
			hovertemplate: '%{x}<br>휴식: %{customdata[0]}명 (%{customdata[2]:.0%})<br>기준: %{customdata[1]}명<extra></extra>'
		}, {
			type: 'bar' as const,
			name: '불참',
			x: labels,
			y: absence,
			customdata: makeCustomData(absence, fractions.absence),
			marker: { color: palette.negative, opacity: 0.85 },
			hovertemplate: '%{x}<br>불참: %{customdata[0]}명 (%{customdata[2]:.0%})<br>기준: %{customdata[1]}명<extra></extra>'
		}],
		layout: {
			...baseLayout,
			margin: { l: 56, r: 56, t: 36, b: 64 },
			xaxis: {
				...baseLayout.xaxis,
				tickangle: -45,
				title: '주차'
			},
			yaxis: {
				...baseLayout.yaxis,
				title: '인원 비율',
				tickformat: '.0%',
				tickvals: [0, 0.5, 1],
				ticktext: ['0%', '50%', '100%'],
				rangemode: 'tozero'
			},
			barmode: 'stack' as const,
			barnorm: 'fraction' as const,
			legend: {
				orientation: 'h' as const,
				yanchor: 'bottom' as const,
				y: 1.05,
				xanchor: 'left' as const,
				x: 0
			}
		}
	}
}, [weeklyOperation, palette, baseLayout])

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
	const weeklyChartHeight = 460
	const monthlyChartHeight = 360
	const monthlyAbsenceTrend = useMemo(() => {
		const monthRecords = new Map<number, { absences: number; slots: number }>()
		let minIndex = Number.POSITIVE_INFINITY
		let maxIndex = Number.NEGATIVE_INFINITY
		const countSlots = (part?: WeekData['part1']) => {
			if (!part) return 0
			let total = 0
			roles.forEach((role) => {
				const value = part[role]
				if (role === '사이드') {
					total += Array.isArray(value) ? value.reduce((acc, item) => (typeof item === 'string' && item.trim().length > 0 ? acc + 1 : acc), 0) : 0
				} else if (typeof value === 'string' && value.trim().length > 0) {
					total += 1
				}
			})
			return total
		}
		for (const [date, week] of Object.entries(app.weeks)) {
			const [yearStr, monthStr] = date.split('-')
			const year = Number(yearStr)
			const month = Number(monthStr)
			if (Number.isNaN(year) || Number.isNaN(month)) continue
			const index = year * 12 + (month - 1)
			if (!monthRecords.has(index)) monthRecords.set(index, { absences: 0, slots: 0 })
			const record = monthRecords.get(index)!
			record.absences += week.absences?.length ?? 0
			record.slots += countSlots(week.part1) + countSlots(week.part2)
			minIndex = Math.min(minIndex, index)
			maxIndex = Math.max(maxIndex, index)
		}
		if (!monthRecords.size || !Number.isFinite(minIndex) || !Number.isFinite(maxIndex)) {
			return { x: [] as string[], rate: [] as number[], ma3: [] as number[] }
		}
		const labels: string[] = []
		const rates: number[] = []
		for (let idx = minIndex; idx <= maxIndex; idx++) {
			const year = Math.floor(idx / 12)
			const month = (idx % 12) + 1
			const label = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`
			const record = monthRecords.get(idx)
			const absences = record?.absences ?? 0
			const slots = record?.slots ?? 0
			const totalCapacity = absences + slots
			const rate = totalCapacity === 0 ? 0 : absences / totalCapacity
			labels.push(label)
			rates.push(rate)
		}
		const ma3 = rates.map((_, idx) => {
			const start = Math.max(0, idx - 2)
			const slice = rates.slice(start, idx + 1)
			const sum = slice.reduce((acc, value) => acc + value, 0)
			return slice.length > 0 ? sum / slice.length : 0
		})
		return { x: labels, rate: rates, ma3 }
	}, [app.weeks])

	return (
		<div className="col" style={{ gap: 32, maxWidth: 1800, margin: '0 auto', padding: '0 12px', width: '100%' }}>
			
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

			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 560px), 1fr))', gap: 28 }}>
				{/* 1) 개인 불참 분포 */}
				<Panel style={{ padding: 24 }}>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
						<div style={{ fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
							<span>개인 불참 분포</span>
							<ChartHelp description={chartHelpText.absenceDistribution} />
						</div>
						<div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
							결석 횟수 분포와 평균선을 함께 확인해 상습 결석 구간을 파악합니다.
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

				{/* 3) 월별 불참률 추세 */}
				<Panel style={{ padding: 24 }}>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
						<div style={{ fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
							<span>월별 불참률 추세</span>
							<ChartHelp description={chartHelpText.monthlyAbsence} />
						</div>
						<div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
							월별 불참률과 3개월 이동평균으로 추세를 확인합니다.
						</div>
					</div>
					{monthlyAbsenceTrend.x.length > 0 ? (
						<ResponsivePlot
							height={monthlyChartHeight}
							data={[
								{
									type: 'scatter',
									mode: 'lines+markers',
									x: monthlyAbsenceTrend.x,
									y: monthlyAbsenceTrend.rate,
									name: '월별 불참률',
									line: { color: palette.negative, width: 2 },
									marker: { color: palette.negative, size: 6 },
									hovertemplate: '%{x}<br>불참률: %{y:.2%}<extra></extra>'
								},
								{
									type: 'scatter',
									mode: 'lines',
									x: monthlyAbsenceTrend.x,
									y: monthlyAbsenceTrend.ma3,
									name: '3개월 이동평균',
									line: { color: palette.series[2], width: 3 },
									hovertemplate: '%{x}<br>3개월 MA: %{y:.2%}<extra></extra>'
								}
							]}
							layout={{
								...baseLayout,
								margin: { l: 68, r: 28, t: 28, b: 64 },
								yaxis: {
									...baseLayout.yaxis,
									title: '불참률',
									rangemode: 'tozero',
									tickformat: '.0%'
								},
								xaxis: {
									...baseLayout.xaxis,
									type: 'category',
									tickangle: -45
								},
								legend: {
									orientation: 'h',
									yanchor: 'bottom',
									y: 1.05,
									xanchor: 'right',
									x: 1
								}
							}}
							config={{ displayModeBar: false }}
						/>
					) : (
						<div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-text-muted)', background: 'var(--color-surface-1)', borderRadius: 12, fontSize: '0.875rem' }}>
							월별 데이터가 없습니다.
						</div>
					)}
				</Panel>
			</div>

			{/* 2) 주차별 운영 현황 */}
			<Panel style={{ padding: 24, gridColumn: '1 / -1' }}>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
					<div style={{ fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
						<span>주차별 운영 현황</span>
						<ChartHelp description={chartHelpText.weeklyOperation} />
					</div>
					<div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
						활성 멤버 대비 배정·불참·휴식 비율로 운영 여유와 과부하 구간을 파악합니다.
					</div>
				</div>
				{weeklyOperationChart.hasData ? (
					<ResponsivePlot
						height={weeklyChartHeight}
						data={weeklyOperationChart.data}
						layout={weeklyOperationChart.layout}
						config={{ displayModeBar: false }}
					/>
				) : (
					<div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-text-muted)', background: 'var(--color-surface-1)', borderRadius: 12, fontSize: '0.875rem' }}>
						주차별 운영 데이터가 없습니다.
					</div>
				)}
			</Panel>

			{/* 4) 팀원 × 역할 출석 보정 히트맵 */}
			<Panel style={{ padding: 24, gridColumn: '1 / -1' }}>
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
	)
}
