<script setup lang="ts">
import { computed } from 'vue'
import { Card, CardContent } from '@/components/ui/card'
import Icon from '@/components/ui/Icon.vue'
import { useStats } from '../composables/useStats'
import { useAssignmentStore } from '@/stores/assignment'
import type { PartAssignment } from '@/shared/types'
import { getChartSeriesPalette, withAlpha } from '@/shared/utils/chartTheme'

const { stats } = useStats()
const store = useAssignmentStore()

const kpiData = computed(() => {
    const series = getChartSeriesPalette()
    const totalMembers = store.app.members.filter(m => m.active).length
    
    // 평균 배정 횟수
    const totalAssignments = stats.value.workloadRanking.reduce((sum, item) => sum + item.value, 0)
    const avgWorkload = totalMembers > 0 ? (totalAssignments / totalMembers).toFixed(1) : '0'

    // 이번 주 (가장 최근 주차) 배정 인원
    const sortedWeeks = Object.keys(store.app.weeks).sort().reverse()
    const latestWeekKey = sortedWeeks[0]
    let thisWeekCount = 0
    if (latestWeekKey) {
        const w = store.app.weeks[latestWeekKey]
        const countPart = (p: PartAssignment) => {
            if (!p) return 0
            let c = 0
            if (p.SW) c++
            if (p.자막) c++
            if (p.고정) c++
            if (p.스케치) c++
            if (p.사이드) c += p.사이드.length
            return c
        }
        thisWeekCount = countPart(w.part1) + countPart(w.part2)
    }

    // 전체 평균 불참 횟수
    const totalAbsences = stats.value.absenceRanking.reduce((sum, item) => sum + item.value, 0)
    const avgAbsence = totalMembers > 0 ? (totalAbsences / totalMembers).toFixed(1) : '0'

    return [
        {
            label: '활동 팀원',
            value: totalMembers,
            unit: '명',
            icon: 'UserGroupIcon',
            iconColor: series.primary,
            iconBg: withAlpha(series.primary, 0.14),
            desc: '현재 활성 상태인 인원'
        },
        {
            label: '평균 배정',
            value: avgWorkload,
            unit: '회',
            icon: 'ChartBarIcon',
            iconColor: series.success,
            iconBg: withAlpha(series.success, 0.14),
            desc: '1인당 누적 배정 횟수'
        },
        {
            label: '이번 주 배정',
            value: thisWeekCount,
            unit: '명',
            icon: 'CalendarDaysIcon',
            iconColor: series.secondary,
            iconBg: withAlpha(series.secondary, 0.14),
            desc: `${latestWeekKey || '-'} 기준`
        },
        {
            label: '평균 불참',
            value: avgAbsence,
            unit: '회',
            icon: 'ExclamationCircleIcon',
            iconColor: series.warning,
            iconBg: withAlpha(series.warning, 0.14),
            desc: '1인당 누적 불참 횟수'
        }
    ]
})
</script>

<template>
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
    <Card v-for="(item, idx) in kpiData" :key="idx" class="border-border/50 shadow-sm hover:shadow-md transition-shadow">
        <CardContent class="p-6 flex items-start justify-between">
            <div class="space-y-1">
                <p class="text-sm font-medium text-muted-foreground">{{ item.label }}</p>
                <div class="flex items-baseline gap-1">
                    <span class="text-2xl font-bold tracking-tight">{{ item.value }}</span>
                    <span class="text-xs text-muted-foreground font-medium">{{ item.unit }}</span>
                </div>
                <p class="text-[10px] text-muted-foreground opacity-70">{{ item.desc }}</p>
            </div>
            <div class="rounded-xl p-2.5" :style="{ backgroundColor: item.iconBg, color: item.iconColor }">
                <Icon :name="item.icon" :size="20" />
            </div>
        </CardContent>
    </Card>
  </div>
</template>
