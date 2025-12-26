import { AppData, PartAssignment, RoleKey, WeekData } from '../types'
import { BLANK_ROLE_VALUE } from './assignment'

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

export type SuggestionOption = 'fillEmptyOnly' | 'overwriteAll'

export type SuggestionReason = {
	type: 'recency' | 'workload' | 'role_balance' | 'rest' | 'random'
	score: number
	message: string
}

export type SuggestedSlot = {
	part: 'part1' | 'part2'
	role: RoleKey
	member: string
	reasons: SuggestionReason[]
	score: number
}

export type SuggestionResult = {
	part1: PartAssignment
	part2: PartAssignment
	suggestions: SuggestedSlot[] // 평탄화된 제안 목록 (근거 포함)
}

// ------------------------------------------------------------------
// Constants & Weights
// ------------------------------------------------------------------

const WEIGHTS = {
	RECENCY: 10,        // 주당 가산점 (오래될수록 +)
	WORKLOAD: 5,        // 전체 배정 횟수 역비례 가산점
	ROLE_BALANCE: 8,    // 해당 역할 수행 횟수 역비례 가산점
	REST_BONUS: 20,     // 지난주 휴식자 가산점

	// Penalties (음수)
	STREAK_PENALTY: -50,       // 3주 연속 근무 시
	REPETITION_PENALTY: -100,  // 지난주 동일 역할
	SAME_WEEK_PENALTY: -200,   // 같은 주 다른 파트 이미 배정됨
	ABSENCE_PENALTY: -9999,    // 부재/비활성
}

const ROLES: RoleKey[] = ['SW', '자막', '고정', '사이드', '스케치']

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

const normalizeName = (name?: string) => name?.trim() || ''

// 지난 N주간의 데이터를 가져옵니다.
function getRecentWeeks(app: AppData, currentWeekDate: string, weeksCount: number) {
	if (!app?.weeks) return []
	const dates = Object.keys(app.weeks).sort()
	const currentIndex = dates.indexOf(currentWeekDate)
	if (currentIndex === -1) return []

	// 현재 주차 이전의 N개 주차
	const start = Math.max(0, currentIndex - weeksCount)
	return dates.slice(start, currentIndex).map(date => ({ date, data: app.weeks[date]! })).reverse()
}

// 특정 멤버의 전체 배정 횟수 조회
function getMemberStats(app: AppData, memberName: string) {
	let total = 0
	const roleCounts: Record<RoleKey, number> = { SW: 0, 자막: 0, 고정: 0, 사이드: 0, 스케치: 0 }

	if (app?.weeks) {
		Object.values(app.weeks).forEach(week => {
			const countRole = (p: PartAssignment | undefined) => {
				if (!p) return
				ROLES.forEach(role => {
					const val = p[role]
					if (Array.isArray(val)) {
						val.forEach(v => {
							if (normalizeName(v) === memberName) {
								total++
								roleCounts[role]++
							}
						})
					} else {
						if (normalizeName(val as string) === memberName) {
							total++
							roleCounts[role]++
						}
					}
				})
			}
			countRole(week.part1)
			countRole(week.part2)
		})
	}

	return { total, roleCounts }
}

// ------------------------------------------------------------------
// Core Logic
// ------------------------------------------------------------------

/**
 * 특정 슬롯에 대한 멤버의 적합도 점수를 계산합니다.
 */
