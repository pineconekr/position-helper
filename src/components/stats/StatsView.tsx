import Plot from 'react-plotly.js'
import { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '../../state/store'
import type { RoleKey } from '../../types'

const roles: RoleKey[] = ['SW', '자막', '고정', '사이드', '스케치']

export default function StatsView() {
	const app = useAppStore((s) => s.app)
	const [member, setMember] = useState<string>('')
	const [theme, setTheme] = useState<'light' | 'dark'>(() => (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') || 'light')
	const activeMembers = useMemo(() => app.members.filter((m) => m.active !== false), [app.members])
	const chartHeight = 400
	const getBarChartHeight = (itemCount: number) => Math.max(300, itemCount * 30 + 80)

	useEffect(() => {
		const target = document.documentElement
		const observer = new MutationObserver(() => {
			const t = (target.getAttribute('data-theme') as 'light' | 'dark') || 'light'
			setTheme(t)
		})
		observer.observe(target, { attributes: true, attributeFilter: ['data-theme'] })
		return () => observer.disconnect()
	}, [])

	const stylePalette = useMemo(() => {
		const isDark = theme === 'dark'
		return {
			text: 'var(--text)',
			grid: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
			axis: isDark ? 'rgba(255,255,255,0.32)' : 'rgba(0,0,0,0.32)',
			panel: 'var(--panel)',
			border: 'var(--border)',
			// trace colors
			roleBar: isDark ? '#93c5fd' : '#2563eb',
			absenceBar: isDark ? '#67e8f9' : '#0891b2',
			line: isDark ? '#60a5fa' : '#1d4ed8',
			lineMA: isDark ? '#fbbf24' : '#b45309',
			meanLine: '#ef4444'
		}
	}, [theme])

	const baseLayout = useMemo(() => ({
		paper_bgcolor: 'transparent',
		plot_bgcolor: 'transparent',
		font: { color: stylePalette.text },
		margin: { l: 40, r: 10, t: 10, b: 40 },
		hoverlabel: {
			bgcolor: stylePalette.panel,
			bordercolor: stylePalette.border,
			font: { color: stylePalette.text }
		},
		xaxis: {
			gridcolor: stylePalette.grid,
			zerolinecolor: stylePalette.grid,
			linecolor: stylePalette.axis
		},
		yaxis: {
			gridcolor: stylePalette.grid,
			zerolinecolor: stylePalette.grid,
			linecolor: stylePalette.axis
		}
	}), [stylePalette])

	const roleCounts = useMemo(() => {
		const counts = new Map<string, Record<RoleKey, number>>()
		for (const week of Object.values(app.weeks)) {
			const push = (name: string, role: RoleKey) => {
				if (!name) return
				const rec = counts.get(name) ?? { SW: 0, 자막: 0, 고정: 0, 사이드: 0, 스케치: 0 }
				rec[role] += 1
				counts.set(name, rec)
			}
			roles.forEach((r) => push(week.part1[r] as any, r))
			roles.forEach((r) => push(week.part2[r] as any, r))
			week.part1['사이드'].forEach((n) => push(n, '사이드'))
			week.part2['사이드'].forEach((n) => push(n, '사이드'))
		}
		return counts
	}, [app.weeks])

	const { x, y } = useMemo(() => {
		const x: string[] = []
		const y: number[] = []
		if (member) {
			const rec = roleCounts.get(member) ?? { SW: 0, 자막: 0, 고정: 0, 사이드: 0, 스케치: 0 }
			roles.forEach((r) => { x.push(r); y.push(rec[r]) })
		} else {
			for (const m of activeMembers.map((m) => m.name)) {
				const rec = roleCounts.get(m) ?? { SW: 0, 자막: 0, 고정: 0, 사이드: 0, 스케치: 0 }
				x.push(m)
				y.push(Object.values(rec).reduce((a, b) => a + b, 0))
			}
		}
		return { x, y }
	}, [member, activeMembers, roleCounts])

	// 불참 데이터 집계
	const absenceByMember = useMemo(() => {
		const names = new Set(activeMembers.map((m) => m.name))
		const counts = new Map<string, number>()
		for (const n of names) counts.set(n, 0)
		for (const [date, week] of Object.entries(app.weeks)) {
			week.absences?.forEach((a) => {
				if (!names.has(a.name)) return
				const prev = counts.get(a.name) ?? 0
				counts.set(a.name, prev + 1)
			})
		}
		const ordered = Array.from(names)
		const series = ordered.map((n) => counts.get(n) ?? 0)
		// 내림차순 정렬 적용
		const zipped = ordered
			.map((n, i) => ({ n, v: series[i] }))
			.sort((a, b) => (b.v - a.v) || a.n.localeCompare(b.n))
		return { names: zipped.map((z) => z.n), counts: zipped.map((z) => z.v) }
	}, [activeMembers, app.weeks])

	const absenceMean = useMemo(() => {
		if (absenceByMember.counts.length === 0) return 0
		const sum = absenceByMember.counts.reduce((a, b) => a + b, 0)
		return sum / absenceByMember.counts.length
	}, [absenceByMember])

	const weeklyAbsence = useMemo(() => {
		const entries = Object.entries(app.weeks).sort((a, b) => a[0].localeCompare(b[0]))
		const x: string[] = []
		const y: number[] = []
		for (const [date, week] of entries) {
			x.push(date)
			y.push(week.absences?.length ?? 0)
		}
		return { x, y }
	}, [app.weeks])

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

	const monthlyHeatmap = useMemo(() => {
		const monthLabels = ['01','02','03','04','05','06','07','08','09','10','11','12']
		const yearsSet = new Set<string>()
		const buckets = new Map<string, number[]>()
		const ensureYear = (y: string) => {
			if (!buckets.has(y)) buckets.set(y, new Array(12).fill(0))
			yearsSet.add(y)
		}
		for (const [date, week] of Object.entries(app.weeks)) {
			const [year, month] = date.split('-')
			ensureYear(year)
			const idx = Number(month) - 1
			const row = buckets.get(year)!
			row[idx] += week.absences?.length ?? 0
		}
		const years = Array.from(yearsSet).sort()
		const z = years.map((y) => buckets.get(y) ?? new Array(12).fill(0))
		return { x: monthLabels, y: years, z }
	}, [app.weeks])

	return (
		<>
			<div className="panel" style={{ padding: 12 }}>
				<div className="toolbar">
					<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
						<label>팀원 필터</label>
						<select value={member} onChange={(e) => setMember(e.target.value)}>
							<option value="">전체</option>
							{activeMembers.map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}
						</select>
					</div>
				</div>
				<div className="muted" style={{ marginBottom: 8 }}>
					직무 배정 통계: 전체(또는 선택한 팀원)의 직무 배정 횟수를 확인할 수 있습니다.
				</div>
				<Plot
					data={[{ type: 'bar', x, y, marker: { color: stylePalette.roleBar } }]}
					layout={{ ...baseLayout }}
					config={{ displayModeBar: false, responsive: true }}
					useResizeHandler
					style={{ width: '100%', height: chartHeight }}
				/>
			</div>

			<div className="panel" style={{ padding: 12 }}>
				<h3 style={{ marginTop: 0 }}>불참 시각화</h3>

				{/* 1) 개인 불참 횟수 수평 막대 + 평균선 */}
				<div className="muted" style={{ marginBottom: 8 }}>
					개인 불참 횟수(내림차순)와 평균선: 공정성/부담 편차를 빠르게 파악합니다.
				</div>
				{absenceByMember.names.length > 0 ? (
					<Plot
						data={[{
							type: 'bar',
							orientation: 'h',
							x: absenceByMember.counts,
							y: absenceByMember.names,
							marker: { color: stylePalette.absenceBar }
						}]}
						layout={{
							...baseLayout,
							margin: { l: 140, r: 10, t: 10, b: 40 },
							...(absenceMean > 0 && {
								shapes: [{
									type: 'line',
									xref: 'x',
									yref: 'paper',
									x0: absenceMean,
									x1: absenceMean,
									y0: 0,
									y1: 1,
									line: { color: stylePalette.meanLine, width: 2, dash: 'dot' }
								}] as any,
								annotations: [{
									x: absenceMean,
									y: 1,
									xref: 'x',
									yref: 'paper',
									text: `평균 ${absenceMean.toFixed(2)}`,
									showarrow: false,
									xanchor: 'left',
									yanchor: 'bottom',
									font: { color: stylePalette.meanLine }
								}] as any
							})
						}}
						config={{ displayModeBar: false, responsive: true }}
						useResizeHandler
						style={{ width: '100%', height: getBarChartHeight(absenceByMember.names.length) }}
					/>
				) : (
					<div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--muted)' }}>
						불참 데이터가 없습니다.
					</div>
				)}

				{/* 2) 주차별 추이 + 이동평균(4주) */}
				<div className="muted" style={{ margin: '12px 0 8px' }}>
					주차별 불참자 수와 4주 이동평균: 스파이크와 완화 구간을 파악합니다.
				</div>
				{weeklyAbsence.x.length > 0 ? (
					<Plot
						data={[
							{ type: 'scatter', mode: 'lines+markers', x: weeklyAbsence.x, y: weeklyAbsence.y, name: '주간', line: { color: stylePalette.line, width: 2 }, marker: { color: stylePalette.line } },
							{ type: 'scatter', mode: 'lines', x: weeklyAbsence.x, y: weeklyAbsenceMA, name: '이동평균(4주)', line: { color: stylePalette.lineMA, width: 3 } }
						]}
						layout={{ ...baseLayout }}
						config={{ displayModeBar: false, responsive: true }}
						useResizeHandler
						style={{ width: '100%', height: chartHeight }}
					/>
				) : (
					<div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--muted)' }}>
						주차별 데이터가 없습니다.
					</div>
				)}

				{/* 3) 월별 히트맵 (연도 x 월) */}
				<div className="muted" style={{ margin: '12px 0 8px' }}>
					월별 총 불참자 수 히트맵(연도×월): 시즌성/집중 구간을 한눈에 확인합니다.
				</div>
				{monthlyHeatmap.y.length > 0 ? (
					<Plot
						data={[{
							type: 'heatmap',
							x: monthlyHeatmap.x,
							y: monthlyHeatmap.y,
							z: monthlyHeatmap.z,
							colorscale: 'Viridis',
							showscale: false
						}]}
						layout={{ ...baseLayout }}
						config={{ displayModeBar: false, responsive: true }}
						useResizeHandler
						style={{ width: '100%', height: chartHeight }}
					/>
				) : (
					<div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--muted)' }}>
						월별 데이터가 없습니다.
					</div>
				)}
			</div>
		</>
	)
}

