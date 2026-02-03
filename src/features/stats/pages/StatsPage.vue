<script setup lang="ts">
import AssignmentStats from '../components/AssignmentStats.vue'
import RoleHeatmap from '../components/RoleHeatmap.vue'
import AbsenceChart from '../components/AbsenceChart.vue'
import GenerationAnalysis from '../components/GenerationAnalysis.vue'
import QualityControlChart from '../components/QualityControlChart.vue'
import AbsenceDeviationChart from '../components/AbsenceDeviationChart.vue'
import MonthlyAbsenceTrendChart from '../components/MonthlyAbsenceTrendChart.vue'
import { onMounted } from 'vue'
import { useAssignmentStore } from '@/stores/assignment'

const store = useAssignmentStore()

onMounted(async () => {
    // Ensure data is loaded just in case user lands directly here
    await store.loadFromDb()
})
</script>

<template>
  <div class="space-y-6 p-6 animate-in fade-in duration-500">
    <div class="flex flex-col gap-1.5">
        <h2 class="text-2xl font-bold tracking-tight text-[var(--color-label-primary)]">통계 대시보드</h2>
        <p class="text-sm text-[var(--color-label-secondary)]">데이터 기반으로 사역 현황을 분석하고 로테이션 균형을 확인하세요.</p>
    </div>

    <!-- 1. Main Stats & Trends -->
    <div class="grid gap-6 md:grid-cols-2">
      <AssignmentStats />
      <QualityControlChart />
    </div>

    <!-- 2. Deep Dive: Member Analysis (Dynamic Height) -->
    <div class="grid gap-6 md:grid-cols-2">
        <RoleHeatmap />
        <AbsenceDeviationChart />
    </div>

    <!-- 3. Summary & Group Analysis -->
    <div class="grid gap-6 md:grid-cols-2">
        <AbsenceChart />
        <GenerationAnalysis />
    </div>

    <!-- 4. Monthly Trend (Full Width) -->
    <MonthlyAbsenceTrendChart />
  </div>
</template>