function calculateScore(
	member: { name: string; active: boolean },
	slot: { part: 'part1' | 'part2'; role: RoleKey },
	context: {
		app: AppData
		currentDate: string
		currentAbsences: string[] // 이번 주 부재자 명단
		assignedInCurrentDraft: Set<string> // 이번 제안 생성 중 이미 배정된 사람 (동일 주차 내 중복 방지용)
		recentWeeks: { date: string; data: WeekData }[]
		stats: { total: number; roleCounts: Record<RoleKey, number> }
		maxTotalLoad: number // 전체 멤버 중 최대 배정 횟수 (상대평가용)
		avgRoleLoad: number // 해당 역할 평균 배정 횟수
	}
): { score: number; reasons: SuggestionReason[] } {
	const name = normalizeName(member.name)
	const reasons: SuggestionReason[] = []
	let score = 0

	// 1. Availability Check
	if (!member.active) return { score: WEIGHTS.ABSENCE_PENALTY, reasons: [] }
	if (context.currentAbsences.includes(name)) return { score: WEIGHTS.ABSENCE_PENALTY, reasons: [{ type: 'random', score: WEIGHTS.ABSENCE_PENALTY, message: '부재' }] }

	// 2. Same Week Conflict (이번 주에 이미 다른 역할을 배정받았는지)
	// Side 역할은 2명이므로, 같은 파트 같은 역할 내에서는 체크하지 않음 (상위 레벨에서 처리)
	// 하지만 '1부'에 배정된 사람이 '2부'에 배정되는 것은 페널티
	if (context.assignedInCurrentDraft.has(name)) {
		score += WEIGHTS.SAME_WEEK_PENALTY
		// reasons.push({ type: 'workload', score: WEIGHTS.SAME_WEEK_PENALTY, message: '이미 배정됨' })
	}

	// 3. Recency (해당 역할을 언제 마지막으로 했나)
	let weeksSinceLast = 99 // 없으면 아주 오래된 것으로 간주
	let lastRoleWeekIndex = -1

	context.recentWeeks.some((week, idx) => {
		const p1 = week.data.part1
		const p2 = week.data.part2
		const inP1 = p1 && (slot.role === '사이드' ? p1.사이드.includes(name) : p1[slot.role] === name)
		const inP2 = p2 && (slot.role === '사이드' ? p2.사이드.includes(name) : p2[slot.role] === name)

		if (inP1 || inP2) {
			weeksSinceLast = idx + 1 // 1주 전 = 1
			lastRoleWeekIndex = idx
			return true
		}
		return false
	})

	// 직전 주(1주 전)에 같은 역할을 했다면 페널티
	if (weeksSinceLast === 1) {
		score += WEIGHTS.REPETITION_PENALTY
		reasons.push({ type: 'recency', score: WEIGHTS.REPETITION_PENALTY, message: '지난주 동일 역할' })
	} else {
		// 오래되었을수록 점수 (최대 10주까지 반영)
		const recencyScore = Math.min(weeksSinceLast, 10) * WEIGHTS.RECENCY
		score += recencyScore
		if (weeksSinceLast >= 4) {
			reasons.push({ type: 'recency', score: recencyScore, message: `${weeksSinceLast}주 만의 역할` })
		}
	}

	// 4. Workload (전체 배정 횟수 밸런싱)
	// 내가 남들보다 덜 했으면 가산점
	const loadDiff = context.maxTotalLoad - context.stats.total
	if (loadDiff > 0) {
		const loadScore = loadDiff * WEIGHTS.WORKLOAD
		score += loadScore
		reasons.push({ type: 'workload', score: loadScore, message: '전체 배정 부족' })
	}

	// 5. Role Balance (해당 역할 경험 밸런싱)
	// 남들보다 이 역할을 덜 했으면 가산점
	const roleDiff = context.avgRoleLoad - context.stats.roleCounts[slot.role]
	if (roleDiff > 0) {
		const roleScore = roleDiff * WEIGHTS.ROLE_BALANCE
		score += roleScore
		// reasons.push({ type: 'role_balance', score: roleScore, message: '역할 경험 부족' })
	}

	// 6. Streak (연속 근무 피로도)
	// 최근 3주 내내 근무했는지 확인
	let consecutiveWeeks = 0
	for (const week of context.recentWeeks.slice(0, 3)) {
		let worked = false
		const checkPart = (p?: PartAssignment) => {
			if (!p) return
			ROLES.forEach(r => {
				const val = p[r]
				if (Array.isArray(val)) {
					if (val.includes(name)) worked = true
				} else {
					if (val === name) worked = true
				}
			})
		}
		checkPart(week.data.part1)
		checkPart(week.data.part2)

		if (worked) consecutiveWeeks++
		else break
	}

	if (consecutiveWeeks >= 3) {
		score += WEIGHTS.STREAK_PENALTY
		reasons.push({ type: 'rest', score: WEIGHTS.STREAK_PENALTY, message: '3주 연속 근무' })
	} else if (consecutiveWeeks === 0 && weeksSinceLast > 1) {
		// 지난주 쉬었으면 보너스 (단, 이번주 부재가 아니어야 함 - 위에서 체크됨)
		score += WEIGHTS.REST_BONUS
		// reasons.push({ type: 'rest', score: WEIGHTS.REST_BONUS, message: '휴식 후 복귀' })
	}

	return { score, reasons }
}


