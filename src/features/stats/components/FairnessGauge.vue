<script setup lang="ts">
import { computed } from 'vue'
import { useAssignmentStore } from '@/stores/assignment'
import { RoleKeys } from '@/shared/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

const store = useAssignmentStore()

// 공정성 점수 계산
const fairnessScore = computed(() => {
    const members = store.app.members.filter(m => m.isActive)
    const weeks = Object.values(store.app.weeks)
    
    if (members.length === 0 || weeks.length === 0) {
        return { total: 0, details: [] }
    }

    // 1. 배정 횟수 수집
    const assignmentCounts: Record<string, number> = {}
    const roleDiversity: Record<string, Set<string>> = {}
    
    members.forEach(m => {
        assignmentCounts[m.name] = 0
        roleDiversity[m.name] = new Set()
    })

    weeks.forEach(week => {
        (['part1', 'part2'] as const).forEach(partKey => {
            const assignment = week[partKey]
            RoleKeys.forEach(role => {
                if (role === '사이드') {
                    assignment.사이드.forEach(name => {
                        if (name && assignmentCounts[name] !== undefined) {
                            assignmentCounts[name]++
                            roleDiversity[name]?.add(role)
                        }
                    })
                } else {
                    const name = assignment[role] as string
                    if (name && assignmentCounts[name] !== undefined) {
                        assignmentCounts[name]++
                        roleDiversity[name]?.add(role)
                    }
                }
            })
        })
    })

    const counts = Object.values(assignmentCounts)
    if (counts.length === 0) return { total: 0, details: [] }

    // 2. 배정 기회 균등 점수 (표준편차 기반)
    const mean = counts.reduce((a, b) => a + b, 0) / counts.length
    const variance = counts.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / counts.length
    const stdDev = Math.sqrt(variance)
    // 표준편차가 0이면 완벽한 균등, 평균의 50%까지 허용
    const maxAcceptableStd = mean * 0.5 || 1
    const equalityScore = Math.max(0, Math.min(100, 100 - (stdDev / maxAcceptableStd) * 100))

    // 3. 역할 다양성 점수 (평균 역할 수)
    const diversityScores = Object.values(roleDiversity).map(set => set.size)
    const avgDiversity = diversityScores.reduce((a, b) => a + b, 0) / diversityScores.length
    // 5가지 역할 중 최소 2가지 이상이면 좋음
    const diversityScore = Math.min(100, (avgDiversity / 3) * 100)

    // 4. 연속 배정 경고 점수 (경고가 적을수록 좋음)
    const warningCount = store.warnings.filter(w => w.level === 'error').length
    const warningScore = Math.max(0, 100 - warningCount * 20)

    // 5. 총점 계산 (가중 평균)
    const total = Math.round(
        equalityScore * 0.4 +
        diversityScore * 0.3 +
        warningScore * 0.3
    )

    return {
        total: Math.min(100, Math.max(0, total)),
        details: [
            { label: '배정 균등', value: Math.round(equalityScore), description: '팀원 간 배정 횟수 편차' },
            { label: '역할 다양성', value: Math.round(diversityScore), description: '다양한 역할 경험' },
            { label: '연속 배정', value: Math.round(warningScore), description: '연속 배정 경고 수' }
        ]
    }
})

// 점수에 따른 색상
const scoreColor = computed(() => {
    const score = fairnessScore.value.total
    if (score >= 80) return 'var(--color-success)'
    if (score >= 60) return 'var(--color-warning)'
    return 'var(--color-destructive)'
})

// 점수에 따른 평가
const scoreLabel = computed(() => {
    const score = fairnessScore.value.total
    if (score >= 80) return '우수'
    if (score >= 60) return '보통'
    if (score >= 40) return '개선 필요'
    return '주의'
})
</script>

<template>
  <Card class="bg-[var(--color-surface)] border-[var(--color-border)]">
    <CardHeader class="pb-2">
      <CardTitle class="text-base font-medium">공정성 지표</CardTitle>
      <CardDescription class="text-xs">배정 균형 상태를 종합 평가합니다</CardDescription>
    </CardHeader>
    <CardContent>
      <!-- 게이지 원형 -->
      <div class="flex flex-col items-center py-4">
        <div class="relative w-36 h-36">
          <!-- 배경 원 -->
          <svg class="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="var(--color-border)"
              stroke-width="8"
            />
            <!-- 진행 원 -->
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              :stroke="scoreColor"
              stroke-width="8"
              stroke-linecap="round"
              :stroke-dasharray="`${fairnessScore.total * 2.64} 264`"
              class="transition-all duration-700 ease-out"
            />
          </svg>
          <!-- 중앙 점수 -->
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span 
              class="text-3xl font-bold tabular-nums"
              :style="{ color: scoreColor }"
            >
              {{ fairnessScore.total }}
            </span>
            <span class="text-xs text-[var(--color-label-tertiary)]">{{ scoreLabel }}</span>
          </div>
        </div>
      </div>

      <!-- 세부 지표 -->
      <div class="mt-4 space-y-3">
        <div 
          v-for="detail in fairnessScore.details" 
          :key="detail.label"
          class="flex items-center justify-between"
        >
          <div class="flex flex-col">
            <span class="text-sm text-[var(--color-label-primary)]">{{ detail.label }}</span>
            <span class="text-xs text-[var(--color-label-quaternary)]">{{ detail.description }}</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-16 h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden">
              <div 
                class="h-full rounded-full transition-all duration-500"
                :style="{ 
                  width: `${detail.value}%`,
                  backgroundColor: detail.value >= 70 ? 'var(--color-success)' : detail.value >= 50 ? 'var(--color-warning)' : 'var(--color-destructive)'
                }"
              />
            </div>
            <span class="text-xs font-medium tabular-nums w-8 text-right text-[var(--color-label-secondary)]">
              {{ detail.value }}
            </span>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
