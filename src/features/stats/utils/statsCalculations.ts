import type { AppData, RoleKey, PartAssignment, WeekData } from '@/shared/types'
import { RoleKeys } from '@/shared/types'

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

/** 기수 추출 (예: "20 솔빈" → 20) */
function extractGeneration(name: string): number {
	const match = name.match(/^(\d+)\s+/)
	return match ? parseInt(match[1], 10) : 999
}

/** 팀원 이름에서 표시 이름만 추출 (예: "20 솔빈" → "솔빈") */
export function extractDisplayName(name: string): string {
	const match = name.match(/^\d+\s+(.+)$/)
	return match ? match[1] : name
}

/** 기수 순으로 정렬 */
export function sortByGeneration<T extends { name: string }>(members: T[]): T[] {
	return [...members].sort((a, b) => extractGeneration(a.name) - extractGeneration(b.name))
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
 * 역할별 기여도 트리맵 데이터 계산
 * 차트 2: Role Contribution Treemap
 */
export function calculateRoleContributions(app: AppData, includeInactive = false): RoleContribution[] {
	const roleCountMap = new Map<RoleKey, Map<string, number>>()
	
	// 역할별 맵 초기화
	RoleKeys.forEach(role => {
		roleCountMap.set(role, new Map())
	})
	
	// 모든 주차 데이터 순회
	Object.values(app.weeks).forEach((weekData: WeekData) => {
		const allAssignments = [
			...extractAssignments(weekData.part1),
			...extractAssignments(weekData.part2)
		]
		
		allAssignments.forEach(({ name, role }) => {
			// 비활성 멤버 필터링
			if (!includeInactive) {
				const member = app.members.find(m => m.name === name)
				if (member && !member.active) return
			}
			
			const memberCounts = roleCountMap.get(role)!
			memberCounts.set(name, (memberCounts.get(name) || 0) + 1)
		})
	})
	
	// 결과 변환
	const contributions: RoleContribution[] = []
	
	RoleKeys.forEach(role => {
		const memberCounts = roleCountMap.get(role)!
		let totalCount = 0
		const members: { name: string; count: number; percentage: number }[] = []
		
		memberCounts.forEach((count, name) => {
			totalCount += count
			members.push({ name, count, percentage: 0 })
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
	// 멤버 필터링 및 정렬
	const filteredMembers = includeInactive
		? app.members
		: app.members.filter(m => m.active)
	const sortedMembers = sortByGeneration(filteredMembers)
	const memberNames = sortedMembers.map(m => m.name)
	
	// 멤버별 출석 주차 수 계산
	const attendanceCount = new Map<string, number>()
	memberNames.forEach(name => attendanceCount.set(name, 0))
	
	Object.values(app.weeks).forEach((weekData: WeekData) => {
		const absentNames = new Set(weekData.absences.map(a => a.name))
		
		memberNames.forEach(name => {
			if (!absentNames.has(name)) {
				attendanceCount.set(name, (attendanceCount.get(name) || 0) + 1)
			}
		})
	})
	
	// 멤버별-역할별 배정 횟수 계산
	const roleCounts = new Map<string, Map<RoleKey, number>>()
	memberNames.forEach(name => {
		const roleMap = new Map<RoleKey, number>()
		RoleKeys.forEach(role => roleMap.set(role, 0))
		roleCounts.set(name, roleMap)
	})
	
	Object.values(app.weeks).forEach((weekData: WeekData) => {
		const allAssignments = [
			...extractAssignments(weekData.part1),
			...extractAssignments(weekData.part2)
		]
		
		allAssignments.forEach(({ name, role }) => {
			if (roleCounts.has(name)) {
				const roleMap = roleCounts.get(name)!
				roleMap.set(role, (roleMap.get(role) || 0) + 1)
			}
		})
	})
	
	// 결과 데이터 생성
	const data: MemberRoleCount[] = []
	let maxRatio = 0
	
	memberNames.forEach(memberName => {
		const attended = attendanceCount.get(memberName) || 0
		const roleMap = roleCounts.get(memberName)!
		
		RoleKeys.forEach(role => {
			const count = roleMap.get(role) || 0
			const ratio = attended > 0 ? (count / attended) * 100 : 0
			
			if (ratio > maxRatio) maxRatio = ratio
			
			data.push({
				memberName,
				role,
				count,
				attendedWeeks: attended,
				ratio
			})
		})
	})
	
	return {
		members: memberNames,
		roles: [...RoleKeys],
		data,
		maxRatio
	}
}

/**
 * 역할별 색상 반환 (CSS 변수명)
 */
export function getRoleColor(role: RoleKey): string {
	const colorMap: Record<RoleKey, string> = {
		'SW': '--data-series-1',
		'자막': '--data-series-2',
		'고정': '--data-series-3',
		'사이드': '--data-series-4',
		'스케치': '--data-series-5'
	}
	return colorMap[role]
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
 * CSS 변수에서 실제 색상값 추출
 */
export function getCSSColor(varName: string): string {
	if (typeof window === 'undefined') return '#666'
	const computed = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
	return computed || '#666'
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
			displayName: extractDisplayName(m.name),
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
	const activeMembers = app.members.filter(m => m.active)
	
	// 멤버별 배정 횟수 & 출석 횟수 집계
	const assignmentCounts = new Map<string, number>()
	const attendanceCounts = new Map<string, number>()
	activeMembers.forEach(m => {
		assignmentCounts.set(m.name, 0)
		attendanceCounts.set(m.name, 0)
	})
	
	Object.values(app.weeks).forEach((weekData: WeekData) => {
		const absentNames = new Set(weekData.absences.map(a => a.name))
		
		// 출석 카운트
		activeMembers.forEach(m => {
			if (!absentNames.has(m.name)) {
				attendanceCounts.set(m.name, (attendanceCounts.get(m.name) || 0) + 1)
			}
		})
		
		// 배정 카운트
		const allAssignments = [
			...extractAssignments(weekData.part1),
			...extractAssignments(weekData.part2)
		]
		allAssignments.forEach(({ name }) => {
			if (assignmentCounts.has(name)) {
				assignmentCounts.set(name, (assignmentCounts.get(name) || 0) + 1)
			}
		})
	})
	
	// 정렬 (배정 횟수 내림차순)
	const ranking = activeMembers
		.map(m => {
			const attended = attendanceCounts.get(m.name) || 0
			const assigned = assignmentCounts.get(m.name) || 0
			return {
				name: m.name,
				displayName: extractDisplayName(m.name),
				assignmentCount: assigned,
				attendedWeeks: attended,
				assignmentRate: attended > 0 ? assigned / attended : 0
			}
		})
		.sort((a, b) => b.assignmentCount - a.assignmentCount)
		.slice(0, topN)
	
	return ranking
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
	const activeMembers = app.members.filter(m => m.active)
	
	// 멤버별 배정 횟수 & 출석 횟수 집계
	const assignmentCounts = new Map<string, number>()
	const attendanceCounts = new Map<string, number>()
	activeMembers.forEach(m => {
		assignmentCounts.set(m.name, 0)
		attendanceCounts.set(m.name, 0)
	})
	
	Object.values(app.weeks).forEach((weekData: WeekData) => {
		const absentNames = new Set(weekData.absences.map(a => a.name))
		
		activeMembers.forEach(m => {
			if (!absentNames.has(m.name)) {
				attendanceCounts.set(m.name, (attendanceCounts.get(m.name) || 0) + 1)
			}
		})
		
		const allAssignments = [
			...extractAssignments(weekData.part1),
			...extractAssignments(weekData.part2)
		]
		allAssignments.forEach(({ name }) => {
			if (assignmentCounts.has(name)) {
				assignmentCounts.set(name, (assignmentCounts.get(name) || 0) + 1)
			}
		})
	})
	
	// 정렬 (출석 대비 배정률 오름차순 - 낮을수록 배정 부족)
	const ranking = activeMembers
		.map(m => {
			const attended = attendanceCounts.get(m.name) || 0
			const assigned = assignmentCounts.get(m.name) || 0
			return {
				name: m.name,
				displayName: extractDisplayName(m.name),
				assignmentCount: assigned,
				attendedWeeks: attended,
				assignmentRate: attended > 0 ? assigned / attended : 0
			}
		})
		.filter(m => m.attendedWeeks > 0) // 출석 기록이 있는 팀원만
		.sort((a, b) => a.assignmentRate - b.assignmentRate)
		.slice(0, topN)
	
	return ranking
}

