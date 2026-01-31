<script setup lang="ts">
import WorkloadChart from '../components/WorkloadChart.vue'
import RoleBreakdownChart from '../components/RoleBreakdownChart.vue'
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

    <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
      <WorkloadChart class="col-span-1 md:col-span-2 lg:col-span-3" />
      <RoleBreakdownChart class="col-span-1 md:col-span-2 lg:col-span-4" />
    </div>
  </div>
</template>
