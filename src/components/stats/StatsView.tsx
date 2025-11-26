import Plot from 'react-plotly.js'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppStore } from '../../state/store'
import type { RoleKey, WeekData } from '../../types'
import { motionDurMs, useMotionConfig } from '../../utils/motion'
import { getChartPalette } from '../../theme/chartColors'
import { useTheme } from '../../theme/ThemeProvider'
import { Panel } from '../ui/Panel'

const roles: RoleKey[] = ['SW', '자막', '고정', '사이드', '스케치']
const chartHelpText = {
	roleAssignments: '막대 길이는 총 배정 횟수를 의미합니다. "전체"에서는 팀원별 총합이 내림차순으로 정렬되고, 특정 팀원을 선택하면 역할별 막대가 표시됩니다.',
	absenceDeviation: '가로 위치는 평균(중앙값) 대비 결석 편차를 뜻합니다. 녹색은 평균보다 적게, 회색은 비슷하게, 빨간색은 더 많이 결석한 경우를 나타냅니다.',
	weeklyAbsence: '막대는 해당 주의 결석자 수, 점선은 최근 4주 평균, 노란 선은 배정 변동계수(CV)로 배정 편차가 클수록 값이 커집니다.',
	monthlyAbsence: 'X축은 YYYY-MM 입니다. 첫 꺾은선은 월별 불참률, 두 번째는 3개월 이동평균으로 추세 변화를 보여줍니다.',
	memberRoleHeatmap: '행은 팀원, 열은 역할입니다. 색이 진할수록 출석 대비 해당 역할을 자주 맡았음을 의미하며, 호버 시 비율과 횟수를 확인할 수 있습니다.'
} as const

function ChartHelp({ description }: { description: string }) {
	return (
		<span className="chart-help" title={description} aria-label="차트 해설" tabIndex={0} style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 8, color: 'var(--color-text-muted)', cursor: 'help' }}>
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2Zm0 15.75a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Zm.08-9.906c1.697 0 2.945 1.09 2.945 2.703 0 1.05-.46 1.794-1.387 2.343l-.56.33c-.45.265-.62.48-.62.987v.38h-1.92v-.46c0-1.006.305-1.595 1.07-2.054l.604-.36c.46-.27.676-.55.676-.965 0-.56-.4-.93-1.003-.93-.64 0-1.102.335-1.3.91l-1.78-.74c.39-1.12 1.47-2.144 3.275-2.144Z" fill="currentColor"/>
			</svg>
		</span>
	)
}

