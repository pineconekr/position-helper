<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted } from 'vue'
import { useAssignmentStore } from '@/stores/assignment'

const AssignmentStats = defineAsyncComponent(() => import('../components/AssignmentStats.vue'))
const RoleHeatmap = defineAsyncComponent(() => import('../components/RoleHeatmap.vue'))
const AbsenceChart = defineAsyncComponent(() => import('../components/AbsenceChart.vue'))
const GenerationAnalysis = defineAsyncComponent(() => import('../components/GenerationAnalysis.vue'))
const QualityControlChart = defineAsyncComponent(() => import('../components/QualityControlChart.vue'))
const AbsenceDeviationChart = defineAsyncComponent(() => import('../components/AbsenceDeviationChart.vue'))
const MonthlyAbsenceTrendChart = defineAsyncComponent(() => import('../components/MonthlyAbsenceTrendChart.vue'))

const store = useAssignmentStore()
const inactiveMembers = computed(() =>
  store.app.members
    .filter(member => member.active === false && member.name.trim().length > 0)
    .map(member => member.name.trim())
    .sort((a, b) => a.localeCompare(b, 'ko'))
)
const inactivePreview = computed(() => inactiveMembers.value.slice(0, 3).join(', '))
const inactiveMoreCount = computed(() => Math.max(0, inactiveMembers.value.length - 3))
const inactiveMembersLabel = computed(() => inactiveMembers.value.join(', '))

onMounted(async () => {
    // Ensure data is loaded just in case user lands directly here
    await store.loadFromDb()
})
</script>

<template>
  <div class="animate-in fade-in duration-500 space-y-3.5 sm:space-y-4">
    <header class="surface-panel px-4 py-4 sm:px-6 sm:py-5">
      <p class="section-eyebrow">Analytics Report</p>
      <h1 class="section-title mt-1.5">통계 대시보드</h1>
      <p class="section-description mt-2">핵심 지표, 운영 균형, 월별 추세를 한 화면에서 검토합니다.</p>
      <div
        v-if="inactiveMembers.length > 0"
        class="mt-2.5 flex flex-wrap items-center gap-2 rounded-md border border-border/70 bg-muted/20 px-3 py-2"
      >
        <span class="rounded-full bg-foreground px-2 py-0.5 text-[0.82rem] font-medium text-background">
          비활성 제외 {{ inactiveMembers.length }}명
        </span>
        <p class="text-sm text-muted-foreground" :title="inactiveMembersLabel">
          {{ inactivePreview }}
          <span v-if="inactiveMoreCount > 0"> 외 {{ inactiveMoreCount }}명</span>
          은 통계 집계에서 제외됩니다.
        </p>
      </div>
    </header>

    <section class="space-y-2">
      <div class="flex items-center justify-between px-1">
        <h3 class="text-[1.04rem] font-semibold tracking-tight text-foreground">핵심 지표</h3>
      </div>
      <div class="grid gap-2.5 lg:grid-cols-2">
        <AssignmentStats />
        <QualityControlChart />
      </div>
    </section>

    <section class="space-y-2">
      <div class="flex items-center justify-between px-1">
        <h3 class="text-[1.04rem] font-semibold tracking-tight text-foreground">운영 균형 분석</h3>
      </div>
      <div class="grid gap-2.5 lg:grid-cols-2">
        <RoleHeatmap />
        <AbsenceDeviationChart />
        <AbsenceChart />
        <GenerationAnalysis />
      </div>
    </section>

    <section class="space-y-2">
      <div class="flex items-center justify-between px-1">
        <h3 class="text-[1.04rem] font-semibold tracking-tight text-foreground">월별 추세</h3>
      </div>
      <MonthlyAbsenceTrendChart />
    </section>
  </div>
</template>
