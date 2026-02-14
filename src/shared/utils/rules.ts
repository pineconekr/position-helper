import type { AppData, PartAssignment, RoleKey, Warning, WeekData } from '../types'
import { RULES_CONFIG, ROLE_CONFIG } from '@/shared/constants/config'

const PART_LABEL: Record<'part1' | 'part2', string> = {
	part1: '1부',
	part2: '2부'
}

function getLastWeeks(currentDate: string, app: AppData, count: number): Array<{ date: string; data: WeekData }> {
	const dates = Object.keys(app.weeks).sort()
	const previousWeeks = dates
		.filter((date) => date < currentDate)
		.sort((a, b) => b.localeCompare(a))
		.slice(0, count)

	return previousWeeks.map((date) => ({ date, data: app.weeks[date]! }))
}



const normalizeName = (value?: string) => (typeof value === 'string' ? value.trim() : '')
type ScalarRole = Exclude<RoleKey, '사이드'>

function getScalarRoleValue(part: PartAssignment, role: ScalarRole): string {
	switch (role) {
		case 'SW':
			return part.SW
		case '자막':
			return part['자막']
		case '고정':
			return part['고정']
		case '스케치':
			return part['스케치']
	}
}

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
	return sameMember(getScalarRoleValue(week.part1, role), target) || sameMember(getScalarRoleValue(week.part2, role), target)
}

function isAssignedThisWeek(draft: { part1: PartAssignment; part2: PartAssignment }, role: RoleKey, name: string): boolean {
	const target = normalizeName(name)
	if (!target) return false
	if (role === '사이드') {
		return draft.part1['사이드'].some((n) => sameMember(n, target)) ||
			draft.part2['사이드'].some((n) => sameMember(n, target))
	}
	return sameMember(getScalarRoleValue(draft.part1, role), target) || sameMember(getScalarRoleValue(draft.part2, role), target)
}

