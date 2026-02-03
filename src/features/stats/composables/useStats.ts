import { computed } from 'vue'
import { useAssignmentStore } from '@/stores/assignment'
import { RoleKeys } from '@/shared/types'
import { extractCohort } from '@/shared/utils/assignment'

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

            // generation 필드 우선, 없으면 이름에서 추출
            const gen = m.generation ?? extractCohort(m.name)
            memberGenMap.set(m.name, gen)
            if (gen) {
                if (!genStats[gen]) genStats[gen] = { count: 0, totalAssignments: 0, totalAbsences: 0 }
                genStats[gen].count++
            }
        })

        const getGeneration = (name: string): number | null => memberGenMap.get(name) ?? extractCohort(name)

        const weeklyTrend: { date: string, absenceCount: number }[] = []

        // Process Weeks
        Object.entries(store.app.weeks).forEach(([date, week]) => {
            // Absences
            const weekAbsences = week.absences || []
            weeklyTrend.push({ date, absenceCount: weekAbsences.length })

            weekAbsences.forEach(ab => {
                if (ab.name && absenceCounts[ab.name] !== undefined) {
                    absenceCounts[ab.name]++

                    const gen = getGeneration(ab.name)
                    if (gen && genStats[gen]) {
                        genStats[gen].totalAbsences++
                    }
                }
            })

                // Assignments
                ; (['part1', 'part2'] as const).forEach(partKey => {
                    const assignment = week[partKey]
                    RoleKeys.forEach(role => {
                        if (role === '사이드') {
                            assignment.사이드.forEach(name => {
                                if (name && name.trim() !== '') {
                                    if (totalCounts[name] === undefined) { /* init */
                                        totalCounts[name] = 0
                                        roleCounts[name] = { 'SW': 0, '자막': 0, '고정': 0, '사이드': 0, '스케치': 0 }
                                    }
                                    totalCounts[name]++
                                    roleCounts[name]['사이드']++

                                    const gen = getGeneration(name)
                                    if (gen && genStats[gen]) {
                                        genStats[gen].totalAssignments++
                                    }
                                }
                            })
                        } else {
                            const name = assignment[role] as string
                            if (name && name.trim() !== '') {
                                if (totalCounts[name] === undefined) { /* init */
                                    totalCounts[name] = 0
                                    roleCounts[name] = { 'SW': 0, '자막': 0, '고정': 0, '사이드': 0, '스케치': 0 }
                                }
                                totalCounts[name]++
                                roleCounts[name][role]++

                                const gen = getGeneration(name)
                                if (gen && genStats[gen]) {
                                    genStats[gen].totalAssignments++
                                }
                            }
                        }
                    })
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

        const absenceDeviation = {
            names: absenceEntries.sort((a, b) => (b.value - a.value) || a.name.localeCompare(b.name, 'ko')).map(e => e.name),
            normalized: absenceEntries.map(e => (e.value - median) / safeIqr),
            counts: absenceEntries.map(e => e.value),
            stats: { median, q1, q3, iqr: safeIqr, hasVariation: iqr !== 0 }
        }

        // 6. Weekly Fairness (CV) & Absence Trend
        const weeklyFairness = Object.entries(store.app.weeks)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([date, week]) => {
                const counts: number[] = []
                const collect = (part: any) => {
                    if (!part) return
                    RoleKeys.forEach(role => {
                        const val = part[role]
                        if (Array.isArray(val)) val.forEach(v => v && counts.push(1))
                        else if (val) counts.push(1)
                    })
                }
                collect(week.part1)
                collect(week.part2)

                // Group by member for this week to calc distribution fairness? 
                // Wait, CV is usually for "distribution of assignments among members" in that week?
                // Or is it "variation of assignment counts across members"?
                // The old code aggregated counts per member for that week.
                const memberCountsInWeek: Record<string, number> = {}
                const pushCount = (name: string) => {
                    if (!name) return
                    memberCountsInWeek[name] = (memberCountsInWeek[name] || 0) + 1
                }
                const scanPart = (part: any) => {
                    if (!part) return
                    RoleKeys.forEach(role => {
                        const val = part[role]
                        if (role === '사이드') {
                            (val as string[]).forEach(pushCount)
                        } else {
                            pushCount(val as string)
                        }
                    })
                }
                scanPart(week.part1)
                scanPart(week.part2)

                const values = Object.values(memberCountsInWeek)
                // If no assignments, avoid NaN
                if (values.length === 0) return { date, mean: 0, cv: 0, absenceCount: (week.absences?.length || 0) }

                const mean = calculateMean(values)
                const stdDev = calculateStdDev(values, mean)
                const cv = mean > 0 ? stdDev / mean : 0

                return {
                    date,
                    mean,
                    cv,
                    absenceCount: (week.absences?.length || 0)
                }
            })

        return {
            workloadRanking,
            roleCounts,
            roleBreakdown: { categories: allMembers, series: seriesByRole },
            absenceRanking,
            weeklyTrend: weeklyTrend.sort((a, b) => a.date.localeCompare(b.date)),
            generationAnalysis,
            absenceDeviation, // New
            weeklyFairness // New
        }
    })

    return {
        stats: processedData,
        refresh: store.recalcWarnings
    }
}
