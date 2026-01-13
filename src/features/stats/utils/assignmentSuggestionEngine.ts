/**
 * Smart Assignment Suggestion Engine
 * 
 * 각 역할 슬롯에 최적의 멤버를 추천하는 알고리즘
 * Multi-Factor Scoring + Greedy Selection 방식
 */

import type { AppData, RoleKey, PartAssignment, MembersEntry } from '@/shared/types'
import { RoleKeys } from '@/shared/types'
import { stripCohort } from '@/shared/utils/assignment'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type PartKey = 'part1' | 'part2'

export type SlotId = {
    part: PartKey
    role: RoleKey
    index?: 0 | 1 // 사이드 역할용
}

export type CandidateScore = {
    name: string
    displayName: string
    score: number
    reasons: string[]
}

export type SlotRecommendation = {
    slot: SlotId
    recommended: CandidateScore | null
    alternatives: CandidateScore[] // 최대 5순위까지
}

export type AssignmentPlan = {
    slots: SlotRecommendation[]
    summary: {
        filledCount: number
        totalSlots: number
        warnings: string[]
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** 슬롯 처리 순서 (SW 먼저, 사이드 다음) */
const SLOT_ORDER: SlotId[] = [
    // SW 먼저 (자격자 pool이 작음)
    { part: 'part1', role: 'SW' },
    { part: 'part2', role: 'SW' },
    // 사이드 (2명씩, 체력 부담)
    { part: 'part1', role: '사이드', index: 0 },
    { part: 'part1', role: '사이드', index: 1 },
    { part: 'part2', role: '사이드', index: 0 },
    { part: 'part2', role: '사이드', index: 1 },
    // 자막
    { part: 'part1', role: '자막' },
    { part: 'part2', role: '자막' },
    // 고정, 스케치
    { part: 'part1', role: '고정' },
    { part: 'part2', role: '고정' },
    { part: 'part1', role: '스케치' },
    { part: 'part2', role: '스케치' },
]

/** 점수 가중치 */
const SCORE_WEIGHTS = {
    WEEKS_SINCE_ROLE: 5,       // 역할 경과 주수당 점수
    MAX_WEEKS_BONUS: 30,       // 역할 경과 최대 보너스
    RATE_GAP_MULTIPLIER: 50,   // 배정률 격차 배수
    MAX_RATE_BONUS: 25,        // 배정률 최대 보너스
    DIVERSITY_BONUS: 20,       // 역할 다양성 최대 보너스
    CONSECUTIVE_PENALTY: -30,  // 연속 배정 패널티
    SAME_DAY_PENALTY: -15,     // 당일 중복 패널티
    SW_SUBTITLE_PENALTY: -9999, // SW 자격자의 자막 배정 패널티 (불문율)
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Member Context Class
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 멤버별 통계를 캐싱하여 점수 계산에 사용
 */
export class MemberContext {
    private app: AppData
    private weekDates: string[]
    private swQualifiedMembers: Set<string>
    private memberStats: Map<string, {
        attendedWeeks: number
        assignmentCount: number
        roleCounts: Record<RoleKey, number>
        lastRoleWeek: Record<RoleKey, number> // 각 역할 마지막 배정 주차 인덱스 (-1 = 배정 이력 없음)
        consecutiveRoles: Record<RoleKey, number> // 현재 연속 배정 횟수
        hasAnyAssignment: boolean // 전체 배정 이력 여부 (신입 판별)
    }>
    private avgAssignmentRate: number

    constructor(app: AppData) {
        this.app = app
        this.weekDates = this.sortWeekDates(Object.keys(app.weeks || {}))
        this.swQualifiedMembers = this.identifySWQualified()
        this.memberStats = this.buildMemberStats()
        this.avgAssignmentRate = this.calculateAvgRate()
    }

    private sortWeekDates(dates: string[]): string[] {
        return [...dates].sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
    }

    private identifySWQualified(): Set<string> {
        const qualified = new Set<string>()
        this.weekDates.forEach(date => {
            const week = this.app.weeks[date]
            if (week.part1.SW) qualified.add(week.part1.SW)
            if (week.part2.SW) qualified.add(week.part2.SW)
        })
        return qualified
    }

    private buildMemberStats() {
        const stats = new Map<string, {
            attendedWeeks: number
            assignmentCount: number
            roleCounts: Record<RoleKey, number>
            lastRoleWeek: Record<RoleKey, number>
            consecutiveRoles: Record<RoleKey, number>
            hasAnyAssignment: boolean
        }>()

        const activeMembers = this.app.members?.filter(m => m.active) || []

        // Initialize
        activeMembers.forEach(m => {
            stats.set(m.name, {
                attendedWeeks: 0,
                assignmentCount: 0,
                roleCounts: { SW: 0, 자막: 0, 고정: 0, 사이드: 0, 스케치: 0 },
                lastRoleWeek: { SW: -1, 자막: -1, 고정: -1, 사이드: -1, 스케치: -1 }, // -1 = 배정 이력 없음 (신입)
                consecutiveRoles: { SW: 0, 자막: 0, 고정: 0, 사이드: 0, 스케치: 0 },
                hasAnyAssignment: false // 전체 배정 이력 여부 (신입 판별)
            })
        })

        // Process each week
        this.weekDates.forEach((date, weekIndex) => {
            const week = this.app.weeks[date]
            const absentNames = new Set(week.absences.map(a => a.name))

            // Track assignments this week per member
            const weekAssignments = new Map<string, Set<RoleKey>>()

            const processAssignment = (name: string, role: RoleKey) => {
                if (!stats.has(name)) return
                const s = stats.get(name)!
                s.roleCounts[role]++
                s.lastRoleWeek[role] = weekIndex

                if (!weekAssignments.has(name)) weekAssignments.set(name, new Set())
                weekAssignments.get(name)!.add(role)
            }

            // Part 1
            if (week.part1.SW) processAssignment(week.part1.SW, 'SW')
            if (week.part1['자막']) processAssignment(week.part1['자막'], '자막')
            if (week.part1['고정']) processAssignment(week.part1['고정'], '고정')
            if (week.part1['스케치']) processAssignment(week.part1['스케치'], '스케치')
            week.part1['사이드'].forEach(name => { if (name) processAssignment(name, '사이드') })

            // Part 2
            if (week.part2.SW) processAssignment(week.part2.SW, 'SW')
            if (week.part2['자막']) processAssignment(week.part2['자막'], '자막')
            if (week.part2['고정']) processAssignment(week.part2['고정'], '고정')
            if (week.part2['스케치']) processAssignment(week.part2['스케치'], '스케치')
            week.part2['사이드'].forEach(name => { if (name) processAssignment(name, '사이드') })

            // Update member stats
            activeMembers.forEach(m => {
                const s = stats.get(m.name)!
                if (!absentNames.has(m.name)) {
                    s.attendedWeeks++
                }

                const thisWeekRoles = weekAssignments.get(m.name) || new Set()
                if (thisWeekRoles.size > 0) {
                    s.assignmentCount++
                    s.hasAnyAssignment = true
                }

                // Update consecutive counts
                RoleKeys.forEach(role => {
                    if (thisWeekRoles.has(role)) {
                        s.consecutiveRoles[role]++
                    } else {
                        s.consecutiveRoles[role] = 0
                    }
                })
            })
        })

        return stats
    }

    private calculateAvgRate(): number {
        let totalRate = 0
        let count = 0
        this.memberStats.forEach(s => {
            if (s.attendedWeeks > 0) {
                totalRate += s.assignmentCount / s.attendedWeeks
                count++
            }
        })
        return count > 0 ? totalRate / count : 0
    }

    // Public getters
    get totalWeeks(): number {
        return this.weekDates.length
    }

    getActiveMembers(): MembersEntry[] {
        return this.app.members?.filter(m => m.active) || []
    }

    isSWQualified(name: string): boolean {
        return this.swQualifiedMembers.has(name)
    }

    getWeeksSinceRole(name: string, role: RoleKey): number {
        const s = this.memberStats.get(name)
        if (!s) return -1 // 멤버 없음
        const lastIndex = s.lastRoleWeek[role]
        if (lastIndex < 0) return -1 // 배정 이력 없음 (신입 또는 해당 역할 경험 없음)
        return this.totalWeeks - 1 - lastIndex
    }

    /** 신입 멤버 여부 (전체 배정 이력 없음) */
    isNewMember(name: string): boolean {
        const s = this.memberStats.get(name)
        return !s || !s.hasAnyAssignment
    }

    getAssignmentRate(name: string): number {
        const s = this.memberStats.get(name)
        if (!s || s.attendedWeeks === 0) return 0
        return s.assignmentCount / s.attendedWeeks
    }

    getAverageAssignmentRate(): number {
        return this.avgAssignmentRate
    }

    getRoleCount(name: string, role: RoleKey): number {
        return this.memberStats.get(name)?.roleCounts[role] || 0
    }

    getTotalAssignments(name: string): number {
        return this.memberStats.get(name)?.assignmentCount || 0
    }

    getConsecutiveCount(name: string, role: RoleKey): number {
        return this.memberStats.get(name)?.consecutiveRoles[role] || 0
    }

    wasAssignedLastWeek(name: string, role: RoleKey): boolean {
        const s = this.memberStats.get(name)
        if (!s) return false
        return s.lastRoleWeek[role] === this.totalWeeks - 1
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Scoring Function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 특정 멤버의 특정 슬롯에 대한 점수 계산
 */
export function calculateCandidateScore(
    memberName: string,
    slot: SlotId,
    context: MemberContext,
    alreadyAssignedToday: Set<string>
): CandidateScore {
    const reasons: string[] = []
    let score = 100 // 기본 점수

    const { role } = slot

    // 1. 역할 경과 주수 (최대 +30점)
    const weeksSince = context.getWeeksSinceRole(memberName, role)
    const isNewMember = context.isNewMember(memberName)

    // 신입이거나 해당 역할 첫 경험인 경우 최대 보너스
    const effectiveWeeks = weeksSince < 0 ? 6 : weeksSince // -1(미경험)은 6주로 취급
    const weeksBonus = Math.min(effectiveWeeks * SCORE_WEIGHTS.WEEKS_SINCE_ROLE, SCORE_WEIGHTS.MAX_WEEKS_BONUS)
    score += weeksBonus

    if (isNewMember) {
        reasons.push('신규 멤버')
    } else if (weeksSince < 0) {
        reasons.push(`${role} 첫 경험`)
    } else if (weeksSince >= 3) {
        reasons.push(`${weeksSince}주 전 마지막 ${role}`)
    }

    // 2. 배정 기회 균등 (최대 +25점)
    const myRate = context.getAssignmentRate(memberName)
    const avgRate = context.getAverageAssignmentRate()
    const rateGap = avgRate - myRate
    if (rateGap > 0) {
        const rateBonus = Math.min(rateGap * SCORE_WEIGHTS.RATE_GAP_MULTIPLIER, SCORE_WEIGHTS.MAX_RATE_BONUS)
        score += rateBonus
        if (rateGap > 0.1) {
            reasons.push('배정률 하위')
        }
    }

    // 3. 역할 다양성 (최대 +20점)
    const roleExp = context.getRoleCount(memberName, role)
    const totalExp = context.getTotalAssignments(memberName)
    if (totalExp > 0) {
        const roleRatio = roleExp / totalExp
        const diversityBonus = (1 - roleRatio) * SCORE_WEIGHTS.DIVERSITY_BONUS
        score += diversityBonus
    } else {
        score += SCORE_WEIGHTS.DIVERSITY_BONUS // 첫 배정자 보너스
    }

    // 4. 연속 배정 패널티 (-30점)
    if (context.wasAssignedLastWeek(memberName, role)) {
        score += SCORE_WEIGHTS.CONSECUTIVE_PENALTY
        reasons.push('지난주 동일 역할')
    }

    // 5. 당일 중복 패널티 (-15점) - 1부/2부 동시 배정
    if (alreadyAssignedToday.has(memberName)) {
        score += SCORE_WEIGHTS.SAME_DAY_PENALTY
        reasons.push('당일 중복')
    }

    // 6. SW 자격자 + 자막 역할 = 불문율 패널티 (-9999점)
    if (role === '자막' && context.isSWQualified(memberName)) {
        score += SCORE_WEIGHTS.SW_SUBTITLE_PENALTY
        reasons.push('SW 자격자 (자막 비추천)')
    }

    return {
        name: memberName,
        displayName: stripCohort(memberName),
        score: Math.round(score),
        reasons
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Assignment Plan Generator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 전체 배정 계획 생성
 * @param app AppData
 * @param absentees 이번 주 불참자 목록
 */
export function generateAssignmentPlan(
    app: AppData,
    absentees: string[] = []
): AssignmentPlan {
    if (!app || !app.members || !app.weeks) {
        return {
            slots: [],
            summary: { filledCount: 0, totalSlots: 12, warnings: ['데이터 없음'] }
        }
    }

    const context = new MemberContext(app)
    const absentSet = new Set(absentees)

    // 배정 가능한 멤버
    const availableMembers = context.getActiveMembers()
        .filter(m => !absentSet.has(m.name))
        .map(m => m.name)

    // 이미 배정된 멤버 추적 (슬롯별)
    const assignedMembers = new Set<string>()
    // 오늘 이미 배정된 멤버 (1부/2부 중복 체크용)
    const assignedToday = new Set<string>()

    const recommendations: SlotRecommendation[] = []
    const warnings: string[] = []

    // 각 슬롯에 대해 순차적으로 최적 후보 선택
    for (const slot of SLOT_ORDER) {
        const { role } = slot

        // 후보자 필터링
        let candidates = availableMembers.filter(name => {
            // 이미 배정된 멤버 제외
            if (assignedMembers.has(name)) return false

            // SW 역할은 자격자만
            if (role === 'SW' && !context.isSWQualified(name)) return false

            // 3주 연속 체크 (단, 인원 부족 시 예외)
            const consecutive = context.getConsecutiveCount(name, role)
            if (consecutive >= 2) {
                // 다른 후보가 있으면 제외, 없으면 포함
                const otherCandidates = availableMembers.filter(n =>
                    n !== name &&
                    !assignedMembers.has(n) &&
                    (role !== 'SW' || context.isSWQualified(n)) &&
                    context.getConsecutiveCount(n, role) < 2
                )
                if (otherCandidates.length > 0) return false
            }

            return true
        })

        // 후보자 점수 계산 및 정렬
        const scored = candidates
            .map(name => calculateCandidateScore(name, slot, context, assignedToday))
            .sort((a, b) => b.score - a.score)

        const recommended = scored[0] || null
        const alternatives = scored.slice(1, 6) // 최대 5순위까지

        if (recommended) {
            assignedMembers.add(recommended.name)
            assignedToday.add(recommended.name)
        } else {
            warnings.push(`${slot.part === 'part1' ? '1부' : '2부'} ${role}${slot.index !== undefined ? ` #${slot.index + 1}` : ''}: 후보 없음`)
        }

        recommendations.push({
            slot,
            recommended,
            alternatives
        })
    }

    return {
        slots: recommendations,
        summary: {
            filledCount: recommendations.filter(r => r.recommended !== null).length,
            totalSlots: SLOT_ORDER.length,
            warnings
        }
    }
}

/**
 * 특정 슬롯에 대한 모든 후보자 점수 조회 (UI용)
 */
export function getSlotCandidates(
    app: AppData,
    slot: SlotId,
    absentees: string[] = [],
    alreadyAssigned: string[] = []
): CandidateScore[] {
    if (!app || !app.members) return []

    const context = new MemberContext(app)
    const absentSet = new Set(absentees)
    const assignedSet = new Set(alreadyAssigned)
    const assignedToday = new Set(alreadyAssigned)

    const candidates = context.getActiveMembers()
        .filter(m => !absentSet.has(m.name))
        .filter(m => !assignedSet.has(m.name))
        .filter(m => {
            // SW 역할은 자격자만
            if (slot.role === 'SW' && !context.isSWQualified(m.name)) return false
            return true
        })

    return candidates
        .map(m => calculateCandidateScore(m.name, slot, context, assignedToday))
        .sort((a, b) => b.score - a.score)
}

// ─────────────────────────────────────────────────────────────────────────────
// Draft Evaluation (Real-time Score)
// ─────────────────────────────────────────────────────────────────────────────

export type DraftSlotScore = {
    slot: SlotId
    assignedName: string | null
    score: number | null // null if empty
    maxPossibleScore: number
    optimalName: string | null
    isOptimal: boolean
    feedback: string
}

export type DraftEvaluation = {
    overallScore: number // 0-100
    level: 'excellent' | 'good' | 'fair' | 'poor'
    filledSlots: number
    totalSlots: number
    slotScores: DraftSlotScore[]
    summary: string
}

/**
 * 현재 드래프트 배정의 최적성을 실시간으로 평가
 * @param app 기존 데이터
 * @param draft 현재 드래프트 (part1, part2)
 * @param absentees 이번 주 불참자
 */
export function evaluateDraftScore(
    app: AppData,
    draft: { part1: PartAssignment; part2: PartAssignment },
    absentees: string[] = []
): DraftEvaluation {
    if (!app || !app.members || !app.weeks) {
        return {
            overallScore: 0,
            level: 'poor',
            filledSlots: 0,
            totalSlots: 12,
            slotScores: [],
            summary: '데이터 없음'
        }
    }

    const context = new MemberContext(app)
    const absentSet = new Set(absentees)

    // 현재 드래프트에서 배정된 멤버들 추출
    const getDraftValue = (part: PartKey, role: RoleKey, index?: 0 | 1): string | null => {
        const p = draft[part]
        if (role === '사이드') {
            const val = p['사이드'][index ?? 0]
            return val && val.trim() !== '' ? val : null
        }
        const val = p[role] as string
        return val && val.trim() !== '' ? val : null
    }

    // 오늘 배정된 멤버 추적 (중복 체크용)
    const assignedToday = new Set<string>()

    const slotScores: DraftSlotScore[] = []
    let totalScore = 0
    let totalMaxScore = 0
    let filledSlots = 0

    // 각 슬롯 평가
    for (const slot of SLOT_ORDER) {
        const assignedName = getDraftValue(slot.part, slot.role, slot.index)

        // 해당 슬롯의 모든 후보자 점수 계산
        const candidates = context.getActiveMembers()
            .filter(m => !absentSet.has(m.name))
            .filter(m => {
                if (slot.role === 'SW' && !context.isSWQualified(m.name)) return false
                return true
            })
            .map(m => calculateCandidateScore(m.name, slot, context, assignedToday))
            .sort((a, b) => b.score - a.score)

        const optimalCandidate = candidates[0] || null
        const maxPossibleScore = optimalCandidate?.score || 0

        let slotScore: number | null = null
        let isOptimal = false
        let feedback = ''

        if (assignedName) {
            filledSlots++
            assignedToday.add(assignedName)

            // 배정된 멤버의 점수 계산
            const assignedScore = calculateCandidateScore(
                assignedName,
                slot,
                context,
                new Set([...assignedToday].filter(n => n !== assignedName))
            )
            slotScore = assignedScore.score

            // 최적 여부 판단 (최적 후보와 30점 이내 차이면 OK)
            isOptimal = optimalCandidate?.name === assignedName ||
                (maxPossibleScore - slotScore) <= 30

            if (isOptimal) {
                feedback = '✓ 좋은 선택'
            } else if (slotScore < 0) {
                feedback = '⚠️ 비추천 배정'
            } else {
                const diff = maxPossibleScore - slotScore
                feedback = `△ ${optimalCandidate?.displayName || '?'} 추천 (+${diff}점)`
            }

            totalScore += Math.max(0, slotScore)
            totalMaxScore += maxPossibleScore
        } else {
            feedback = '미배정'
            totalMaxScore += maxPossibleScore
        }

        slotScores.push({
            slot,
            assignedName,
            score: slotScore,
            maxPossibleScore,
            optimalName: optimalCandidate?.name || null,
            isOptimal,
            feedback
        })
    }

    // 전체 점수 계산 (0-100 스케일)
    const overallScore = totalMaxScore > 0
        ? Math.round((totalScore / totalMaxScore) * 100)
        : 0

    // 등급 결정
    let level: DraftEvaluation['level']
    if (overallScore >= 85) level = 'excellent'
    else if (overallScore >= 70) level = 'good'
    else if (overallScore >= 55) level = 'fair'
    else level = 'poor'

    // 요약 메시지
    const optimalCount = slotScores.filter(s => s.isOptimal && s.assignedName).length
    let summary: string
    if (filledSlots === 0) {
        summary = '배정을 시작하세요'
    } else if (overallScore >= 85) {
        summary = `${optimalCount}/${filledSlots} 최적 배정`
    } else if (overallScore >= 70) {
        summary = '양호한 배정입니다'
    } else {
        const suboptimalSlots = slotScores.filter(s => !s.isOptimal && s.assignedName)
        if (suboptimalSlots.length > 0) {
            summary = `${suboptimalSlots.length}개 슬롯 개선 가능`
        } else {
            summary = '배정을 검토해주세요'
        }
    }

    return {
        overallScore,
        level,
        filledSlots,
        totalSlots: SLOT_ORDER.length,
        slotScores,
        summary
    }
}

