<script setup lang="ts">
import { computed } from 'vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import BaseChart from '@/shared/components/charts/BaseChart.vue'
import { useAssignmentStore } from '@/stores/assignment'
import { useThemeStore } from '@/stores/theme'
import { RoleKeys, type RoleKey } from '@/shared/types'

const store = useAssignmentStore()
const themeStore = useThemeStore()

// 출석 대비 역할 비율 계산 (old_stats_view.tsx의 memberRoleHeatmap 로직 이식)
const memberRoleHeatmap = computed(() => {
    type MemberStats = { attendance: number; roleWeeks: Record<RoleKey, number> }
    const statsMap = new Map<string, MemberStats>()
    
    const createRoleWeeks = (): Record<RoleKey, number> => 
        RoleKeys.reduce((acc, role) => { acc[role] = 0; return acc }, {} as Record<RoleKey, number>)
    
    const ensureStats = (name: string): MemberStats => {
        let stats = statsMap.get(name)
        if (!stats) {
            stats = { attendance: 0, roleWeeks: createRoleWeeks() }
            statsMap.set(name, stats)
        }
        return stats
    }
    
    // 주차별 배정 데이터 수집 (순서 무관하게 집계)
    Object.entries(store.app.weeks)
        .forEach(([, week]) => {
            const weeklyRoles = new Map<string, Set<RoleKey>>()
            
            const addAssignment = (entry: unknown, role: RoleKey) => {
                if (!entry) return
                if (Array.isArray(entry)) {
                    entry.forEach(value => addAssignment(value, role))
                    return
                }
                if (typeof entry !== 'string' || !entry.trim()) return
                const name = entry.trim()
                ensureStats(name)
                let set = weeklyRoles.get(name)
                if (!set) {
                    set = new Set<RoleKey>()
                    weeklyRoles.set(name, set)
                }
                set.add(role)
            }
            
            const addPart = (part: any) => {
                if (!part) return
                RoleKeys.forEach(role => addAssignment(part[role], role))
            }
            
            addPart(week.part1)
            addPart(week.part2)
            
            // 결석자도 추적
            week.absences?.forEach((absence: any) => {
                if (absence?.name && typeof absence.name === 'string' && absence.name.trim()) {
                    ensureStats(absence.name.trim())
                }
            })
            
            // 주차별 출석 및 역할 카운트
            weeklyRoles.forEach((rolesSet, name) => {
                const stats = ensureStats(name)
                stats.attendance += 1
                rolesSet.forEach(role => { stats.roleWeeks[role] += 1 })
            })
        })
    
    // 활성 멤버 초기화
    store.app.members.forEach(member => {
        if (member.name && typeof member.name === 'string' && member.name.trim()) {
            ensureStats(member.name.trim())
        }
    })
    
    // 데이터 변환
    const rows = Array.from(statsMap.entries())
        .map(([name, stats]) => {
            const ratios = RoleKeys.map(role => {
                if (stats.attendance === 0) return null
                const ratio = stats.roleWeeks[role] / stats.attendance
                return Number.isFinite(ratio) ? ratio : null
            })
            const custom = RoleKeys.map(role => [stats.roleWeeks[role], stats.attendance] as [number, number])
            return { name, stats, ratios, custom }
        })
        .filter(entry => entry.stats.attendance > 0)
    
    rows.sort((a, b) => a.name.localeCompare(b.name, 'ko'))
    
    return {
        roles: RoleKeys,
        members: rows.map(row => row.name),
        ratios: rows.map(row => row.ratios),
        customData: rows.map(row => row.custom),
        hasData: rows.length > 0
    }
})

