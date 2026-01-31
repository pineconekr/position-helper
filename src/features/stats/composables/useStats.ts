import { computed } from 'vue'
import { useAssignmentStore } from '@/stores/assignment'
import { RoleKeys } from '@/shared/types'

export const useStats = () => {
    const store = useAssignmentStore()

    const processedData = computed(() => {
        const totalCounts: Record<string, number> = {}
        const roleCounts: Record<string, Record<string, number>> = {}

        // Initialize counts for all active members
        store.app.members.forEach(m => {
            // We track even inactive members if they have history, 
            // but let's start with all current members in the list
            totalCounts[m.name] = 0
            roleCounts[m.name] = {
                'SW': 0, '자막': 0, '고정': 0, '사이드': 0, '스케치': 0
            }
        })

        const weeks = Object.values(store.app.weeks)

        weeks.forEach(week => {
            (['part1', 'part2'] as const).forEach(partKey => {
                const assignment = week[partKey]

                RoleKeys.forEach(role => {
                    if (role === '사이드') {
                        assignment.사이드.forEach(name => {
                            if (name && name.trim() !== '') {
                                // Initialize if member not in list (e.g. deleted member)
                                if (totalCounts[name] === undefined) {
                                    totalCounts[name] = 0
                                    roleCounts[name] = { 'SW': 0, '자막': 0, '고정': 0, '사이드': 0, '스케치': 0 }
                                }
                                totalCounts[name]++
                                roleCounts[name]['사이드']++
                            }
                        })
                    } else {
                        const name = assignment[role] as string
                        if (name && name.trim() !== '') {
                            if (totalCounts[name] === undefined) {
                                totalCounts[name] = 0
                                roleCounts[name] = { 'SW': 0, '자막': 0, '고정': 0, '사이드': 0, '스케치': 0 }
                            }
                            totalCounts[name]++
                            roleCounts[name][role]++
                        }
                    }
                })
            })
        })

        // Transform for ECharts
        // 1. Workload Ranking
        const workloadRanking = Object.entries(totalCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)

        // 2. Role Breakdown per Member (Stacked Bar Chart friendly)
        // We need arrays for each role series
        const topMembers = workloadRanking.slice(0, 15).map(i => i.name) // Top 15 active

        const seriesByRole = RoleKeys.map(role => {
            return {
                name: role,
                type: 'bar',
                stack: 'total',
                emphasis: { focus: 'series' },
                data: topMembers.map(name => roleCounts[name] ? roleCounts[name][role] : 0)
            }
        })

        return {
            workloadRanking,
            roleBreakdown: {
                categories: topMembers,
                series: seriesByRole
            }
        }
    })

    return {
        stats: processedData,
        refresh: store.recalcWarnings // generic refresh if needed
    }
}
