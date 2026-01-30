<script setup lang="ts">
/**
 * AssignmentSummary.vue - Vue 3 버전
 * 이번 주 배정 현황 요약
 */
import { computed } from 'vue'
import { useAssignmentStore } from '@/stores/assignment'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Icon from '@/components/ui/Icon.vue'
import clsx from 'clsx'

const store = useAssignmentStore()

const draft = computed(() => store.currentDraft)
const app = computed(() => store.app)
const currentWeekDate = computed(() => store.currentWeekDate)

// 배정된 멤버 수 계산
const assignedCount = computed(() => {
  const assigned = new Set<string>()
  if (!draft.value) return 0
  
  const parts = [draft.value.part1, draft.value.part2]
  parts.forEach(p => {
    if (p.SW) assigned.add(p.SW)
    if (p['자막']) assigned.add(p['자막'])
    if (p['고정']) assigned.add(p['고정'])
    if (p['스케치']) assigned.add(p['스케치'])
    p['사이드'].forEach(n => { if (n) assigned.add(n) })
  })
  
  return assigned.size
})

// 불참자 수
const absentCount = computed(() => {
  return app.value.weeks[currentWeekDate.value]?.absences?.length ?? 0
})

// 총 슬롯 수
const totalSlots = 12 // (SW + 자막 + 고정 + 스케치 + 사이드×2) × 2부

// 채워진 슬롯 수
const filledSlots = computed(() => {
  let count = 0
  if (!draft.value) return 0
  
  const parts = [draft.value.part1, draft.value.part2]
  parts.forEach(p => {
    if (p.SW) count++
    if (p['자막']) count++
    if (p['고정']) count++
    if (p['스케치']) count++
    p['사이드'].forEach(n => { if (n) count++ })
  })
  
  return count
})

const progress = computed(() => Math.round((filledSlots.value / totalSlots) * 100))

// 날짜 포맷
const formattedDate = computed(() => {
  const date = new Date(currentWeekDate.value)
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}월 ${day}일`
})
</script>

<template>
  <Card>
    <CardContent class="p-4 space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Icon name="CalendarDaysIcon" :size="18" class="text-[var(--color-accent)]" />
        <h3 class="text-sm font-semibold text-[var(--color-label-primary)]">이번 주 배정 현황</h3>
      </div>
      <Badge variant="accent">{{ formattedDate }}</Badge>
    </div>

    <!-- Progress bar -->
    <div class="space-y-2">
      <div class="flex items-center justify-between text-xs">
        <span class="text-[var(--color-label-secondary)]">배정 진행률</span>
        <span class="font-medium text-[var(--color-label-primary)]">{{ filledSlots }}/{{ totalSlots }}</span>
      </div>
      <div class="h-2 bg-[var(--color-surface)] rounded-full overflow-hidden">
        <div 
          :class="clsx(
            'h-full transition-all duration-300 rounded-full',
            progress === 100 ? 'bg-[var(--color-success)]' : 'bg-[var(--color-accent)]'
          )"
          :style="{ width: `${progress}%` }"
        />
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-3 gap-2 text-center">
      <div class="p-2 rounded-[var(--radius-sm)] bg-[var(--color-surface)]">
        <div class="text-lg font-bold text-[var(--color-accent)]">{{ assignedCount }}</div>
        <div class="text-xs text-[var(--color-label-tertiary)]">배정된 팀원</div>
      </div>
      <div class="p-2 rounded-[var(--radius-sm)] bg-[var(--color-surface)]">
        <div class="text-lg font-bold text-[var(--color-success)]">{{ progress }}%</div>
        <div class="text-xs text-[var(--color-label-tertiary)]">완료율</div>
      </div>
      <div class="p-2 rounded-[var(--radius-sm)] bg-[var(--color-surface)]">
        <div class="text-lg font-bold text-[var(--color-danger)]">{{ absentCount }}</div>
        <div class="text-xs text-[var(--color-label-tertiary)]">불참자</div>
      </div>
    </div>
    </CardContent>
  </Card>
</template>