export function suggestAssignments(
	app: AppData,
	currentDate: string,
	currentDraft: { part1: PartAssignment; part2: PartAssignment },
	option: SuggestionOption
): SuggestionResult {
	// 0. 준비
	const members = (app?.members || []).filter(m => m.active)
	const recentWeeks = getRecentWeeks(app, currentDate, 10)
	const memberStats = new Map<string, { total: number; roleCounts: Record<RoleKey, number> }>()

	let maxTotalLoad = 0
	const roleTotalLoads: Record<RoleKey, number> = { SW: 0, 자막: 0, 고정: 0, 사이드: 0, 스케치: 0 }

	members.forEach(m => {
		const stats = getMemberStats(app, normalizeName(m.name))
		memberStats.set(normalizeName(m.name), stats)
		maxTotalLoad = Math.max(maxTotalLoad, stats.total)
		ROLES.forEach(r => roleTotalLoads[r] += stats.roleCounts[r])
	})

	const avgRoleLoads: Record<RoleKey, number> = { SW: 0, 자막: 0, 고정: 0, 사이드: 0, 스케치: 0 }
	ROLES.forEach(r => {
		avgRoleLoads[r] = roleTotalLoads[r] / (members.length || 1)
	})

	const currentAbsences = (app?.weeks?.[currentDate]?.absences || []).map(a => normalizeName(a.name))

	// 배정 상태 추적
	// 1부, 2부 각각 누가 배정되었는지 + 전체 주차에 누가 배정되었는지
	const assignedSet = new Set<string>()

	// 결과 객체 복사
	const resultPart1 = JSON.parse(JSON.stringify(currentDraft.part1)) as PartAssignment
	const resultPart2 = JSON.parse(JSON.stringify(currentDraft.part2)) as PartAssignment
	const suggestions: SuggestedSlot[] = []

	// 이미 배정된 인원(수동 배정 유지 시)을 assignedSet에 등록
	if (option === 'fillEmptyOnly') {
		const register = (p: PartAssignment) => {
			ROLES.forEach(r => {
				const val = p[r]
				if (Array.isArray(val)) {
					val.forEach(v => {
						if (v && v !== BLANK_ROLE_VALUE) assignedSet.add(normalizeName(v))
					})
				} else {
					if (val && val !== BLANK_ROLE_VALUE) assignedSet.add(normalizeName(val as string))
				}
			})
		}
		register(resultPart1)
		register(resultPart2)
	} else {
		// overwriteAll이면 기존 draft 무시 (빈칸으로 시작)
		const emptyPart = { SW: '', 자막: '', 고정: '', 사이드: ['', ''] as [string, string], 스케치: '' }
		Object.assign(resultPart1, JSON.parse(JSON.stringify(emptyPart)))
		Object.assign(resultPart2, JSON.parse(JSON.stringify(emptyPart)))
	}

	// 1. 배정 순서 정의 (중요도 순: SW/자막 -> 고정/스케치 -> 사이드)
	// 사이드는 인원이 많으므로 마지막에 채우는 것이 충돌 방지에 유리할 수 있음
	const slotsToAssign: { part: 'part1' | 'part2'; role: RoleKey; index?: number }[] = []

	const rolePriority: RoleKey[] = ['SW', '자막', '고정', '스케치', '사이드']

	rolePriority.forEach(role => {
		['part1', 'part2'].forEach(partName => {
			const part = partName === 'part1' ? resultPart1 : resultPart2
			const p = partName as 'part1' | 'part2'

			if (role === '사이드') {
				// 사이드는 2명
				if (option === 'overwriteAll' || !part[role][0]) slotsToAssign.push({ part: p, role, index: 0 })
				if (option === 'overwriteAll' || !part[role][1]) slotsToAssign.push({ part: p, role, index: 1 })
			} else {
				if (option === 'overwriteAll' || !part[role]) slotsToAssign.push({ part: p, role })
			}
		})
	})

	// 2. 각 슬롯별 최적 멤버 찾기 (Greedy)
	slotsToAssign.forEach(slot => {
		let bestScore = -Infinity
		let bestMember = null
		let bestReasons: SuggestionReason[] = []

		// 후보군: 활성 멤버 중 이번 주 부재가 아니고, 이미 배정되지 않은 사람 (중복 배정 방지)
		// 단, 점수 계산 시 assignedInCurrentDraft를 넘기므로, 여기서는 필터링을 약하게 하고 점수에서 페널티를 줄 수도 있음.
		// 하지만 강력한 룰을 위해 여기서 아예 제외하는 것이 깔끔함.
		const candidates = members.filter(m => {
			const name = normalizeName(m.name)
			return !currentAbsences.includes(name) && !assignedSet.has(name)
		})

		candidates.forEach(member => {
			const { score, reasons } = calculateScore(member, slot, {
				app,
				currentDate,
				currentAbsences,
				assignedInCurrentDraft: assignedSet,
				recentWeeks,
				stats: memberStats.get(normalizeName(member.name))!,
				maxTotalLoad,
				avgRoleLoad: avgRoleLoads[slot.role]
			})

			if (score > bestScore) {
				bestScore = score
				bestMember = member
				bestReasons = reasons
			}
		})

		// 배정 확정
		if (bestMember) {
			const name = normalizeName((bestMember as any).name)
			assignedSet.add(name)

			// 결과 반영
			const targetPart = slot.part === 'part1' ? resultPart1 : resultPart2
			if (slot.role === '사이드' && typeof slot.index === 'number') {
				targetPart.사이드[slot.index] = name
			} else {
				(targetPart as any)[slot.role] = name
			}

			// 제안 목록에 추가
			suggestions.push({
				part: slot.part,
				role: slot.role,
				member: name,
				reasons: bestReasons,
				score: bestScore
			})
		}
	})

	return {
		part1: resultPart1,
		part2: resultPart2,
		suggestions
	}
}