const chartOption = computed(() => {
    const isDark = themeStore.effectiveTheme === 'dark'
    const textColor = isDark ? '#94a3b8' : '#64748b'
    
    const heatmapData = memberRoleHeatmap.value
    if (!heatmapData.hasData) return {}
    
    // ECharts heatmap data: [[xIndex, yIndex, value], ...]
    const data: [number, number, number | null, number, number][] = []
    
    heatmapData.members.forEach((_, yIndex) => {
        heatmapData.roles.forEach((_, xIndex) => {
            const ratio = heatmapData.ratios[yIndex][xIndex]
            const [roleCount, attendance] = heatmapData.customData[yIndex][xIndex]
            data.push([xIndex, yIndex, ratio, roleCount, attendance])
        })
    })
    
    return {
        tooltip: {
            position: 'top',
            confine: true,
            formatter: (params: { value: [number, number, number | null, number, number] }) => {
                const [xIdx, yIdx, ratio, roleCount, attendance] = params.value
                const role = heatmapData.roles[xIdx]
                const name = heatmapData.members[yIdx]
                const pct = ratio !== null ? (ratio * 100).toFixed(0) : '-'
                return `<strong>${name}</strong> · ${role}<br/>비율: <b>${pct}%</b><br/>배정: ${roleCount}회 / 출석: ${attendance}주`
            }
        },
        grid: {
            top: 30,
            bottom: 60,
            left: 100,
            right: 30,
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: heatmapData.roles,
            splitArea: { show: true },
            axisLabel: { color: textColor, interval: 0 },
            axisLine: { lineStyle: { color: isDark ? '#334155' : '#e2e8f0' } }
        },
        yAxis: {
            type: 'category',
            data: heatmapData.members,
            splitArea: { show: true },
            axisLabel: { 
                color: textColor,
                width: 90,
                overflow: 'truncate',
                interval: 0
            },
            axisLine: { lineStyle: { color: isDark ? '#334155' : '#e2e8f0' } }
        },
        visualMap: {
            min: 0,
            max: 1,
            dimension: 2, // ratio 값이 있는 인덱스를 명시적으로 지정 (data: [x, y, ratio, ...])
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            bottom: 0,
            text: ['100%', '0%'],
            // YlGnBu - 현업 표준 Sequential 팔레트 (노랑 → 초록 → 파랑)
            inRange: {
                color: isDark 
                    ? ['#1a1c2c', '#2d4a3e', '#1e6091', '#168aad', '#76c893']
                    : ['#ffffd9', '#c7e9b4', '#7fcdbb', '#41b6c4', '#225ea8']
            },
            textStyle: { color: textColor }
        },
        series: [{
            name: 'Role Distribution',
            type: 'heatmap',
            data: data, // 전체 데이터 전달 (customData 포함)
            label: {
                show: true,
                formatter: (params: { value: [number, number, number | null, number, number] }) => {
                    const ratio = params.value[2]
                    return ratio !== null ? `${(ratio * 100).toFixed(0)}%` : '-'
                },
                color: isDark ? '#fff' : '#1e293b',
                fontSize: 10
            },
            itemStyle: {
                borderColor: isDark ? '#0f172a' : '#fff',
                borderWidth: 1
            },
            emphasis: {
                itemStyle: {
                    shadowBlur: 10,
                    shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
            }
        }]
    }
})

const containerHeight = computed(() => {
    const count = memberRoleHeatmap.value.members.length
    return Math.max(400, count * 40 + 120) + 'px'
})
</script>

<template>
  <Card class="h-full">
    <CardHeader>
      <CardTitle class="text-base font-medium">팀원/역할 배정 비율 히트맵</CardTitle>
      <CardDescription>
        출석 횟수 대비 특정 역할을 얼마나 자주 맡았는지(비율) 시각화합니다.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div 
        v-if="memberRoleHeatmap.hasData"
        :style="{ height: containerHeight, width: '100%' }"
      >
        <BaseChart :options="chartOption" height="100%" />
      </div>
      <div 
        v-else 
        class="h-[300px] flex items-center justify-center text-[var(--color-label-tertiary)] text-sm"
      >
        데이터가 없습니다.
      </div>
    </CardContent>
  </Card>
</template>
