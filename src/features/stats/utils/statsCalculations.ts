import type { AppData, RoleKey, PartAssignment, WeekData, MembersEntry } from '@/shared/types'
import { RoleKeys } from '@/shared/types'
import { stripCohort, extractCohort } from '@/shared/utils/assignment'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type MemberWeekStatus = {
	memberName: string
	weekDate: string
	status: 'assigned' | 'absent' | 'available' // assigned: 배정됨, absent: 불참, available: 출석했지만 미배정
	roles: RoleKey[] // 해당 주에 배정된 역할들 (1부+2부)
	absenceReason?: string
	isConsecutive?: boolean // 이전 주와 동일 역할 연속 배정 여부
}

export type MemberRoleCount = {
	memberName: string
	role: RoleKey
	count: number
	attendedWeeks: number // 출석한 주차 수
	ratio: number // count / attendedWeeks (출석 대비 배정 비율)
}

export type RoleContribution = {
	role: RoleKey
	totalCount: number
	members: { name: string; count: number; percentage: number }[]
}

export type WeekSummary = {
	weekDate: string
	formattedDate: string
	memberStatuses: Map<string, MemberWeekStatus>
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** 기수 순으로 정렬 */
export function sortByGeneration<T extends { name: string }>(members: T[]): T[] {
	return [...members].sort((a, b) => {
		const genA = extractCohort(a.name) ?? 999
		const genB = extractCohort(b.name) ?? 999
		return genA - genB
	})
}

/** 주차 날짜 정렬 (오름차순) */
export function sortWeekDates(dates: string[]): string[] {
	return [...dates].sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
}

/** 날짜 포맷 (MM/DD) */
export function formatWeekDate(dateStr: string): string {
	const date = new Date(dateStr)
	const month = date.getMonth() + 1
	const day = date.getDate()
	return `${month}/${day}`
}

/** PartAssignment에서 모든 배정된 멤버와 역할 추출 */
function extractAssignments(part: PartAssignment): { name: string; role: RoleKey }[] {
	const result: { name: string; role: RoleKey }[] = []

	if (part.SW) result.push({ name: part.SW, role: 'SW' })
	if (part['자막']) result.push({ name: part['자막'], role: '자막' })
	if (part['고정']) result.push({ name: part['고정'], role: '고정' })
	if (part['스케치']) result.push({ name: part['스케치'], role: '스케치' })

	part['사이드'].forEach(name => {
		if (name) result.push({ name, role: '사이드' })
	})

	return result
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Calculation Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 주차별 팀원 활동 매트릭스 데이터 계산
 * 차트 1: Activity Timeline
 */
export function calculateActivityTimeline(app: AppData, includeInactive = false): {
	weekDates: string[]
	formattedDates: string[]
	members: string[]
	matrix: MemberWeekStatus[][]
} {
	if (!app || !app.weeks || !app.members) {
		return { weekDates: [], formattedDates: [], members: [], matrix: [] }
	}
	const weekDates = sortWeekDates(Object.keys(app.weeks))
	const formattedDates = weekDates.map(formatWeekDate)

	// 멤버 필터링 및 정렬
	const filteredMembers = includeInactive
		? app.members
		: app.members.filter(m => m.active)
	const sortedMembers = sortByGeneration(filteredMembers)
	const memberNames = sortedMembers.map(m => m.name)

	// 이전 주차 역할 추적 (연속 배정 감지용)
	const previousRoles = new Map<string, RoleKey[]>()

	// 매트릭스 생성: [memberIndex][weekIndex]
	const matrix: MemberWeekStatus[][] = memberNames.map(() => [])

	weekDates.forEach((weekDate, weekIdx) => {
		const weekData = app.weeks[weekDate]
		if (!weekData) return

		// 해당 주 불참자 이름 Set
		const absentNames = new Set(weekData.absences.map(a => a.name))
		const absenceReasons = new Map(weekData.absences.map(a => [a.name, a.reason]))

		// 해당 주 배정 정보 수집
		const weekAssignments = new Map<string, RoleKey[]>()
		const allAssignments = [
			...extractAssignments(weekData.part1),
			...extractAssignments(weekData.part2)
		]

		allAssignments.forEach(({ name, role }) => {
			if (!weekAssignments.has(name)) {
				weekAssignments.set(name, [])
			}
			weekAssignments.get(name)!.push(role)
		})

		// 각 멤버별 상태 계산
		memberNames.forEach((memberName, memberIdx) => {
			const isAbsent = absentNames.has(memberName)
			const assignedRoles = weekAssignments.get(memberName) || []
			const prevRoles = previousRoles.get(memberName) || []

			// 연속 배정 체크: 이전 주와 동일한 역할이 있는지
			const isConsecutive = assignedRoles.length > 0 &&
				assignedRoles.some(role => prevRoles.includes(role))

			let status: MemberWeekStatus['status']
			if (isAbsent) {
				status = 'absent'
			} else if (assignedRoles.length > 0) {
				status = 'assigned'
			} else {
				status = 'available'
			}

			const memberStatus: MemberWeekStatus = {
				memberName,
				weekDate,
				status,
				roles: assignedRoles,
				absenceReason: isAbsent ? absenceReasons.get(memberName) : undefined,
				isConsecutive: status === 'assigned' ? isConsecutive : undefined
			}

			matrix[memberIdx][weekIdx] = memberStatus

			// 다음 주 비교를 위해 현재 역할 저장
			previousRoles.set(memberName, assignedRoles)
		})
	})

	return {
		weekDates,
		formattedDates,
		members: memberNames,
		matrix
	}
}

/**
 * 통합된 멤버별 통계 및 배정 횟수 계산
 * 모든 차트와 랭킹에서 동일한 로직을 사용하기 위함
 */
export function calculateMemberStatistics(app: AppData, includeInactive = false) {
	if (!app || !app.weeks || !app.members) return []

	const targetMembers = includeInactive ? app.members : app.members.filter(m => m.active)
	const sortedMembers = sortByGeneration(targetMembers)

	// Map 초기화
	const statsMap = new Map<string, {
		name: string
		attendedWeeks: number
		roleCounts: Record<RoleKey, number> // 역할별 배정 횟수
		totalAssignments: number // 총 배정 횟수
	}>()

	sortedMembers.forEach(m => {
		statsMap.set(m.name, {
			name: m.name,
			attendedWeeks: 0,
			roleCounts: { SW: 0, 자막: 0, 고정: 0, 사이드: 0, 스케치: 0 },
			totalAssignments: 0
		})
	})

	// 주차별 순회
	Object.values(app.weeks).forEach(weekData => {
		const absentNames = new Set(weekData.absences.map(a => a.name))

		// 출석 체크
		sortedMembers.forEach(m => {
			if (!absentNames.has(m.name)) {
				statsMap.get(m.name)!.attendedWeeks++
			}
		})

		// 배정 체크
		const allAssignments = [
			...extractAssignments(weekData.part1),
			...extractAssignments(weekData.part2)
		]

		allAssignments.forEach(({ name, role }) => {
			const stats = statsMap.get(name)
			if (stats) {
				stats.roleCounts[role]++
				stats.totalAssignments++
			}
		})
	})

	return Array.from(statsMap.values())
}

/**
 * 역할별 기여도 트리맵 데이터 계산
 * 차트 2: Role Contribution Treemap
 */
export function calculateRoleContributions(app: AppData, includeInactive = false): RoleContribution[] {
	const stats = calculateMemberStatistics(app, includeInactive)
	const contributions: RoleContribution[] = []

	RoleKeys.forEach(role => {
		let totalCount = 0
		const members: { name: string; count: number; percentage: number }[] = []

		stats.forEach(memberStat => {
			const count = memberStat.roleCounts[role]
			if (count > 0) {
				totalCount += count
				members.push({ name: memberStat.name, count, percentage: 0 })
			}
		})

		// 백분율 계산
		members.forEach(m => {
			m.percentage = totalCount > 0 ? (m.count / totalCount) * 100 : 0
		})

		// 카운트 내림차순 정렬
		members.sort((a, b) => b.count - a.count)

		contributions.push({
			role,
			totalCount,
			members
		})
	})

	// 총 배정 수 기준 내림차순 정렬
	contributions.sort((a, b) => b.totalCount - a.totalCount)

	return contributions
}

/**
 * 팀원-역할 히트맵 데이터 계산
 * 차트 3: Member-Role Heatmap
 */
export function calculateMemberRoleHeatmap(app: AppData, includeInactive = false): {
	members: string[]
	roles: RoleKey[]
	data: MemberRoleCount[]
	maxRatio: number
} {
	const stats = calculateMemberStatistics(app, includeInactive)
	const data: MemberRoleCount[] = []
	let maxRatio = 0

	stats.forEach(stat => {
		RoleKeys.forEach(role => {
			const count = stat.roleCounts[role]
			const ratio = stat.attendedWeeks > 0 ? (count / stat.attendedWeeks) * 100 : 0

			if (ratio > maxRatio) maxRatio = ratio

			data.push({
				memberName: stat.name,
				role,
				count,
				attendedWeeks: stat.attendedWeeks,
				ratio
			})
		})
	})

	return {
		members: stats.map(s => s.name),
		roles: [...RoleKeys],
		data,
		maxRatio
	}
}




/**
 * 역할 약어 반환
 */
export function getRoleAbbr(role: RoleKey): string {
	const abbrMap: Record<RoleKey, string> = {
		'SW': 'SW',
		'자막': '자',
		'고정': '고',
		'사이드': '사',
		'스케치': '스'
	}
	return abbrMap[role]
}

/**
 * 전체 통계 요약 정보
 */
export function calculateStatsSummary(app: AppData): {
	totalWeeks: number
	totalMembers: number
	activeMembers: number
	totalAssignments: number
	averageAssignmentsPerWeek: number
} {
	if (!app || !app.weeks || !app.members) {
		return { totalWeeks: 0, totalMembers: 0, activeMembers: 0, totalAssignments: 0, averageAssignmentsPerWeek: 0 }
	}
	const totalWeeks = Object.keys(app.weeks).length
	const totalMembers = app.members.length
	const activeMembers = app.members.filter(m => m.active).length

	let totalAssignments = 0
	Object.values(app.weeks).forEach((weekData: WeekData) => {
		const assignments = [
			...extractAssignments(weekData.part1),
			...extractAssignments(weekData.part2)
		]
		totalAssignments += assignments.length
	})

	const averageAssignmentsPerWeek = totalWeeks > 0 ? totalAssignments / totalWeeks : 0

	return {
		totalWeeks,
		totalMembers,
		activeMembers,
		totalAssignments,
		averageAssignmentsPerWeek
	}
}

/**
 * 팀원별 불참률 계산 (TOP N)
 */
export function calculateAbsenceRanking(app: AppData, topN = 3): {
	name: string
	displayName: string
	absenceCount: number
	absenceRate: number // 백분율
}[] {
	if (!app || !app.weeks || !app.members) return []
	const totalWeeks = Object.keys(app.weeks).length
	if (totalWeeks === 0) return []

	const activeMembers = app.members.filter(m => m.active)

	// 멤버별 불참 횟수 집계
	const absenceCounts = new Map<string, number>()
	activeMembers.forEach(m => absenceCounts.set(m.name, 0))

	Object.values(app.weeks).forEach((weekData: WeekData) => {
		weekData.absences.forEach(absence => {
			if (absenceCounts.has(absence.name)) {
				absenceCounts.set(absence.name, (absenceCounts.get(absence.name) || 0) + 1)
			}
		})
	})

	// 불참률 계산 및 정렬
	const ranking = activeMembers
		.map(m => ({
			name: m.name,
			displayName: stripCohort(m.name),
			absenceCount: absenceCounts.get(m.name) || 0,
			absenceRate: ((absenceCounts.get(m.name) || 0) / totalWeeks) * 100
		}))
		.sort((a, b) => b.absenceRate - a.absenceRate)
		.slice(0, topN)

	return ranking
}

/**
 * 팀원별 총 배정 횟수 계산 (TOP N)
 */
export function calculateAssignmentRanking(app: AppData, topN = 3): {
	name: string
	displayName: string
	assignmentCount: number
	attendedWeeks: number
	assignmentRate: number // 출석당 평균 배정 (주당 2파트이므로 최대 2)
}[] {
	const stats = calculateMemberStatistics(app, false) // Active only

	return stats
		.map(s => ({
			name: s.name,
			displayName: stripCohort(s.name),
			assignmentCount: s.totalAssignments,
			attendedWeeks: s.attendedWeeks,
			assignmentRate: s.attendedWeeks > 0 ? s.totalAssignments / s.attendedWeeks : 0
		}))
		.sort((a, b) => b.assignmentCount - a.assignmentCount)
		.slice(0, topN)
}

/**
 * 배정 부족 팀원 (출석 대비 배정률이 낮은 TOP N)
 */
export function calculateUnderassignedMembers(app: AppData, topN = 3): {
	name: string
	displayName: string
	assignmentCount: number
	attendedWeeks: number
	assignmentRate: number
}[] {
	const stats = calculateMemberStatistics(app, false) // Active only

	return stats
		.filter(s => s.attendedWeeks > 0) // 출석 기록이 있는 팀원만
		.map(s => ({
			name: s.name,
			displayName: stripCohort(s.name),
			assignmentCount: s.totalAssignments,
			attendedWeeks: s.attendedWeeks,
			assignmentRate: s.attendedWeeks > 0 ? s.totalAssignments / s.attendedWeeks : 0
		}))
		.sort((a, b) => a.assignmentRate - b.assignmentRate)
		.slice(0, topN)
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI Dashboard Calculations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 배정 공정성 점수 계산 (개선된 다중 요소 평가)
 * 
 * 평가 요소:
 * 1. 배정 기회 균등성 (40%) - 출석 대비 배정 횟수의 균등성
 * 2. 역할 다양성 (30%) - 다양한 역할을 경험하는지 (SW 제외)
 * 3. 부담도 균형 (20%) - 역할별 난이도를 고려한 부담의 균등성
 * 4. 연속 배정 회피 (10%) - 같은 역할 연속 배정 최소화
 * 
 * SW 역할 특수 처리:
 * - SW는 특별 교육을 받은 고령자만 가능한 전문 역할
 * - 공정성 평가 시 SW 배정자는 별도 그룹으로 분리
 * - SW 배정자끼리만 비교하여 공정성 평가
 */
export function calculateFairnessScore(app: AppData): {
	score: number
	level: 'excellent' | 'good' | 'fair' | 'poor'
	description: string
	breakdown: {
		opportunityEquality: { score: number; weight: number; description: string }
		roleDiversity: { score: number; weight: number; description: string }
		workloadBalance: { score: number; weight: number; description: string }
		consecutiveAvoidance: { score: number; weight: number; description: string }
	}
	details: {
		totalMembers: number
		swCertifiedMembers: number
		regularMembers: number
		avgAssignmentRate: number
		avgRoleDiversity: number
		consecutiveRate: number
	}
	insights: {
		type: 'issue' | 'positive' | 'suggestion'
		category: 'opportunity' | 'diversity' | 'workload' | 'consecutive' | 'general'
		title: string
		description: string
		affectedMembers?: string[]
	}[]
} {
	if (!app || !app.members || !app.weeks) {
		return {
			score: 0,
			level: 'poor',
			description: '데이터가 없습니다',
			breakdown: {
				opportunityEquality: { score: 0, weight: 40, description: '데이터 없음' },
				roleDiversity: { score: 0, weight: 30, description: '데이터 없음' },
				workloadBalance: { score: 0, weight: 20, description: '데이터 없음' },
				consecutiveAvoidance: { score: 0, weight: 10, description: '데이터 없음' }
			},
			details: {
				totalMembers: 0,
				swCertifiedMembers: 0,
				regularMembers: 0,
				avgAssignmentRate: 0,
				avgRoleDiversity: 0,
				consecutiveRate: 0
			},
			insights: []
		}
	}

	const activeMembers = app.members.filter(m => m.active)
	const weekDates = Object.keys(app.weeks)

	if (activeMembers.length === 0 || weekDates.length === 0) {
		return {
			score: 100,
			level: 'excellent',
			description: '아직 배정 기록이 없습니다',
			breakdown: {
				opportunityEquality: { score: 100, weight: 40, description: '배정 없음' },
				roleDiversity: { score: 100, weight: 30, description: '배정 없음' },
				workloadBalance: { score: 100, weight: 20, description: '배정 없음' },
				consecutiveAvoidance: { score: 100, weight: 10, description: '배정 없음' }
			},
			details: {
				totalMembers: activeMembers.length,
				swCertifiedMembers: 0,
				regularMembers: activeMembers.length,
				avgAssignmentRate: 0,
				avgRoleDiversity: 0,
				consecutiveRate: 0
			},
			insights: []
		}
	}

	// 역할별 난이도/부담도 가중치
	const roleWeights: Record<RoleKey, number> = {
		'SW': 1.5,      // 최고 난이도 (전문 교육 필요)
		'사이드': 1.3,   // 라이브 중계 핸디캠 (체력 및 실시간 방송 부담 반영)
		'자막': 1.2,    // 타이밍 중요
		'고정': 1.0,    // 기본
		'스케치': 0.8   // 기본 구도 숙지 및 촬영 위주
	}

	// SW 배정 이력이 있는 멤버 식별 (SW 자격증 소지자)
	const swCertifiedMembers = new Set<string>()
	weekDates.forEach(date => {
		const weekData = app.weeks[date]
		if (weekData.part1.SW) swCertifiedMembers.add(weekData.part1.SW)
		if (weekData.part2.SW) swCertifiedMembers.add(weekData.part2.SW)
	})

	// 멤버를 SW 자격자와 일반 멤버로 분리
	const swMembers = activeMembers.filter(m => swCertifiedMembers.has(m.name))
	const regularMembers = activeMembers.filter(m => !swCertifiedMembers.has(m.name))

	// 멤버별 데이터 수집
	type MemberStats = {
		name: string
		attendedWeeks: number
		assignmentCount: number
		roleCounts: Record<RoleKey, number>
		workload: number
		consecutiveCount: number
	}

	const collectMemberStats = (members: MembersEntry[], includeSW: boolean): MemberStats[] => {
		return members.map(member => {
			let attendedWeeks = 0
			let assignmentCount = 0
			const roleCounts: Record<RoleKey, number> = {
				'SW': 0, '자막': 0, '고정': 0, '사이드': 0, '스케치': 0
			}
			let workload = 0
			let consecutiveCount = 0

			// 주차별 역할 추적 (연속 배정 계산용)
			let prevWeekRoles: Set<RoleKey> = new Set()

			weekDates.forEach(date => {
				const weekData = app.weeks[date]
				const isAbsent = weekData.absences.some(a => a.name === member.name)

				if (!isAbsent) {
					attendedWeeks++

					// 배정 확인
					const assignments: { role: RoleKey; part: 'part1' | 'part2' }[] = []
					const thisWeekRoles: Set<RoleKey> = new Set()

					// Part 1
					if (weekData.part1.SW === member.name && includeSW) {
						assignments.push({ role: 'SW', part: 'part1' })
						thisWeekRoles.add('SW')
					}
					if (weekData.part1['자막'] === member.name) {
						assignments.push({ role: '자막', part: 'part1' })
						thisWeekRoles.add('자막')
					}
					if (weekData.part1['고정'] === member.name) {
						assignments.push({ role: '고정', part: 'part1' })
						thisWeekRoles.add('고정')
					}
					if (weekData.part1['사이드'].includes(member.name)) {
						assignments.push({ role: '사이드', part: 'part1' })
						thisWeekRoles.add('사이드')
					}
					if (weekData.part1['스케치'] === member.name) {
						assignments.push({ role: '스케치', part: 'part1' })
						thisWeekRoles.add('스케치')
					}

					// Part 2
					if (weekData.part2.SW === member.name && includeSW) {
						assignments.push({ role: 'SW', part: 'part2' })
						thisWeekRoles.add('SW')
					}
					if (weekData.part2['자막'] === member.name) {
						assignments.push({ role: '자막', part: 'part2' })
						thisWeekRoles.add('자막')
					}
					if (weekData.part2['고정'] === member.name) {
						assignments.push({ role: '고정', part: 'part2' })
						thisWeekRoles.add('고정')
					}
					if (weekData.part2['사이드'].includes(member.name)) {
						assignments.push({ role: '사이드', part: 'part2' })
						thisWeekRoles.add('사이드')
					}
					if (weekData.part2['스케치'] === member.name) {
						assignments.push({ role: '스케치', part: 'part2' })
						thisWeekRoles.add('스케치')
					}

					if (assignments.length > 0) {
						assignmentCount++

						// 같은 날 1부/2부 모두 배정 시 부담도 1.3배
						const bothParts = assignments.length >= 2
						const loadMultiplier = bothParts ? 1.3 : 1.0

						assignments.forEach(({ role }) => {
							roleCounts[role]++
							workload += roleWeights[role] * loadMultiplier
						})

						// 연속 배정 체크: 이번 주와 지난 주에 같은 역할이 있는지
						thisWeekRoles.forEach(role => {
							if (prevWeekRoles.has(role)) {
								consecutiveCount++
							}
						})
					}

					// 다음 주 비교를 위해 이번 주 역할 저장
					prevWeekRoles = thisWeekRoles
				} else {
					// 불참 시 연속 끊김
					prevWeekRoles = new Set()
				}
			})

			return {
				name: member.name,
				attendedWeeks,
				assignmentCount,
				roleCounts,
				workload,
				consecutiveCount
			}
		}).filter(m => m.attendedWeeks > 0) // 출석 기록이 있는 멤버만
	}

	const swStats = collectMemberStats(swMembers, true)
	const regularStats = collectMemberStats(regularMembers, false)
	const allStats = [...swStats, ...regularStats]

	if (allStats.length === 0) {
		return {
			score: 100,
			level: 'excellent',
			description: '배정 데이터가 충분하지 않습니다',
			breakdown: {
				opportunityEquality: { score: 100, weight: 40, description: '데이터 부족' },
				roleDiversity: { score: 100, weight: 30, description: '데이터 부족' },
				workloadBalance: { score: 100, weight: 20, description: '데이터 부족' },
				consecutiveAvoidance: { score: 100, weight: 10, description: '데이터 부족' }
			},
			details: {
				totalMembers: activeMembers.length,
				swCertifiedMembers: swMembers.length,
				regularMembers: regularMembers.length,
				avgAssignmentRate: 0,
				avgRoleDiversity: 0,
				consecutiveRate: 0
			},
			insights: []
		}
	}

	// ─────────────────────────────────────────────────────────────────────────
	// 1. 배정 기회 균등성 (40%) - 변동계수(CV) 사용
	// ─────────────────────────────────────────────────────────────────────────
	const assignmentRates = allStats.map(m => m.assignmentCount / m.attendedWeeks)
	const avgRate = assignmentRates.reduce((a, b) => a + b, 0) / assignmentRates.length
	const variance = assignmentRates.reduce((acc, rate) => acc + Math.pow(rate - avgRate, 2), 0) / assignmentRates.length
	const stdDev = Math.sqrt(variance)
	const cv = avgRate > 0 ? stdDev / avgRate : 0 // 변동계수

	const opportunityScore = Math.max(0, Math.min(100, 100 - (cv * 150)))
	const opportunityDesc = cv < 0.15 ? '매우 균등' : cv < 0.30 ? '균등' : cv < 0.50 ? '약간 불균등' : '불균등'

	// ─────────────────────────────────────────────────────────────────────────
	// 2. 역할 다양성 (30%) - Shannon Entropy (SW 제외)
	// ─────────────────────────────────────────────────────────────────────────
	const diversityScores = regularStats.map(m => {
		const nonSwRoles: RoleKey[] = ['자막', '고정', '사이드', '스케치']
		const total = nonSwRoles.reduce((sum, role) => sum + m.roleCounts[role], 0)

		if (total === 0) return 0

		// Shannon Entropy
		let entropy = 0
		nonSwRoles.forEach(role => {
			const p = m.roleCounts[role] / total
			if (p > 0) {
				entropy -= p * Math.log2(p)
			}
		})

		// 정규화: 최대 엔트로피는 log2(4) = 2 (4개 역할)
		return (entropy / 2) * 100
	})

	const avgDiversity = diversityScores.length > 0
		? diversityScores.reduce((a, b) => a + b, 0) / diversityScores.length
		: 100

	const roleDiversityScore = avgDiversity
	const diversityDesc = avgDiversity > 75 ? '다양함' : avgDiversity > 50 ? '보통' : avgDiversity > 25 ? '편중됨' : '매우 편중됨'

	// ─────────────────────────────────────────────────────────────────────────
	// 3. 부담도 균형 (20%) - 역할 가중치 고려
	// ─────────────────────────────────────────────────────────────────────────
	const normalizedWorkloads = allStats.map(m => m.workload / m.attendedWeeks)
	const avgWorkload = normalizedWorkloads.reduce((a, b) => a + b, 0) / normalizedWorkloads.length
	const workloadVariance = normalizedWorkloads.reduce((acc, w) => acc + Math.pow(w - avgWorkload, 2), 0) / normalizedWorkloads.length
	const workloadStdDev = Math.sqrt(workloadVariance)
	const workloadCV = avgWorkload > 0 ? workloadStdDev / avgWorkload : 0

	const workloadScore = Math.max(0, Math.min(100, 100 - (workloadCV * 120)))
	const workloadDesc = workloadCV < 0.20 ? '균형적' : workloadCV < 0.40 ? '보통' : '불균형'

	// ─────────────────────────────────────────────────────────────────────────
	// 4. 연속 배정 회피 (10%)
	// ─────────────────────────────────────────────────────────────────────────
	const totalConsecutive = allStats.reduce((sum, m) => sum + m.consecutiveCount, 0)
	const totalAssignments = allStats.reduce((sum, m) => sum + m.assignmentCount, 0)
	const consecutiveRate = totalAssignments > 0 ? totalConsecutive / totalAssignments : 0

	const consecutiveScore = Math.max(0, Math.min(100, 100 - (consecutiveRate * 150)))
	const consecutiveDesc = consecutiveRate < 0.10 ? '우수' : consecutiveRate < 0.25 ? '양호' : consecutiveRate < 0.40 ? '주의' : '개선 필요'

	// ─────────────────────────────────────────────────────────────────────────
	// 최종 점수 계산
	// ─────────────────────────────────────────────────────────────────────────
	const finalScore = Math.round(
		opportunityScore * 0.40 +
		roleDiversityScore * 0.30 +
		workloadScore * 0.20 +
		consecutiveScore * 0.10
	)

	// 등급 및 설명
	let level: 'excellent' | 'good' | 'fair' | 'poor'
	let description: string

	if (finalScore >= 85) {
		level = 'excellent'
		description = '팀원 간 배정이 매우 균형 있게 이루어지고 있습니다'
	} else if (finalScore >= 70) {
		level = 'good'
		description = '배정 균형이 양호합니다. 일부 조정이 도움이 될 수 있습니다'
	} else if (finalScore >= 55) {
		level = 'fair'
		description = '배정 편차가 있습니다. 균형 조정을 권장합니다'
	} else {
		level = 'poor'
		description = '배정이 특정 팀원에게 집중되어 있습니다. 재조정이 필요합니다'
	}

	// ─────────────────────────────────────────────────────────────────────────
	// 인사이트 생성: 왜 이런 점수가 나왔는지 구체적인 원인 분석
	// ─────────────────────────────────────────────────────────────────────────
	type InsightType = 'issue' | 'positive' | 'suggestion'
	type Insight = {
		type: InsightType
		category: 'opportunity' | 'diversity' | 'workload' | 'consecutive' | 'general'
		title: string
		description: string
		affectedMembers?: string[]
	}

	const insights: Insight[] = []

	// 1. 배정 기회 관련 인사이트
	if (opportunityScore < 70) {
		// 배정률이 가장 낮은/높은 멤버 찾기
		const memberRates = allStats.map(m => ({
			name: m.name,
			rate: m.assignmentCount / m.attendedWeeks
		})).sort((a, b) => a.rate - b.rate)

		const underassigned = memberRates.filter(m => m.rate < avgRate * 0.7)
		const overassigned = memberRates.filter(m => m.rate > avgRate * 1.3)

		if (underassigned.length > 0) {
			insights.push({
				type: 'issue',
				category: 'opportunity',
				title: '배정 기회 부족',
				description: `${underassigned.map(m => m.name).join(', ')}님이 평균 대비 배정 기회가 적습니다 (평균 ${(avgRate * 100).toFixed(0)}% vs 이들 ${(underassigned.reduce((s, m) => s + m.rate, 0) / underassigned.length * 100).toFixed(0)}%)`,
				affectedMembers: underassigned.map(m => m.name)
			})
		}

		if (overassigned.length > 0) {
			insights.push({
				type: 'issue',
				category: 'opportunity',
				title: '배정 집중',
				description: `${overassigned.map(m => m.name).join(', ')}님에게 배정이 집중되어 있습니다`,
				affectedMembers: overassigned.map(m => m.name)
			})
		}
	} else if (opportunityScore >= 90) {
		insights.push({
			type: 'positive',
			category: 'opportunity',
			title: '균등한 배정 기회',
			description: '모든 팀원에게 배정 기회가 고르게 주어지고 있습니다'
		})
	}

	// 2. 역할 다양성 관련 인사이트
	if (roleDiversityScore < 50) {
		const lowDiversityMembers = regularStats
			.map((m, idx) => ({ name: m.name, diversity: diversityScores[idx] || 0 }))
			.filter(m => m.diversity < 40)
			.sort((a, b) => a.diversity - b.diversity)
			.slice(0, 3)

		if (lowDiversityMembers.length > 0) {
			// 어떤 역할에 편중되었는지 분석
			const memberDetails = lowDiversityMembers.map(m => {
				const stats = regularStats.find(s => s.name === m.name)
				if (!stats) return m.name
				const mainRole = (['자막', '고정', '사이드', '스케치'] as RoleKey[])
					.reduce((max, role) => stats.roleCounts[role] > stats.roleCounts[max] ? role : max, '자막' as RoleKey)
				return `${m.name}(${mainRole} 편중)`
			})

			insights.push({
				type: 'issue',
				category: 'diversity',
				title: '역할 경험 편중',
				description: `${memberDetails.join(', ')} - 다양한 역할 경험이 필요합니다`,
				affectedMembers: lowDiversityMembers.map(m => m.name)
			})
		}
	} else if (roleDiversityScore >= 80) {
		insights.push({
			type: 'positive',
			category: 'diversity',
			title: '다양한 역할 경험',
			description: '팀원들이 여러 역할을 골고루 경험하고 있습니다'
		})
	}

	// 3. 부담도 관련 인사이트
	if (workloadScore < 60) {
		const memberWorkloads = allStats.map(m => ({
			name: m.name,
			workload: m.workload / m.attendedWeeks
		})).sort((a, b) => b.workload - a.workload)

		const highWorkload = memberWorkloads.filter(m => m.workload > avgWorkload * 1.4).slice(0, 3)
		const lowWorkload = memberWorkloads.filter(m => m.workload < avgWorkload * 0.6).slice(0, 3)

		if (highWorkload.length > 0) {
			insights.push({
				type: 'issue',
				category: 'workload',
				title: '과부담 팀원',
				description: `${highWorkload.map(m => m.name).join(', ')}님이 난이도 높은 역할(SW, 사이드 등)을 자주 맡고 있습니다`,
				affectedMembers: highWorkload.map(m => m.name)
			})
		}

		if (lowWorkload.length > 0) {
			insights.push({
				type: 'suggestion',
				category: 'workload',
				title: '부담도 분산 권장',
				description: `${lowWorkload.map(m => m.name).join(', ')}님에게 더 다양한 역할 배정을 고려해보세요`,
				affectedMembers: lowWorkload.map(m => m.name)
			})
		}
	}

	// 4. 연속 배정 관련 인사이트
	// detectConsecutiveAssignments 함수 사용 (주의 필요 카드와 동일한 로직)
	const consecutiveAssignmentsData = detectConsecutiveAssignments(app)

	// 현재 진행 중인 연속 배정만 필터 (최근 주차까지 이어지는 것)
	const sortedWeekDates = sortWeekDates(Object.keys(app.weeks))
	const latestWeekDate = sortedWeekDates[sortedWeekDates.length - 1]

	const activeConsecutive = consecutiveAssignmentsData.filter(c => {
		const lastDate = c.weekDates[c.weekDates.length - 1]
		return lastDate === latestWeekDate
	})

	if (activeConsecutive.length > 0) {
		// 가장 심각한 연속 배정 3개만 표시
		const topConsecutive = activeConsecutive.slice(0, 3)

		insights.push({
			type: 'issue',
			category: 'consecutive',
			title: '연속 배정 발생',
			description: topConsecutive.map(c =>
				`${c.displayName} ${c.role} ${c.consecutiveWeeks}주 연속`
			).join(', '),
			affectedMembers: topConsecutive.map(c => c.memberName)
		})
	} else if (consecutiveScore >= 90) {
		insights.push({
			type: 'positive',
			category: 'consecutive',
			title: '역할 순환 우수',
			description: '같은 역할의 연속 배정이 잘 방지되고 있습니다'
		})
	}

	// 5. 종합 제안
	if (finalScore < 70 && insights.filter(i => i.type === 'issue').length > 0) {
		const issueCategories = insights.filter(i => i.type === 'issue').map(i => i.category)
		const priorityCategory = issueCategories[0]

		const suggestionMap: Record<string, string> = {
			opportunity: '배정이 적은 팀원에게 우선적으로 역할을 배정해보세요',
			diversity: 'AI 추천 기능을 사용하여 역할 다양성을 높여보세요',
			workload: '난이도 높은 역할(사이드, SW)을 여러 팀원에게 분산해보세요',
			consecutive: '배정 시 지난주 역할을 확인하고 다른 역할을 배정해보세요'
		}

		if (priorityCategory && suggestionMap[priorityCategory]) {
			insights.push({
				type: 'suggestion',
				category: 'general',
				title: '💡 개선 제안',
				description: suggestionMap[priorityCategory]
			})
		}
	}

	// 인사이트 정렬: issue → suggestion → positive 순
	const typeOrder: Record<InsightType, number> = { issue: 0, suggestion: 1, positive: 2 }
	insights.sort((a, b) => typeOrder[a.type] - typeOrder[b.type])

	return {
		score: finalScore,
		level,
		description,
		breakdown: {
			opportunityEquality: {
				score: Math.round(opportunityScore),
				weight: 40,
				description: `배정 기회 ${opportunityDesc} (CV: ${(cv * 100).toFixed(1)}%)`
			},
			roleDiversity: {
				score: Math.round(roleDiversityScore),
				weight: 30,
				description: `역할 다양성 ${diversityDesc} (평균: ${avgDiversity.toFixed(1)}점)`
			},
			workloadBalance: {
				score: Math.round(workloadScore),
				weight: 20,
				description: `부담도 ${workloadDesc} (CV: ${(workloadCV * 100).toFixed(1)}%)`
			},
			consecutiveAvoidance: {
				score: Math.round(consecutiveScore),
				weight: 10,
				description: `연속 배정 ${consecutiveDesc} (${(consecutiveRate * 100).toFixed(1)}%)`
			}
		},
		details: {
			totalMembers: activeMembers.length,
			swCertifiedMembers: swMembers.length,
			regularMembers: regularMembers.length,
			avgAssignmentRate: Math.round(avgRate * 100) / 100,
			avgRoleDiversity: Math.round(avgDiversity * 10) / 10,
			consecutiveRate: Math.round(consecutiveRate * 100) / 100
		},
		insights
	}
}

/**
 * 연속 배정 감지 (같은 역할 2주 이상 연속)
 */
export function detectConsecutiveAssignments(app: AppData): {
	memberName: string
	displayName: string
	role: RoleKey
	consecutiveWeeks: number
	weekDates: string[]
}[] {
	if (!app || !app.weeks || !app.members) return []

	const weekDates = sortWeekDates(Object.keys(app.weeks))
	if (weekDates.length < 2) return []

	const results: {
		memberName: string
		displayName: string
		role: RoleKey
		consecutiveWeeks: number
		weekDates: string[]
	}[] = []

	// 멤버별, 역할별 연속 배정 추적
	const memberRoleStreaks = new Map<string, Map<RoleKey, { count: number; dates: string[] }>>()

	weekDates.forEach(date => {
		const weekData = app.weeks[date]
		const currentAssignments = new Map<string, Set<RoleKey>>()

		// 현재 주의 모든 배정 수집
		const allAssignments = [
			...extractAssignments(weekData.part1),
			...extractAssignments(weekData.part2)
		]

		allAssignments.forEach(({ name, role }) => {
			if (!currentAssignments.has(name)) {
				currentAssignments.set(name, new Set())
			}
			currentAssignments.get(name)!.add(role)
		})

		// 각 멤버의 스트릭 업데이트
		app.members.forEach(member => {
			if (!memberRoleStreaks.has(member.name)) {
				memberRoleStreaks.set(member.name, new Map())
			}
			const roleStreaks = memberRoleStreaks.get(member.name)!
			const currentRoles = currentAssignments.get(member.name) || new Set()

			RoleKeys.forEach(role => {
				if (!roleStreaks.has(role)) {
					roleStreaks.set(role, { count: 0, dates: [] })
				}
				const streak = roleStreaks.get(role)!

				if (currentRoles.has(role)) {
					streak.count++
					streak.dates.push(date)
				} else {
					// 스트릭 종료, 2주 이상이면 기록
					if (streak.count >= 2) {
						results.push({
							memberName: member.name,
							displayName: stripCohort(member.name),
							role,
							consecutiveWeeks: streak.count,
							weekDates: [...streak.dates]
						})
					}
					streak.count = 0
					streak.dates = []
				}
			})
		})
	})

	// 마지막 주까지 진행 중인 연속 배정도 포함
	memberRoleStreaks.forEach((roleStreaks, memberName) => {
		roleStreaks.forEach((streak, role) => {
			if (streak.count >= 2) {
				// 이미 추가되지 않은 경우만 추가
				const exists = results.some(
					r => r.memberName === memberName && r.role === role &&
						r.weekDates[r.weekDates.length - 1] === streak.dates[streak.dates.length - 1]
				)
				if (!exists) {
					results.push({
						memberName,
						displayName: stripCohort(memberName),
						role,
						consecutiveWeeks: streak.count,
						weekDates: [...streak.dates]
					})
				}
			}
		})
	})

	// 최근 연속 배정 우선, 연속 주수 내림차순 정렬
	return results.sort((a, b) => {
		const aLatest = new Date(a.weekDates[a.weekDates.length - 1]).getTime()
		const bLatest = new Date(b.weekDates[b.weekDates.length - 1]).getTime()
		if (bLatest !== aLatest) return bLatest - aLatest
		return b.consecutiveWeeks - a.consecutiveWeeks
	})
}

/**
 * 장기 불참자 감지 (최근 N주 연속 불참)
 */
export function detectLongTermAbsences(app: AppData, minWeeks = 2): {
	memberName: string
	displayName: string
	consecutiveAbsences: number
	lastAttendedDate: string | null
	reasons: string[]
}[] {
	if (!app || !app.weeks || !app.members) return []

	const weekDates = sortWeekDates(Object.keys(app.weeks))
	if (weekDates.length < minWeeks) return []

	const activeMembers = app.members.filter(m => m.active)
	const results: {
		memberName: string
		displayName: string
		consecutiveAbsences: number
		lastAttendedDate: string | null
		reasons: string[]
	}[] = []

	activeMembers.forEach(member => {
		let consecutiveAbsences = 0
		let lastAttendedDate: string | null = null
		const reasons: string[] = []

		// 최근부터 역순으로 확인
		for (let i = weekDates.length - 1; i >= 0; i--) {
			const date = weekDates[i]
			const weekData = app.weeks[date]
			const absence = weekData.absences.find(a => a.name === member.name)

			if (absence) {
				consecutiveAbsences++
				if (absence.reason) reasons.push(absence.reason)
			} else {
				lastAttendedDate = date
				break
			}
		}

		if (consecutiveAbsences >= minWeeks) {
			results.push({
				memberName: member.name,
				displayName: stripCohort(member.name),
				consecutiveAbsences,
				lastAttendedDate,
				reasons: [...new Set(reasons)] // 중복 제거
			})
		}
	})

	return results.sort((a, b) => b.consecutiveAbsences - a.consecutiveAbsences)
}

/**
 * 배정 추천 (배정 부족자 + 역할별 오래 안 맡은 팀원)
 */
export function getAssignmentSuggestions(app: AppData): {
	underassigned: { name: string; displayName: string; rate: number; message: string }[]
	roleRecommendations: { role: RoleKey; name: string; displayName: string; weeksAgo: number }[]
} {
	if (!app || !app.weeks || !app.members) {
		return { underassigned: [], roleRecommendations: [] }
	}

	const activeMembers = app.members.filter(m => m.active)
	const weekDates = sortWeekDates(Object.keys(app.weeks))

	// 배정 부족자 (출석 대비 배정률 하위 3명)
	const underassigned = calculateUnderassignedMembers(app, 3).map(m => ({
		name: m.name,
		displayName: m.displayName,
		rate: m.assignmentRate,
		message: m.attendedWeeks > 0
			? `${m.attendedWeeks}주 출석 중 ${m.assignmentCount}회 배정`
			: '출석 기록 없음'
	}))

	// 역할별 가장 오래 안 맡은 팀원 찾기
	const roleRecommendations: { role: RoleKey; name: string; displayName: string; weeksAgo: number }[] = []

	// SW 수행 가능한 멤버 식별 (과거 이력 기준)
	const swQualifiedMembers = new Set<string>()
	weekDates.forEach(date => {
		const weekData = app.weeks[date]
		const p1sw = weekData.part1.SW
		if (p1sw) swQualifiedMembers.add(p1sw)
		const p2sw = weekData.part2.SW
		if (p2sw) swQualifiedMembers.add(p2sw)
	})

	RoleKeys.forEach(role => {
		let oldestMember: { name: string; weeksAgo: number } | null = null

		activeMembers.forEach(member => {
			// [규칙 1] SW 역할은 SW 수행 이력이 있는 멤버만 추천
			if (role === 'SW' && !swQualifiedMembers.has(member.name)) {
				return
			}

			// [규칙 2] 자막 역할은 SW 수행 가능한 고기수 인원은 제외 (불문율 반영)
			if (role === '자막' && swQualifiedMembers.has(member.name)) {
				return
			}

			// 해당 멤버가 이 역할을 마지막으로 맡은 주차 찾기
			let lastAssignedIndex = -1

			for (let i = weekDates.length - 1; i >= 0; i--) {
				const weekData = app.weeks[weekDates[i]]
				const isAbsent = weekData.absences.some(a => a.name === member.name)
				if (isAbsent) continue

				const assignments = extractAssignments(weekData.part1)
					.concat(extractAssignments(weekData.part2))

				if (assignments.some(a => a.name === member.name && a.role === role)) {
					lastAssignedIndex = i
					break
				}
			}

			// 배정 이력이 없으면 Infinity, 있으면 경과 주수 계산
			const weeksAgo = lastAssignedIndex === -1
				? Infinity
				: weekDates.length - 1 - lastAssignedIndex

			// 최근 주에 불참이 아닌 경우만 추천
			const latestWeek = app.weeks[weekDates[weekDates.length - 1]]
			const isCurrentlyAbsent = latestWeek?.absences.some(a => a.name === member.name)

			if (!isCurrentlyAbsent) {
				// 1. 기존 후보가 없으면 현재 멤버 등록
				// 2. 현재 멤버가 더 오래되었으면 교체 (weeksAgo가 더 크면)
				// 3. 같은 weeksAgo일 경우 기수/이름 등으로 정렬할 수도 있으나 여기선 단순 교체 여부만 판단
				if (oldestMember === null || weeksAgo > oldestMember.weeksAgo) {
					oldestMember = { name: member.name, weeksAgo }
				}
			}
		})

		if (oldestMember !== null) {
			const member = oldestMember as { name: string; weeksAgo: number }
			// 2주 이상 지난 경우만 추천 (2주 전 or Infinity)
			if (member.weeksAgo >= 2) {
				roleRecommendations.push({
					role,
					name: member.name,
					displayName: stripCohort(member.name),
					weeksAgo: member.weeksAgo
				})
			}
		}
	})

	// 오래된 순으로 정렬
	roleRecommendations.sort((a, b) => b.weeksAgo - a.weeksAgo)

	return { underassigned, roleRecommendations }
}
