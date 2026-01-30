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
  <div class="space-y-6">
    <!-- Page Header - Stitch Style -->
    <div>
      <h1 class="text-xl font-bold text-foreground">통계</h1>
      <p class="text-sm text-muted-foreground">팀원별 배정 현황을 확인합니다</p>
    </div>

    <!-- Deferred heavy content - loads after paint -->
    <template v-if="isReady">
      <!-- Empty state -->
      <Card v-if="!hasData">
        <CardContent class="py-16">
          <div class="flex flex-col items-center gap-4 text-center">
            <div class="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <Icon name="ChartBarSquareIcon" :size="28" class="text-muted-foreground" />
            </div>
            <div>
              <h3 class="text-base font-semibold text-foreground mb-1">
                아직 데이터가 없습니다
              </h3>
              <p class="text-sm text-muted-foreground">
                배정 탭에서 주차별 배정을 진행하면 여기에 통계가 표시됩니다.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Stats content with data -->
      <template v-else>
        <!-- Summary Cards - Stitch Style Grid -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent class="p-4">
              <div class="text-sm text-muted-foreground">총 주차</div>
              <div class="text-2xl font-bold text-foreground mt-1">{{ summary.totalWeeks }}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent class="p-4">
              <div class="text-sm text-muted-foreground">활성 팀원</div>
              <div class="text-2xl font-bold text-foreground mt-1">{{ summary.activeMembers }}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent class="p-4">
              <div class="text-sm text-muted-foreground">총 배정</div>
              <div class="text-2xl font-bold text-foreground mt-1">{{ summary.totalAssignments }}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent class="p-4">
              <div class="text-sm text-muted-foreground">주당 평균</div>
              <div class="text-2xl font-bold text-foreground mt-1">{{ summary.averageAssignmentsPerWeek.toFixed(1) }}</div>
            </CardContent>
          </Card>
        </div>

        <!-- Assignment Suggestions -->
        <Suspense>
          <AssignmentSuggestions />
          <template #fallback>
            <div class="bg-muted border border-border rounded-xl h-[400px]" />
          </template>
        </Suspense>
      </template>
    </template>
  </div>
</template>
