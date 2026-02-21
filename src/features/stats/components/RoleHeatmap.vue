<script setup lang="ts">
import { computed } from 'vue'
import BaseAdvancedChart from '@/shared/components/charts/BaseAdvancedChart.vue'
import { useAssignmentStore } from '@/stores/assignment'
import { useThemeStore } from '@/stores/theme'
import { useStats } from '../composables/useStats'
import { RoleKeys, type Absence, type PartAssignment, type RoleKey } from '@/shared/types'
import { escapeHtml } from '@/shared/utils/text'
import { getChartSeriesPalette, getChartUiPalette, withAlpha } from '@/shared/utils/chartTheme'
import { getMemberGeneration } from '@/shared/utils/member-registry'

const store = useAssignmentStore()
const themeStore = useThemeStore()
const { stats } = useStats()

// 출석 대비 역할 비율 계산 (old_stats_view.tsx의 memberRoleHeatmap 로직 이식)
const memberRoleHeatmap = computed(() => {
    type MemberStats = { attendance: number; roleWeeks: Record<RoleKey, number> }
    const statsMap = new Map<string, MemberStats>()
    const generationMap = new Map(
        store.app.members
            .map(member => [member.name.trim(), getMemberGeneration(member)] as const)
            .filter(([name]) => Boolean(name))
    )
    const activeMemberSet = new Set(
        store.app.members
            .filter(member => member.active !== false)
            .map(member => member.name.trim())
            .filter(Boolean)
    )
    
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

    const isActiveMember = (name: string): boolean => activeMemberSet.has(name.trim())
    
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
                if (!isActiveMember(name)) return
                ensureStats(name)
                let set = weeklyRoles.get(name)
                if (!set) {
                    set = new Set<RoleKey>()
                    weeklyRoles.set(name, set)
                }
                set.add(role)
            }
            
            const addPart = (part: PartAssignment) => {
                if (!part) return
                RoleKeys.forEach(role => addAssignment(part[role], role))
            }
            
            addPart(week.part1)
            addPart(week.part2)
            
            // 결석자도 추적
            week.absences?.forEach((absence: Absence) => {
                if (absence?.name && typeof absence.name === 'string' && absence.name.trim()) {
                    const name = absence.name.trim()
                    if (!isActiveMember(name)) return
                    ensureStats(name)
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
        if (member.active !== false && member.name && typeof member.name === 'string' && member.name.trim()) {
            ensureStats(member.name.trim())
        }
    })
    
    // 데이터 변환
    const rows = Array.from(statsMap.entries())
        .map(([name, stats]) => {
            const generation = generationMap.get(name)
            const ratios = RoleKeys.map(role => {
                if (stats.attendance === 0) return null
                const ratio = stats.roleWeeks[role] / stats.attendance
                return Number.isFinite(ratio) ? ratio : null
            })
            const custom = RoleKeys.map(role => [stats.roleWeeks[role], stats.attendance] as [number, number])
            return { name, generation, stats, ratios, custom }
        })
        .filter(entry => entry.stats.attendance > 0)
    
    rows.sort((a, b) => {
        const aGen = a.generation ?? Number.MAX_SAFE_INTEGER
        const bGen = b.generation ?? Number.MAX_SAFE_INTEGER
        if (aGen !== bGen) return aGen - bGen
        return a.name.localeCompare(b.name, 'ko')
    })
    
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
    const ui = getChartUiPalette()
    const series = getChartSeriesPalette()
    const textColor = ui.text
    
    const heatmapData = memberRoleHeatmap.value
    if (!heatmapData.hasData) return {}
    const enableMemberZoom = heatmapData.members.length > 12
    const startPct = Math.max(0, 100 - Math.min(100, (12 / heatmapData.members.length) * 100))
    
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
            textStyle: { color: textColor, fontSize: 12 },
            formatter: (params: { value: [number, number, number | null, number, number] }) => {
                const [xIdx, yIdx, ratio, roleCount, attendance] = params.value
                const role = heatmapData.roles[xIdx]
                const name = heatmapData.members[yIdx]
                const gen = stats.value.memberGenerations[name]
                const genLabel = gen ? ` (${gen}기)` : ''
                const pct = ratio !== null ? (ratio * 100).toFixed(0) : '-'
                
                const safeName = escapeHtml(name)
                const safeRole = escapeHtml(role)
                return `<strong>${safeName}</strong>${genLabel} · ${safeRole}<br/>비율: <b>${pct}%</b><br/>배정: ${roleCount}회 / 출석: ${attendance}주`
            }
        },
        grid: {
            top: 40,
            bottom: 70,
            left: '15%',  // 비율 기반으로 균형 조정
            right: enableMemberZoom ? 34 : '5%',
            containLabel: false
        },
        dataZoom: enableMemberZoom
            ? [
                {
                    type: 'inside',
                    yAxisIndex: 0,
                    start: startPct,
                    end: 100,
                    filterMode: 'weakFilter'
                },
                {
                    type: 'slider',
                    yAxisIndex: 0,
                    start: startPct,
                    end: 100,
                    right: 0,
                    top: 40,
                    bottom: 70,
                    width: 12,
                    brushSelect: false,
                    borderColor: 'transparent',
                    backgroundColor: withAlpha(ui.text, isDark ? 0.2 : 0.08),
                    fillerColor: withAlpha(series.primary, isDark ? 0.32 : 0.18),
                    handleSize: 0
                }
            ]
            : undefined,
        xAxis: {
            type: 'category',
            data: heatmapData.roles,
            splitArea: { show: true },
            axisLabel: { color: textColor, interval: 0, fontSize: 12, fontWeight: 600 },
            axisLine: { lineStyle: { color: ui.border } }
        },
        yAxis: {
            type: 'category',
            data: heatmapData.members,
            splitArea: { show: true },
            axisLabel: { 
                color: textColor,
                fontSize: 12,
                overflow: 'truncate',
                interval: 0
            },
            axisLine: { lineStyle: { color: ui.border } }
        },
        visualMap: {
            min: 0,
            max: 1,
            dimension: 2, // ratio 값이 있는 인덱스를 명시적으로 지정 (data: [x, y, ratio, ...])
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            bottom: 10,
            itemWidth: 12,
            itemHeight: 120,
            text: ['100%', '0%'],
            // YlGnBu - 현업 표준 Sequential 팔레트 (노랑 → 초록 → 파랑)
            inRange: {
                color: isDark 
                    ? [
                        withAlpha(ui.surface, 0.45),
                        withAlpha(series.success, 0.4),
                        withAlpha(series.primary, 0.42),
                        withAlpha(series.info, 0.62),
                        withAlpha(series.accent, 0.9),
                      ]
                    : [
                        withAlpha(series.warning, 0.08),
                        withAlpha(series.success, 0.2),
                        withAlpha(series.info, 0.32),
                        withAlpha(series.primary, 0.45),
                        withAlpha(series.accent, 0.65),
                      ]
            },
            textStyle: { color: textColor, fontSize: 12 }
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
                color: ui.textStrong,
                fontSize: 12
            },
            itemStyle: {
                borderColor: ui.grid,
                borderWidth: 1
            },
            emphasis: {
                itemStyle: {
                    shadowBlur: 10,
                    shadowColor: withAlpha(ui.textStrong, 0.3)
                }
            }
        }]
    }
})

const containerHeight = computed(() => {
    const count = memberRoleHeatmap.value.members.length
    return Math.max(340, count * 33 + 90) + 'px'
})
</script>

<template>
  <div class="h-full px-0.5 py-0.5">
    <div class="pb-1">
      <h4 class="chart-title">팀원/역할 배정 비율 히트맵</h4>
      <p class="chart-subtitle mt-0.5">
        출석 횟수 대비 특정 역할을 얼마나 자주 맡았는지(비율) 시각화합니다.
      </p>
    </div>
    <div>
      <div 
        v-if="memberRoleHeatmap.hasData"
        :style="{ height: `clamp(300px, 58vh, ${containerHeight})`, width: '100%' }"
      >
        <BaseAdvancedChart :options="chartOption" height="100%" />
      </div>
      <div 
        v-else 
        class="flex h-[280px] items-center justify-center text-sm text-[var(--color-label-tertiary)]"
        >
        데이터가 없습니다.
      </div>
    </div>
  </div>
</template>




