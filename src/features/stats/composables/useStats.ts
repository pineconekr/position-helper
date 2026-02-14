import { computed } from 'vue'
import { useAssignmentStore } from '@/stores/assignment'
import { RoleKeys, type PartAssignment } from '@/shared/types'

// --- Helper Functions for Statistics ---
function getPercentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0
    if (arr.length === 1) return arr[0]
    const index = (arr.length - 1) * p
    const lower = Math.floor(index)
    const upper = Math.ceil(index)
    const weight = index - lower
    return arr[lower] * (1 - weight) + arr[upper] * weight
}

function calculateMean(arr: number[]): number {
    if (arr.length === 0) return 0
    return arr.reduce((a, b) => a + b, 0) / arr.length
}

function calculateStdDev(arr: number[], mean: number): number {
    if (arr.length <= 1) return 0
    const variance = arr.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / arr.length
    return Math.sqrt(variance)
}

function createRoleCounter(): Record<string, number> {
    return {
        SW: 0,
        자막: 0,
        고정: 0,
        사이드: 0,
        스케치: 0
    }
}

export const useStats = () => {

    const store = useAssignmentStore()

    const processedData = computed(() => {
        const totalCounts: Record<string, number> = {}
        const roleCounts: Record<string, Record<string, number>> = {}
        const absenceCounts: Record<string, number> = {}

        // Generation analysis
        const genStats: Record<number, { count: number, totalAssignments: number, totalAbsences: number }> = {}

        // 이름으로 기수 조회용 Map (한 번의 순회로 초기화와 동시에 구축)
        const memberGenMap = new Map<string, number | null>()

        // Initialize counts for all active members (한 번의 순회로 모든 초기화 수행)
        store.app.members.forEach(m => {
            totalCounts[m.name] = 0
            roleCounts[m.name] = {
                'SW': 0, '자막': 0, '고정': 0, '사이드': 0, '스케치': 0
            }
            absenceCounts[m.name] = 0

            // generation 필드 직접 사용 (Mothership에서 정규화됨)
            const gen = m.generation
            memberGenMap.set(m.name, gen)
            if (gen) {
                if (!genStats[gen]) genStats[gen] = { count: 0, totalAssignments: 0, totalAbsences: 0 }
                genStats[gen].count++
            }
        })

        const getGeneration = (name: string): number | null => memberGenMap.get(name) ?? null
        const ensureMemberCounters = (name: string) => {
            if (totalCounts[name] === undefined) totalCounts[name] = 0
            if (roleCounts[name] === undefined) roleCounts[name] = createRoleCounter()
            if (absenceCounts[name] === undefined) absenceCounts[name] = 0
        }

        const weeklyTrend: { date: string, absenceCount: number }[] = []
        const weeklyFairness: { date: string; mean: number; cv: number; absenceCount: number }[] = []
        const sortedWeeks = Object.entries(store.app.weeks).sort((a, b) => a[0].localeCompare(b[0]))

        // Process Weeks
        sortedWeeks.forEach(([date, week]) => {
            const memberCountsInWeek: Record<string, number> = {}
            const addWeekCount = (name: string) => {
                const normalized = name.trim()
                if (!normalized) return
                memberCountsInWeek[normalized] = (memberCountsInWeek[normalized] || 0) + 1
            }
            const addAssignment = (name: string, role: typeof RoleKeys[number]) => {
                const normalized = name.trim()
                if (!normalized) return

                ensureMemberCounters(normalized)
                totalCounts[normalized]++
                roleCounts[normalized][role]++
                addWeekCount(normalized)

                const gen = getGeneration(normalized)
                if (gen && genStats[gen]) {
                    genStats[gen].totalAssignments++
                }
            }

            // Absences
            const weekAbsences = week.absences || []
            weeklyTrend.push({ date, absenceCount: weekAbsences.length })

            weekAbsences.forEach(ab => {
                const normalized = ab.name?.trim()
                if (normalized) {
                    ensureMemberCounters(normalized)
                    absenceCounts[normalized]++

                    const gen = getGeneration(normalized)
                    if (gen && genStats[gen]) {
                        genStats[gen].totalAbsences++
                    }
                }
            })

            ; (['part1', 'part2'] as const).forEach(partKey => {
                const assignment: PartAssignment = week[partKey]
                RoleKeys.forEach(role => {
                    if (role === '사이드') {
                        assignment.사이드.forEach(name => addAssignment(name, '사이드'))
                    } else {
                        addAssignment(assignment[role], role)
                    }
                })
            })

            const values = Object.values(memberCountsInWeek)
            if (values.length === 0) {
                weeklyFairness.push({ date, mean: 0, cv: 0, absenceCount: weekAbsences.length })
                return
            }

            const mean = calculateMean(values)
            const stdDev = calculateStdDev(values, mean)
            const cv = mean > 0 ? stdDev / mean : 0
            weeklyFairness.push({
                date,
                mean,
                cv,
                absenceCount: weekAbsences.length
            })
        })

        // Transform for ECharts
        // 1. Workload Ranking (All active members sorted)
        const workloadRanking = Object.entries(totalCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)

        // 2. Role Breakdown per Member
        const allMembers = workloadRanking.map(i => i.name)
        const seriesByRole = RoleKeys.map(role => {
            return {
                name: role,
                type: 'bar',
                stack: 'total',
                emphasis: { focus: 'series' },
                data: allMembers.map(name => roleCounts[name] ? roleCounts[name][role] : 0)
            }
        })

        // 3. Absence Statistics
        const absenceRanking = Object.entries(absenceCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .filter(i => i.value > 0) // Show only those who have absences

        // 4. Generation Analysis
        const generationAnalysis = Object.entries(genStats)
            .map(([gen, stat]) => ({
                generation: Number(gen),
                avgAssignment: stat.count > 0 ? Number((stat.totalAssignments / stat.count).toFixed(1)) : 0,
                avgAbsence: stat.count > 0 ? Number((stat.totalAbsences / stat.count).toFixed(1)) : 0,
                memberCount: stat.count
            }))
            .sort((a, b) => a.generation - b.generation)

        // 5. Absence Deviation with IQR Analysis
        const absenceEntries = Object.entries(absenceCounts)
            .filter(([name]) => name.trim() !== '')
            .map(([name, value]) => ({ name, value }))

        const absenceValues = absenceEntries.map(e => e.value).sort((a, b) => a - b)
        const median = getPercentile(absenceValues, 0.5)
        const q1 = getPercentile(absenceValues, 0.25)
        const q3 = getPercentile(absenceValues, 0.75)
        const iqr = q3 - q1
        const safeIqr = iqr === 0 ? 1 : iqr
        const sortedAbsenceEntries = [...absenceEntries]
            .sort((a, b) => (b.value - a.value) || a.name.localeCompare(b.name, 'ko'))

        const absenceDeviation = {
            names: sortedAbsenceEntries.map(e => e.name),
            normalized: sortedAbsenceEntries.map(e => (e.value - median) / safeIqr),
            counts: sortedAbsenceEntries.map(e => e.value),
            stats: { median, q1, q3, iqr: safeIqr, hasVariation: iqr !== 0 }
        }

        // 이름-기수 매핑 (Object 형태로 반환)
        const memberGenerations: Record<string, number | null> = {}
        memberGenMap.forEach((gen, name) => {
            memberGenerations[name] = gen
        })

        return {
            workloadRanking,
            roleCounts,
            roleBreakdown: { categories: allMembers, series: seriesByRole },
            absenceRanking,
            weeklyTrend,
            generationAnalysis,
            absenceDeviation,
            weeklyFairness,
            memberGenerations // 툴팁에서 기수 표시용
        }
    })

    return {
        stats: processedData,
        refresh: store.recalcWarnings
    }
}
