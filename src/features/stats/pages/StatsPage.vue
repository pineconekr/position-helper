<script setup lang="ts">
import { defineAsyncComponent, onMounted } from 'vue'
import { useAssignmentStore } from '@/stores/assignment'

const AssignmentStats = defineAsyncComponent(() => import('../components/AssignmentStats.vue'))
const RoleHeatmap = defineAsyncComponent(() => import('../components/RoleHeatmap.vue'))
const AbsenceChart = defineAsyncComponent(() => import('../components/AbsenceChart.vue'))
const GenerationAnalysis = defineAsyncComponent(() => import('../components/GenerationAnalysis.vue'))
const QualityControlChart = defineAsyncComponent(() => import('../components/QualityControlChart.vue'))
const AbsenceDeviationChart = defineAsyncComponent(() => import('../components/AbsenceDeviationChart.vue'))
const MonthlyAbsenceTrendChart = defineAsyncComponent(() => import('../components/MonthlyAbsenceTrendChart.vue'))

const store = useAssignmentStore()

onMounted(async () => {
    // Ensure data is loaded just in case user lands directly here
    await store.loadFromDb()
})
</script>

<template>
  <div class="space-y-5 p-4 sm:p-5 animate-in fade-in duration-500">
    <header class="space-y-1.5">
      <p class="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Stats Report</p>
      <h2 class="text-2xl font-bold tracking-tight text-[var(--color-label-primary)]">통계 대시보드</h2>
      <p class="text-sm text-[var(--color-label-secondary)]">핵심 지표와 운영 균형을 한 페이지에서 확인합니다.</p>
    </header>

    <section class="space-y-2">
      <div class="flex items-center justify-between border-b border-border/60 pb-1.5">
        <h3 class="text-lg font-semibold text-foreground">핵심 지표</h3>
      </div>
      <div class="grid gap-3 xl:grid-cols-2">
        <AssignmentStats />
        <QualityControlChart />
      </div>
    </section>

    <section class="space-y-2">
      <div class="flex items-center justify-between border-b border-border/60 pb-1.5">
        <h3 class="text-lg font-semibold text-foreground">운영 균형 분석</h3>
      </div>
      <div class="grid gap-3 xl:grid-cols-2">
        <RoleHeatmap />
        <AbsenceDeviationChart />
        <AbsenceChart />
        <GenerationAnalysis />
      </div>
    </section>

    <section class="space-y-2">
      <div class="flex items-center justify-between border-b border-border/60 pb-1.5">
        <h3 class="text-lg font-semibold text-foreground">월별 추세</h3>
      </div>
      <MonthlyAbsenceTrendChart />
    </section>
  </div>
</template>
