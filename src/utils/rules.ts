import type { AppData, PartAssignment, RoleKey, Warning, WeekData } from '../types'

function getLastWeek(currentDate: string, app: AppData): { date: string; data: WeekData } | null {
	const dates = Object.keys(app.weeks).sort()
	const idx = dates.indexOf(currentDate)
	const lastDate = idx > 0 ? dates[idx - 1] : dates.length > 0 ? dates[dates.length - 1] : null
	if (!lastDate) return null
	return { date: lastDate, data: app.weeks[lastDate]! }
}

function getLastWeeks(currentDate: string, app: AppData, count: number): Array<{ date: string; data: WeekData }> {
	const dates = Object.keys(app.weeks).sort()
	const idx = dates.indexOf(currentDate)
	const result: Array<{ date: string; data: WeekData }> = []
	
	for (let i = 1; i <= count && idx - i >= 0; i++) {
		const weekDate = dates[idx - i]
		if (weekDate && app.weeks[weekDate]) {
			result.push({ date: weekDate, data: app.weeks[weekDate]! })
		}
	}
	
	return result
}

function sameMember(a: string, b: string): boolean {
	return Boolean(a) && Boolean(b) && a === b
}

export function computeWarnings(currentDate: string, draft: { part1: PartAssignment; part2: PartAssignment }, app: AppData): Warning[] {
	const warnings: Warning[] = []
	const lastWeeks = getLastWeeks(currentDate, app, 2) // 최근 2주까지 체크

	// 1) 최근 2주 내 동일 직무 연속 배정
	if (lastWeeks.length > 0) {
		const scalarRoles = ['SW', '자막', '고정', '스케치'] as const
		type ScalarRole = typeof scalarRoles[number]
		const p1 = draft.part1 as Omit<PartAssignment, '사이드'>
		const p2 = draft.part2 as Omit<PartAssignment, '사이드'>

		// 최근 2주 내 모든 주에 대해 체크
		lastWeeks.forEach((last) => {
			const lastP1 = last.data.part1 as Omit<PartAssignment, '사이드'>
			const lastP2 = last.data.part2 as Omit<PartAssignment, '사이드'>

			(scalarRoles as readonly ScalarRole[]).forEach((role) => {
				if (sameMember(p1[role], lastP1[role])) {
					warnings.push({
						id: `cont-${role}-p1-${last.date}`,
						level: 'warn',
						message: `최근 2주 내 1부 ${role}와 동일 인원 연속 배정`,
						target: { date: currentDate, part: 'part1', role, name: p1[role] }
					})
				}
				if (sameMember(p2[role], lastP2[role])) {
					warnings.push({
						id: `cont-${role}-p2-${last.date}`,
						level: 'warn',
						message: `최근 2주 내 2부 ${role}와 동일 인원 연속 배정`,
						target: { date: currentDate, part: 'part2', role, name: p2[role] }
					})
				}
			})
			// 사이드(배열)
			const lastP1Side = last.data.part1['사이드'] ?? ['', '']
			const lastP2Side = last.data.part2['사이드'] ?? ['', '']
			draft.part1['사이드'].forEach((m, i) => {
				if (m && m === lastP1Side[i]) {
					warnings.push({
						id: `cont-side-p1-${i}-${last.date}`,
						level: 'warn',
						message: `최근 2주 내 1부 사이드 #${i + 1}와 동일 인원 연속 배정`,
						target: { date: currentDate, part: 'part1', role: '사이드', name: m }
					})
				}
			})
			draft.part2['사이드'].forEach((m, i) => {
				if (m && m === lastP2Side[i]) {
					warnings.push({
						id: `cont-side-p2-${i}-${last.date}`,
						level: 'warn',
						message: `최근 2주 내 2부 사이드 #${i + 1}와 동일 인원 연속 배정`,
						target: { date: currentDate, part: 'part2', role: '사이드', name: m }
					})
				}
			})
		})
	}

	// 2) 사이드 인원 부족(2명 미만)
	if (!draft.part1['사이드'][0] || !draft.part1['사이드'][1]) {
		warnings.push({
			id: 'p1-side-lack',
			level: 'warn',
			message: '1부 사이드 인원이 2명 미만입니다',
			target: { date: currentDate, part: 'part1', role: '사이드' }
		})
	}
	if (!draft.part2['사이드'][0] || !draft.part2['사이드'][1]) {
		warnings.push({
			id: 'p2-side-lack',
			level: 'warn',
			message: '2부 사이드 인원이 2명 미만입니다',
			target: { date: currentDate, part: 'part2', role: '사이드' }
		})
	}

	return warnings
}


