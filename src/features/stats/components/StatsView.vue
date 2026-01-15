<script setup lang="ts">
import { computed, ref, onMounted, defineAsyncComponent } from 'vue'
import { Card, CardContent } from '@/components/ui/card'
import Icon from '@/components/ui/Icon.vue'
import { useAssignmentStore } from '@/stores/assignment'
import { calculateStatsSummary } from '../utils/statsCalculations'

// Assignment Suggestions (non-chart component)
const AssignmentSuggestions = defineAsyncComponent(() => import('./AssignmentSuggestions.vue'))

const store = useAssignmentStore()

// Deferred content - delays heavy content until after LCP
const isReady = ref(false)

onMounted(() => {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => {
      isReady.value = true
    }, { timeout: 100 })
  } else {
    setTimeout(() => {
      isReady.value = true
    }, 0)
  }
})

const summary = computed(() => calculateStatsSummary(store.app))
const hasData = computed(() => summary.value.totalWeeks > 0)
</script>

<template>
  <div class="space-y-8">
    <!-- Page Header - renders immediately for LCP -->
    <div>
      <h1 class="text-2xl font-bold text-[var(--color-label-primary)]">통계</h1>
      <p class="mt-1 text-sm text-[var(--color-label-secondary)]">
        팀원별 배정 비율, 결석 패턴, 역할 분포를 확인합니다.
      </p>
    </div>

    <!-- Deferred heavy content - loads after paint -->
    <template v-if="isReady">
      <!-- Empty state -->
      <Card v-if="!hasData">
        <CardContent class="py-16">
        <div class="flex flex-col items-center gap-4 text-center">
          <div class="w-16 h-16 rounded-full bg-[var(--color-surface)] flex items-center justify-center">
            <Icon name="insert_chart" :size="32" class="text-[var(--color-label-tertiary)]" />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-[var(--color-label-primary)] mb-1">
              아직 데이터가 없습니다
            </h3>
            <p class="text-sm text-[var(--color-label-secondary)]">
              배정 탭에서 주차별 배정을 진행하면 여기에 통계가 표시됩니다.
            </p>
          </div>
        </div>
        </CardContent>
      </Card>

      <!-- Stats content with data -->
      <template v-else>
        <!-- Summary Cards -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent class="p-4">
            <div class="text-sm text-[var(--color-label-secondary)]">총 주차</div>
            <div class="text-2xl font-bold text-[var(--color-label-primary)]">{{ summary.totalWeeks }}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent class="p-4">
            <div class="text-sm text-[var(--color-label-secondary)]">활성 팀원</div>
            <div class="text-2xl font-bold text-[var(--color-label-primary)]">{{ summary.activeMembers }}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent class="p-4">
            <div class="text-sm text-[var(--color-label-secondary)]">총 배정</div>
            <div class="text-2xl font-bold text-[var(--color-label-primary)]">{{ summary.totalAssignments }}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent class="p-4">
            <div class="text-sm text-[var(--color-label-secondary)]">주당 평균</div>
            <div class="text-2xl font-bold text-[var(--color-label-primary)]">{{ summary.averageAssignmentsPerWeek.toFixed(1) }}</div>
            </CardContent>
          </Card>
        </div>

        <!-- Assignment Suggestions -->
        <Suspense>
          <AssignmentSuggestions />
          <template #fallback>
            <div class="bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] rounded-xl h-[400px]" />
          </template>
        </Suspense>
      </template>
    </template>
  </div>
</template>
