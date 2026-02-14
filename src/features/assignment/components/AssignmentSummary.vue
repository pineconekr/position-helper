<script setup lang="ts">
/**
 * AssignmentSummary.vue - 이번 주 배정 현황 (Compact 리디자인)
 */
import { computed } from 'vue'
import { useAssignmentStore } from '@/stores/assignment'
import { Card, CardContent } from '@/components/ui/card'
import Icon from '@/components/ui/Icon.vue'
import { ROLE_CONFIG } from '@/shared/constants/config'
import { formatKoreanDate } from '@/shared/utils/date'

const store = useAssignmentStore()

const draft = computed(() => store.currentDraft)
const app = computed(() => store.app)
const currentWeekDate = computed(() => store.currentWeekDate)

// 불참자 목록
const absences = computed(() => {
  return app.value.weeks[currentWeekDate.value]?.absences ?? []
})

// 총 활동 인원
const totalActiveMembers = computed(() => {
  return app.value.members.filter(m => m.active).length
})

// 가용 인원 (활동 인원 - 불참자)
const availableCount = computed(() => {
  return totalActiveMembers.value - absences.value.length
})

// 총 슬롯 수 (상수에서 가져옴)
const totalSlots = ROLE_CONFIG.TOTAL_SLOTS_PER_WEEK

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

// 날짜 포맷 (유틸리티 함수 사용)
const formattedDate = computed(() => formatKoreanDate(currentWeekDate.value))

const progressColor = computed(() => {
  if (progress.value === 100) return 'var(--color-success)'
  if (progress.value >= 50) return 'var(--color-accent)'
  return 'var(--color-warning)'
})

// 불참자 요약 텍스트
const absenceSummary = computed(() => {
  if (absences.value.length === 0) return null
  
  // 최대 2명까지 이름+사유 표시
  const maxShow = 2
  const shown = absences.value.slice(0, maxShow).map(a => {
    const reason = a.reason?.trim()
    return reason ? `${a.name}(${reason})` : a.name
  })
  
  const remaining = absences.value.length - maxShow
  if (remaining > 0) {
    return `${shown.join(', ')} 외 ${remaining}명`
  }
  return shown.join(', ')
})
</script>

<template>
  <Card class="overflow-hidden">
    <CardContent class="p-5">
      <!-- 메인 콘텐츠 -->
      <div class="space-y-4">
        <!-- 날짜 헤더 -->
        <div class="flex items-center gap-2.5">
          <div class="flex h-9 w-9 items-center justify-center rounded-xl shadow-sm" :style="{ background: `linear-gradient(135deg, var(--color-accent), color-mix(in srgb, var(--color-accent) 72%, var(--color-info)))` }">
            <Icon name="CalendarDaysIcon" :size="18" class="text-white" />
          </div>
          <div>
            <h3 class="text-base font-bold text-[var(--color-label-primary)]">{{ formattedDate }}</h3>
            <p class="text-xs text-[var(--color-label-tertiary)]">배정 현황</p>
          </div>
        </div>

        <!-- 진행률 바 (더 크게) -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-sm text-[var(--color-label-secondary)]">진행률</span>
            <span class="text-sm font-bold">
              <span class="text-lg stat-number" :style="{ color: progress === 100 ? 'var(--color-success)' : 'var(--color-accent)' }">{{ filledSlots }}</span>
              <span class="text-[var(--color-label-tertiary)]">/{{ totalSlots }}</span>
              <span class="text-[var(--color-label-tertiary)] ml-1">({{ progress }}%)</span>
            </span>
          </div>
          <div class="h-3 bg-[var(--color-surface-elevated)] rounded-full overflow-hidden shadow-inner">
            <div 
              class="h-full rounded-full transition-all duration-500"
              :style="{ width: `${progress}%`, background: `linear-gradient(90deg, color-mix(in srgb, ${progressColor} 82%, white), ${progressColor})` }"
            />
          </div>
        </div>

        <!-- 가용/불참 인원 요약 -->
        <div class="flex items-start gap-4 pt-1">
          <!-- 가용 인원 -->
          <div class="flex items-center gap-1.5">
            <div class="h-2 w-2 rounded-full" :style="{ backgroundColor: 'var(--color-success)' }" />
            <span class="text-sm font-medium text-[var(--color-label-primary)]">
              가용 <span class="font-bold" :style="{ color: 'var(--color-success)' }">{{ availableCount }}명</span>
            </span>
          </div>

          <!-- 불참 인원 -->
          <div v-if="absences.length > 0" class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5">
              <div class="h-2 w-2 rounded-full" :style="{ backgroundColor: 'var(--color-danger)' }" />
              <span class="text-sm font-medium text-[var(--color-label-primary)]">
                불참 <span class="font-bold" :style="{ color: 'var(--color-danger)' }">{{ absences.length }}명</span>
              </span>
            </div>
            <!-- 불참자 상세 (이름+사유) -->
            <p class="text-xs text-[var(--color-label-tertiary)] mt-0.5 ml-3.5 truncate">
              {{ absenceSummary }}
            </p>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
