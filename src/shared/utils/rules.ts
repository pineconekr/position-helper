import type { AppData, PartAssignment, RoleKey, Warning, WeekData } from '../types'

const PART_LABEL: Record<'part1' | 'part2', string> = {
	part1: '1부',
	part2: '2부'
}

const CONTINUOUS_CHECK_WEEKS = 3

const ROTATION_ROLES: RoleKey[] = ['고정', '스케치', '사이드']

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

function getWeeksWithinDays(currentDate: string, app: AppData, days: number): Array<{ date: string; data: WeekData }> {
	const current = new Date(`${currentDate}T00:00:00`)
	if (Number.isNaN(current.getTime())) return []
	return Object.keys(app.weeks)
		.filter((date) => {
			if (!date) return false
			const target = new Date(`${date}T00:00:00`)
			if (Number.isNaN(target.getTime())) return false
			const diffDays = (current.getTime() - target.getTime()) / (1000 * 60 * 60 * 24)
			return diffDays > 0 && diffDays <= days
		})
		.sort()
		.map((date) => ({ date, data: app.weeks[date]! }))
}

const normalizeName = (value?: string) => (typeof value === 'string' ? value.trim() : '')

function sameMember(a: string, b: string): boolean {
	const na = normalizeName(a)
	const nb = normalizeName(b)
	return Boolean(na) && Boolean(nb) && na === nb
}

function wasAssignedInWeek(week: WeekData, role: RoleKey, name: string): boolean {
	const target = normalizeName(name)
	if (!target) return false
	if (role === '사이드') {
		return week.part1?.['사이드']?.some((n) => sameMember(n, target)) ||
			week.part2?.['사이드']?.some((n) => sameMember(n, target)) || false
	}
	return sameMember((week.part1 as any)?.[role], target) || sameMember((week.part2 as any)?.[role], target)
}

function isAssignedThisWeek(draft: { part1: PartAssignment; part2: PartAssignment }, role: RoleKey, name: string): boolean {
	const target = normalizeName(name)
	if (!target) return false
	if (role === '사이드') {
		return draft.part1['사이드'].some((n) => sameMember(n, target)) ||
			draft.part2['사이드'].some((n) => sameMember(n, target))
	}
	return sameMember((draft.part1 as any)[role], target) || sameMember((draft.part2 as any)[role], target)
}

export function computeWarnings(currentDate: string, draft: { part1: PartAssignment; part2: PartAssignment }, app: AppData): Warning[] {
	const warnings: Warning[] = []
	const lastWeeks = getLastWeeks(currentDate, app, CONTINUOUS_CHECK_WEEKS) // 최근 3주까지 체크

	// 1) 최근 N주 내 동일 직무 연속 배정 (경고 병합)
	if (lastWeeks.length > 0) {
		const scalarRoles = ['SW', '자막', '고정', '스케치'] as const
		type ScalarRole = typeof scalarRoles[number]
		const p1 = draft.part1 as Omit<PartAssignment, '사이드'>
		const p2 = draft.part2 as Omit<PartAssignment, '사이드'>

		type ContinuousBucket = {
			part: 'part1' | 'part2'
			role: RoleKey
			name: string
			weeks: string[]
		}

		const continuous = new Map<string, ContinuousBucket>()
		const addContinuous = (part: 'part1' | 'part2', role: RoleKey, name: string, weekLabel: string) => {
			const key = `${part}-${role}-${normalizeName(name)}`
			if (!normalizeName(name)) return
			if (!continuous.has(key)) {
				continuous.set(key, { part, role, name: normalizeName(name), weeks: [] })
			}
			continuous.get(key)!.weeks.push(weekLabel)
		}

		// 최근 N주 내 모든 주에 대해 체크
		lastWeeks.forEach((last, index) => {
			const weekOffset = index + 1 // 1 => 1주 전, 2 => 2주 전 ...
			const weekLabel = `${weekOffset}주 전`
			const lastP1 = last.data.part1 as Omit<PartAssignment, '사이드'>
			const lastP2 = last.data.part2 as Omit<PartAssignment, '사이드'>

			(scalarRoles as readonly ScalarRole[]).forEach((role) => {
				if (sameMember(p1[role], lastP1[role])) {
					addContinuous('part1', role, p1[role], weekLabel)
				}
				if (sameMember(p2[role], lastP2[role])) {
					addContinuous('part2', role, p2[role], weekLabel)
				}
			})

			// 사이드(배열) - 슬롯 구분 없이 포함 여부로 체크
			const lastP1Side = last.data.part1['사이드'] ?? ['', '']
			const lastP2Side = last.data.part2['사이드'] ?? ['', '']
			const currentP1Side = draft.part1['사이드'] ?? ['', '']
			const currentP2Side = draft.part2['사이드'] ?? ['', '']

			currentP1Side.forEach((m) => {
				if (m && lastP1Side.includes(m)) {
					addContinuous('part1', '사이드', m, weekLabel)
				}
			})
			currentP2Side.forEach((m) => {
				if (m && lastP2Side.includes(m)) {
					addContinuous('part2', '사이드', m, weekLabel)
				}
			})
		})

		// 병합된 연속 경고 생성
		continuous.forEach(({ part, role, name, weeks }) => {
			if (weeks.length === 0) return
			const uniqueWeeks = Array.from(new Set(weeks))
			const weeksText = uniqueWeeks.join(', ')
			const countText = uniqueWeeks.length > 1 ? `최근 ${uniqueWeeks.length}주 연속 ` : ''
			warnings.push({
				id: `cont-${part}-${role}-${name}`,
				level: 'warn',
				message: `${countText}${PART_LABEL[part]} ${role}에 동일 인원 배정 (${weeksText})`,
				target: { date: currentDate, part, role, name }
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

	// 3) 최근 2주간 역할 경험 없음 → 배치 유도 알림
	const rotationWindow = getWeeksWithinDays(currentDate, app, 14)
	if (rotationWindow.length > 0) {
		const activeMembers = app.members
			.filter((member) => member.active !== false)
			.map((member) => normalizeName(member.name))
			.filter((name): name is string => Boolean(name))

		const hasRecentExperience = (name: string, role: RoleKey) =>
			rotationWindow.some(({ data }) => wasAssignedInWeek(data, role, name))

		const rotationNeeds = new Map<RoleKey, string[]>()

		activeMembers.forEach((name) => {
			ROTATION_ROLES.forEach((role) => {
				if (hasRecentExperience(name, role)) return
				if (isAssignedThisWeek(draft, role, name)) return
				if (!rotationNeeds.has(role)) rotationNeeds.set(role, [])
				rotationNeeds.get(role)!.push(name)
			})
		})

		rotationNeeds.forEach((names, role) => {
			if (names.length === 0) return
			const sorted = [...names].sort((a, b) => a.localeCompare(b, 'ko'))
			const preview = sorted.slice(0, 4)
			const remainder = sorted.length - preview.length
			const listText = preview.join(', ')
			const suffix = remainder > 0 ? ` 외 ${remainder}명` : ''
			warnings.push({
				id: `rotation-${role}`,
				level: 'info',
				message: `${role} 최근 2주 미배정 대상: ${listText}${suffix}`,
				target: { role }
			})
		})
	}

	return warnings
}