export function computeWarnings(currentDate: string, draft: { part1: PartAssignment; part2: PartAssignment }, app: AppData): Warning[] {
	const warnings: Warning[] = []
	const lastWeeks = getLastWeeks(currentDate, app, RULES_CONFIG.CONTINUOUS_CHECK_WEEKS)

	// 1) 최근 N주 내 동일 직무 연속 배정 (경고 병합)
	if (lastWeeks.length > 0) {
		const scalarRoles = ['SW', '자막', '고정', '스케치'] as const
		type ContinuousScalarRole = typeof scalarRoles[number]

		type ContinuousBucket = {
			part: 'part1' | 'part2'
			role: RoleKey
			name: string
			offsets: number[]
		}

		const continuous = new Map<string, ContinuousBucket>()
		const addContinuous = (part: 'part1' | 'part2', role: RoleKey, name: string, offset: number) => {
			const key = `${part}-${role}-${normalizeName(name)}`
			if (!normalizeName(name)) return
			if (!continuous.has(key)) {
				continuous.set(key, { part, role, name: normalizeName(name), offsets: [] })
			}
			continuous.get(key)!.offsets.push(offset)
		}

		// 최근 N주 내 모든 주에 대해 체크
		lastWeeks.forEach((last, index) => {
			const weekOffset = index + 1 // 1 => 1주 전, 2 => 2주 전 ...
			const lastP1 = last.data.part1
			const lastP2 = last.data.part2

				; (scalarRoles as readonly ContinuousScalarRole[]).forEach((role) => {
					const currentP1Value = getScalarRoleValue(draft.part1, role)
					const currentP2Value = getScalarRoleValue(draft.part2, role)
					if (sameMember(currentP1Value, getScalarRoleValue(lastP1, role))) {
						addContinuous('part1', role, currentP1Value, weekOffset)
					}
					if (sameMember(currentP2Value, getScalarRoleValue(lastP2, role))) {
						addContinuous('part2', role, currentP2Value, weekOffset)
					}
				})

			// 사이드(배열)
			const lastP1Side = last.data.part1['사이드'] ?? ['', '']
			const lastP2Side = last.data.part2['사이드'] ?? ['', '']
			const currentP1Side = draft.part1['사이드'] ?? ['', '']
			const currentP2Side = draft.part2['사이드'] ?? ['', '']

			currentP1Side.forEach((m) => {
				if (m && lastP1Side.some((prev) => sameMember(prev, m))) {
					addContinuous('part1', '사이드', m, weekOffset)
				}
			})
			currentP2Side.forEach((m) => {
				if (m && lastP2Side.some((prev) => sameMember(prev, m))) {
					addContinuous('part2', '사이드', m, weekOffset)
				}
			})
		})

		// 계층화된 경고 생성
		continuous.forEach(({ part, role, name, offsets }) => {
			if (offsets.length === 0) return
			const uniqueOffsets = Array.from(new Set(offsets)).sort((a, b) => a - b)
			const minOffset = uniqueOffsets[0]

			// 경고 레벨 결정 (1주 전: error, 2주 전: warn, 3주 전: info)
			let level: Warning['level'] = 'info'
			if (minOffset === 1) level = 'error'
			else if (minOffset === 2) level = 'warn'

			const weeksText = uniqueOffsets.map(o => `${o}주 전`).join(', ')
			const countText = uniqueOffsets.length > 1 ? `최근 ${uniqueOffsets.length}주 연속 ` : ''

			warnings.push({
				id: `cont-${part}-${role}-${name}`,
				level,
				message: `${countText}${PART_LABEL[part]} ${role}에 동일 인원 배정 (${weeksText})`,
				target: { date: currentDate, part, role, name }
			})
		})
	}

	// 2) 최근 역할 경험 없음 → 배치 유도 알림 (기간별 그룹화)
	const rotationHistory = getLastWeeks(currentDate, app, 12) // 최근 12주 체크

	if (rotationHistory.length > 0) {
		const activeMembers = app.members
			.filter((member) => member.active !== false)
			.map((member) => normalizeName(member.name))
			.filter((name): name is string => Boolean(name))

		// SW 수행 가능한 멤버 식별 (전체 이력 기준)
		const swQualifiedMembers = new Set<string>()
		Object.values(app.weeks).forEach(weekData => {
			const p1sw = normalizeName(weekData.part1.SW)
			if (p1sw) swQualifiedMembers.add(p1sw)
			const p2sw = normalizeName(weekData.part2.SW)
			if (p2sw) swQualifiedMembers.add(p2sw)
		})

		const getWeeksSinceLastAssignment = (name: string, role: RoleKey): number => {
			const index = rotationHistory.findIndex(({ data }) => wasAssignedInWeek(data, role, name))
			if (index === -1) return Infinity
			return index + 1 // 1 = 1주 전, 2 = 2주 전...
		}

		const rotationNeeds = new Map<RoleKey, { name: string; weeksSince: number }[]>()

		activeMembers.forEach((name) => {
			ROLE_CONFIG.ROTATION_ROLES.forEach((role) => {
				// [규칙 1] SW 역할은 SW 수행 이력이 있는 멤버만 추천
				if (role === 'SW' && !swQualifiedMembers.has(name)) {
					return
				}

				// [규칙 2] 자막 역할은 SW 수행 가능한 고기수 인원은 제외
				if (role === '자막' && swQualifiedMembers.has(name)) {
					return
				}

				if (isAssignedThisWeek(draft, role, name)) return

				const weeksSince = getWeeksSinceLastAssignment(name, role)

				// 1주 전(weeksSince === 1) 배정자는 제외 (휴식 0주)
				if (weeksSince <= 1) return

				if (!rotationNeeds.has(role)) rotationNeeds.set(role, [])
				rotationNeeds.get(role)!.push({ name, weeksSince })
			})
		})

		rotationNeeds.forEach((candidates, role) => {
			if (candidates.length === 0) return

			// 오랫동안 안한 순으로 정렬 (Infinity가 가장 먼저)
			candidates.sort((a, b) => b.weeksSince - a.weeksSince)

			// Clean header message, structured data for visual rendering
			warnings.push({
				id: `rotation-${role}`,
				level: 'info',
				message: `${role} 배정 추천`,
				target: { role },
				rotationCandidates: candidates.slice(0, 8) // Limit to 8 for UI
			})
		})
	}

	return warnings
}