export default function StatsView() {
	const app = useAppStore((s) => s.app)
	const [member, setMember] = useState<string>('')
	const { theme } = useTheme()
	const { shouldReduce } = useMotionConfig()
	const getBarChartHeight = (itemCount: number) => Math.max(300, itemCount * 30 + 80)
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

	useEffect(() => {
		if (!member) return
		const status = memberStatusMap.get(member)
		if (status === false) setMember('')
	}, [member, memberStatusMap])

	const { x, y } = useMemo(() => {
		const x: string[] = []
		const y: number[] = []
		const getRecord = (name: string): Record<RoleKey, number> =>
			roleCounts.get(name) ?? { SW: 0, 자막: 0, 고정: 0, 사이드: 0, 스케치: 0 }

		if (member) {
			const rec = getRecord(member)
			roles.forEach((role) => {
				x.push(role)
				y.push(rec[role])
			})
		} else {
			const aggregates = memberOptions.map((name) => {
				const rec = getRecord(name)
				return { name, total: Object.values(rec).reduce((a, b) => a + b, 0) }
			})
			aggregates.sort((a, b) => (b.total - a.total) || a.name.localeCompare(b.name, 'ko'))
			aggregates.forEach(({ name, total }) => {
				x.push(name)
				y.push(total)
			})
		}
		return { x, y }
	}, [member, memberOptions, roleCounts])

	// 불참 데이터 집계
	const absenceByMember = useMemo(() => {
		const knownNames = new Set<string>()
		app.members.forEach((m) => {
			const activeName = getActiveName(m.name)
			if (activeName) knownNames.add(activeName)
		})
		for (const week of Object.values(app.weeks)) {
			week.absences?.forEach((absence) => {
				const activeName = getActiveName(absence?.name)
				if (activeName) knownNames.add(activeName)
			})
		}

		const counts = new Map<string, number>()
		knownNames.forEach((name) => counts.set(name, 0))

		for (const week of Object.values(app.weeks)) {
			week.absences?.forEach((absence) => {
				const activeName = getActiveName(absence?.name)
				if (!activeName) return
				const prev = counts.get(activeName) ?? 0
				counts.set(activeName, prev + 1)
			})
		}

		const entries = Array.from(counts.entries())
			.filter(([name]) => !!name)
			.map(([name, value]) => ({ n: name, v: value }))
			.sort((a, b) => (b.v - a.v) || a.n.localeCompare(b.n, 'ko'))

		const values = entries.map((entry) => entry.v)
		const sortedValues = [...values].sort((a, b) => a - b)
		const percentile = (arr: number[], p: number) => {
			if (arr.length === 0) return 0
			if (arr.length === 1) return arr[0] ?? 0
			const index = (arr.length - 1) * p
			const lowerIndex = Math.max(0, Math.min(Math.floor(index), arr.length - 1))
			const upperIndex = Math.max(0, Math.min(Math.ceil(index), arr.length - 1))
			const lowerValue = arr[lowerIndex]!
			const upperValue = arr[upperIndex]!
			if (lowerIndex === upperIndex) return lowerValue
			const weight = index - lowerIndex
			return lowerValue * (1 - weight) + upperValue * weight
		}
		const median = percentile(sortedValues, 0.5)
		const q1 = percentile(sortedValues, 0.25)
		const q3 = percentile(sortedValues, 0.75)
		const rawIqr = q3 - q1
		const safeIqr = rawIqr === 0 ? 1 : rawIqr
		const normalized = entries.map((entry) => (entry.v - median) / safeIqr)
		const maxAbs = normalized.reduce((max, value) => Math.max(max, Math.abs(value)), 0)

		return {
			names: entries.map((entry) => entry.n),
			counts: values,
			normalized,
			stats: { q1, median, q3, iqr: safeIqr, rawIqr, hasVariation: rawIqr !== 0 },
			maxAbs
		}
	}, [app.members, app.weeks, getActiveName])

	const absenceDivergenceExtent = useMemo(() => (absenceByMember.maxAbs === 0 ? 1 : absenceByMember.maxAbs * 1.15), [absenceByMember.maxAbs])
	const absenceMedianLabel = useMemo(() => {
		const median = absenceByMember.stats.median
		if (!Number.isFinite(median)) return '-'
		return Number.isInteger(median) ? `${median}` : median.toFixed(1)
	}, [absenceByMember.stats])

	const absenceChartData = useMemo(() => ({
		type: 'bar' as const,
		orientation: 'h' as const,
		x: absenceByMember.normalized,
		y: absenceByMember.names,
		text: absenceByMember.counts.map((count) => `${count}회`),
		textposition: 'outside' as const,
		insidetextanchor: 'middle' as const,
		customdata: absenceByMember.counts,
		hovertemplate: '%{y}<br>결석: %{customdata}회<br>편차(IQR): %{x:.2f}<extra></extra>',
		marker: {
			color: absenceByMember.normalized.map((value) => {
				if (value > 0.05) return palette.negative
				if (value < -0.05) return palette.positive
				return palette.neutral
			})
		}
	}), [absenceByMember.normalized, absenceByMember.names, absenceByMember.counts, palette.negative, palette.positive, palette.neutral])

	const absenceChartLayout = useMemo(() => ({
		...baseLayout,
		margin: { l: 120, r: 10, t: 10, b: 40 },
		xaxis: {
			...baseLayout.xaxis,
			title: 'IQR 정규화 편차 (중앙값 기준)',
			range: [-absenceDivergenceExtent, absenceDivergenceExtent] as [number, number],
			zeroline: true,
			zerolinecolor: palette.series[4],
			zerolinewidth: 2,
			gridcolor: palette.grid
		},
		yaxis: {
			...baseLayout.yaxis,
			type: 'category' as const,
			autorange: 'reversed' as const,
			automargin: true
		},
		shapes: [{
			type: 'line' as const,
			xref: 'x' as const,
			yref: 'paper' as const,
			x0: 0,
			x1: 0,
			y0: 0,
			y1: 1,
			line: { color: palette.series[4], width: 2 }
		}],
		annotations: [{
			x: 0,
			y: 1,
			xref: 'x' as const,
			yref: 'paper' as const,
			text: `중앙값 ${absenceMedianLabel}회`,
			showarrow: false,
			xanchor: 'left' as const,
			yanchor: 'bottom' as const,
			font: { color: palette.series[4], size: 12 },
			bgcolor: palette.surface2,
			bordercolor: palette.series[4],
			borderwidth: 0
		}]
	}), [baseLayout, absenceDivergenceExtent, absenceMedianLabel, palette.series, palette.grid])

	const weeklyAbsence = useMemo(() => {
		const entries = Object.entries(app.weeks).sort((a, b) => a[0].localeCompare(b[0]))
		const x: string[] = []
		const y: number[] = []
		for (const [date, week] of entries) {
			x.push(date)
			const count = (week.absences ?? []).reduce((acc, absence) => acc + (getActiveName(absence?.name) ? 1 : 0), 0)
			y.push(count)
		}
		return { x, y }
	}, [app.weeks, getActiveName])

	const weeklyFairness = useMemo(() => {
		const entries = Object.entries(app.weeks).sort((a, b) => a[0].localeCompare(b[0]))
		const x: string[] = []
		const meanAssignments: number[] = []
		const cvAssignments: number[] = []
		const accumulate = (bucket: Map<string, number>, entry: unknown) => {
			if (!entry) return
			if (Array.isArray(entry)) {
				entry.forEach((value) => accumulate(bucket, value))
				return
			}
			const activeName = getActiveName(entry)
			if (!activeName) return
			const prev = bucket.get(activeName) ?? 0
			bucket.set(activeName, prev + 1)
		}
		for (const [date, week] of entries) {
			const counts = new Map<string, number>()
			const pushRole = (part: WeekData['part1']) => {
				if (!part) return
				accumulate(counts, part.SW)
				accumulate(counts, part.자막)
				accumulate(counts, part.고정)
				accumulate(counts, part['사이드'])
				accumulate(counts, part.스케치)
			}
			pushRole(week.part1)
			pushRole(week.part2)
			const values = Array.from(counts.values())
			const total = values.reduce((acc, value) => acc + value, 0)
			const mean = values.length > 0 ? total / values.length : 0
			const variance = values.length > 0 ? values.reduce((acc, value) => {
				const diff = value - mean
				return acc + diff * diff
			}, 0) / (values.length || 1) : 0
			const stdDev = Math.sqrt(variance)
			const cv = mean > 0 ? stdDev / mean : 0
			x.push(date)
			meanAssignments.push(mean)
			cvAssignments.push(cv)
		}
		return { x, mean: meanAssignments, cv: cvAssignments }
	}, [app.weeks, getActiveName])

	const weeklyAbsenceMA = useMemo(() => {
		const window = 4
		const out: (number | null)[] = []
		const arr = weeklyAbsence.y
		for (let i = 0; i < arr.length; i++) {
			const start = Math.max(0, i - window + 1)
			const slice = arr.slice(start, i + 1)
			const avg = slice.reduce((a, b) => a + b, 0) / slice.length
			out.push(avg)
		}
		return out
	}, [weeklyAbsence])

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
				const custom = roles.map((role) => [stats.roleWeeks[role], stats.attendance] as [number, number])
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
		<div className="col" style={{ gap: 24, maxWidth: 1600, margin: '0 auto', width: '100%' }}>
			
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
						전체 또는 선택한 팀원의 직무 배정 횟수를 막대 그래프로 확인합니다.
					</div>
				</div>
				<div style={{ minHeight: member ? 400 : getBarChartHeight(x.length) }}>
					<Plot
						data={[{ type: 'bar', x, y, marker: { color: palette.series[0] } }]}
						layout={{
							...baseLayout,
							margin: { l: 40, r: 20, t: 20, b: 60 },
							xaxis: {
								...baseLayout.xaxis,
								tickangle: -45,
								automargin: true
							}
						}}
						config={{ displayModeBar: false, responsive: true }}
						useResizeHandler
						style={{ width: '100%', height: '100%' }}
					/>
				</div>
			</Panel>

			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 500px), 1fr))', gap: 24 }}>
				{/* 1) 개인 불참 편차 */}
				<Panel style={{ padding: 24 }}>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
						<div style={{ fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
							<span>개인 불참 편차</span>
							<ChartHelp description={chartHelpText.absenceDeviation} />
						</div>
						<div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
							중앙값 대비 편차(IQR)로 상습/과소 결석자를 파악합니다.
						</div>
					</div>
					{absenceByMember.names.length > 0 ? (
						<>
							<div style={{ minHeight: getBarChartHeight(absenceByMember.names.length) }}>
								<Plot
									key="absence-deviation-chart"
									data={[absenceChartData]}
									layout={absenceChartLayout}
									config={{ displayModeBar: false, responsive: true }}
									useResizeHandler
									style={{ width: '100%', height: '100%' }}
								/>
							</div>
							{!absenceByMember.stats.hasVariation && (
								<div className="muted" style={{ marginTop: 8, fontSize: 13, textAlign: 'center' }}>
									모든 구성원의 결석 횟수가 동일해 편차가 0입니다.
								</div>
							)}
						</>
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
						<div style={{ flex: 1, minHeight: 300 }}>
							<Plot
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
									margin: { l: 60, r: 20, t: 20, b: 40 },
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
								config={{ displayModeBar: false, responsive: true }}
								useResizeHandler
								style={{ width: '100%', height: '100%' }}
							/>
						</div>
					) : (
						<div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-text-muted)', background: 'var(--color-surface-1)', borderRadius: 12, fontSize: '0.875rem' }}>
							월별 데이터가 없습니다.
						</div>
					)}
				</Panel>
			</div>

			{/* 2) 주차별 불참 vs 배정 편차 (Dual Axis) */}
			<Panel style={{ padding: 24, gridColumn: '1 / -1' }}>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
					<div style={{ fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
						<span>주차별 불참 & 배정 공정성</span>
						<ChartHelp description={chartHelpText.weeklyAbsence} />
					</div>
					<div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
						불참자 수(막대)와 배정 변동계수(CV, 꺾은선)를 비교하여 공정성 저하 구간을 찾습니다.
					</div>
				</div>
				{weeklyAbsence.x.length > 0 ? (
					<div style={{ minHeight: 400 }}>
						<Plot
							data={[
								{
									type: 'bar',
									x: weeklyAbsence.x,
									y: weeklyAbsence.y,
									name: '불참자 수',
									marker: { color: palette.negative, opacity: 0.8 },
									hovertemplate: '%{x}<br>불참자: %{y}명<extra></extra>',
									yaxis: 'y'
								},
								{
									type: 'scatter',
									mode: 'lines',
									x: weeklyAbsence.x,
									y: weeklyAbsenceMA,
									name: '불참 4주 이동평균',
									line: { color: palette.series[1], width: 2, dash: 'dot' },
									hovertemplate: '%{x}<br>4주 평균: %{y:.2f}명<extra></extra>',
									yaxis: 'y'
								},
								{
									type: 'scatter',
									mode: 'lines+markers',
									x: weeklyFairness.x,
									y: weeklyFairness.cv,
									name: '배정 CV',
									line: { color: palette.series[5], width: 3 },
									marker: { color: palette.series[5], size: 6 },
									hovertemplate: '%{x}<br>CV: %{y:.3f}<extra></extra>',
									yaxis: 'y2'
								}
							]}
							layout={{
								...baseLayout,
								margin: { l: 40, r: 40, t: 30, b: 40 },
								xaxis: {
									...baseLayout.xaxis,
									tickangle: -45
								},
								yaxis: {
									...baseLayout.yaxis,
									title: '불참자 수',
									rangemode: 'tozero'
								},
								yaxis2: {
									title: '배정 변동계수(CV)',
									titlefont: { color: palette.series[5] },
									tickfont: { color: palette.series[5] },
									overlaying: 'y',
									side: 'right',
									zeroline: false,
									showgrid: false
								},
								legend: {
									orientation: 'h',
									yanchor: 'bottom',
									y: 1.05,
									xanchor: 'left',
									x: 0
								}
							}}
							config={{ displayModeBar: false, responsive: true }}
							useResizeHandler
							style={{ width: '100%', height: '100%' }}
						/>
					</div>
				) : (
					<div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-text-muted)', background: 'var(--color-surface-1)', borderRadius: 12, fontSize: '0.875rem' }}>
						주차별 데이터가 없습니다.
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
					<div style={{ minHeight: getBarChartHeight(memberRoleHeatmap.y.length) }}>
						<Plot
							data={[{
								type: 'heatmap',
								x: memberRoleHeatmap.x,
								y: memberRoleHeatmap.y,
								z: memberRoleHeatmap.z,
								customdata: memberRoleHeatmap.customData,
								colorscale: 'Blues',
								zmin: 0,
								zmax: 1,
								colorbar: { title: '배정 비율' },
								hovertemplate: '%{y} · %{x}<br>비율: %{z:.2f}<br>배정: %{customdata[0]}회<br>출석: %{customdata[1]}주<extra></extra>'
							}]}
							layout={{
								...baseLayout,
								margin: { l: 120, r: 40, t: 20, b: 40 },
								yaxis: {
									...baseLayout.yaxis,
									type: 'category',
									automargin: true
								},
								xaxis: {
									...baseLayout.xaxis,
									title: '역할',
									type: 'category'
								}
							}}
							config={{ displayModeBar: false, responsive: true }}
							useResizeHandler
							style={{ width: '100%', height: '100%' }}
						/>
					</div>
				) : (
					<div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-text-muted)', background: 'var(--color-surface-1)', borderRadius: 12, fontSize: '0.875rem' }}>
						분석할 데이터가 없습니다.
					</div>
				)}
			</Panel>
		</div>
	)
}
