<script setup lang="ts">
import { computed, ref, toRaw } from 'vue'
import { useAssignmentStore } from '@/stores/assignment'
import { Button } from '@/components/ui/button'
import Icon from '@/components/ui/Icon.vue'
import { toast } from 'vue-sonner'
import * as api from '@/api/db'
import * as HealthService from '../services/healthService'
import clsx from 'clsx'
import { modal } from '@/shared/composables/useModal'

const store = useAssignmentStore()
const report = ref<HealthService.HealthReport | null>(null)
const isScanning = ref(false)
const isFixing = ref(false)
const healthStep = ref<'scan' | 'review' | 'apply'>('scan')
const healthSteps: Array<{ key: 'scan' | 'review' | 'apply'; label: string }> = [
  { key: 'scan', label: '검사' },
  { key: 'review', label: '검토' },
  { key: 'apply', label: '보정' }
]

const scoreTone = computed(() => {
  const score = report.value?.score ?? 0
  if (score >= 90) return 'good'
  if (score >= 70) return 'warn'
  return 'danger'
})

const scoreLabel = computed(() => {
  if (!report.value) return '검사 대기'
  if (report.value.score >= 90) return '안정'
  if (report.value.score >= 70) return '점검 필요'
  return '위험'
})

const issueCounts = computed(() => {
  const issues = report.value?.issues ?? []
  return {
    total: issues.length,
    fixable: issues.filter((issue) => issue.fixable).length,
    error: issues.filter((issue) => issue.type === 'error').length,
    warning: issues.filter((issue) => issue.type === 'warning').length
  }
})
const issueSummary = computed(() => `긴급 ${issueCounts.value.error} · 경고 ${issueCounts.value.warning}`)
const scoreColor = computed(() => {
  if (scoreTone.value === 'good') return 'var(--color-success)'
  if (scoreTone.value === 'warn') return 'var(--color-warning)'
  return 'var(--color-danger)'
})
const healthStepTitle = computed(() => {
  if (healthStep.value === 'scan') return '검사 단계'
  if (healthStep.value === 'review') return '결과 검토 단계'
  return '자동 보정 단계'
})
const healthStepStatus = computed(() => {
  if (healthStep.value === 'scan') return '검사 실행 대기'
  if (!report.value) return '검사 결과 없음'
  if (healthStep.value === 'review') return issueSummary.value
  return `자동 수정 가능 ${issueCounts.value.fixable}`
})
const canMoveToApply = computed(() => {
  if (!report.value) return false
  return report.value.issues.length > 0
})
const canRunFix = computed(() => {
  if (healthStep.value !== 'apply') return false
  return issueCounts.value.fixable > 0 && !isFixing
})

function issueColor(type: 'error' | 'warning') {
  return type === 'error' ? 'var(--color-danger)' : 'var(--color-warning)'
}

async function runScan() {
  isScanning.value = true
  await new Promise((resolve) => setTimeout(resolve, 250))
  report.value = HealthService.scanData(store.app)
  isScanning.value = false
  healthStep.value = 'review'

  if (report.value.issues.length === 0) {
    toast.success('검사 완료', { description: '문제가 발견되지 않았습니다.' })
  } else {
    toast.warning('검사 완료', {
      description: `${report.value.issues.length}개의 문제가 발견되었습니다.`
    })
  }
}

function moveToApplyStep() {
  if (!canMoveToApply.value) return
  healthStep.value = 'apply'
}

async function fixIssues() {
  if (!report.value || report.value.issues.length === 0 || !canRunFix.value) return

  const confirmed = await modal.confirm({
    title: '자동 수정 실행',
    message: '수정 가능한 문제를 자동 정리하시겠습니까?',
    confirmText: '수정 실행',
    variant: 'destructive'
  })
  if (!confirmed) return

  const snapshot = structuredClone(toRaw(store.app))
  isFixing.value = true

  try {
    const fixedData = HealthService.fixOrphans(toRaw(store.app))
    await api.batchImport(fixedData)
    store.importData(fixedData)
    toast.success('자동 수정 완료', { description: '고아 배정 항목을 정리했습니다.' })
    await runScan()
    healthStep.value = 'review'
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    store.importData(snapshot)
    toast.error('자동 수정 실패', {
      description: message || 'DB 반영 중 오류가 발생했습니다.'
    })
  } finally {
    isFixing.value = false
  }
}

async function handleResetDummy() {
  const confirmed = await modal.confirm({
    title: '더미 데이터 초기화',
    message: '운영 데이터를 더미 데이터로 대체하시겠습니까?',
    confirmText: '초기화',
    variant: 'destructive'
  })
  if (!confirmed) return

  const snapshot = structuredClone(toRaw(store.app))
  isFixing.value = true

  try {
    store.loadDummyData()
    await api.batchImport(toRaw(store.app))
    toast.success('초기화 완료', { description: '더미 데이터가 반영되었습니다.' })
    await runScan()
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    store.importData(snapshot)
    toast.error('초기화 실패', {
      description: message || 'DB 반영 중 오류가 발생했습니다.'
    })
  } finally {
    isFixing.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <section class="grid grid-cols-1 gap-4 xl:grid-cols-12 xl:items-start">
      <section
        class="rounded-2xl border p-5 shadow-sm sm:p-6 xl:col-span-8"
        :style="{
          borderColor: 'color-mix(in srgb, var(--color-warning) 35%, var(--border))',
          backgroundColor: 'color-mix(in srgb, var(--color-warning) 4%, var(--card))'
        }"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">위험 작업</p>
            <h3 class="mt-1 text-xl font-semibold tracking-tight text-foreground">무결성 검사/보정</h3>
            <p class="mt-1 text-sm text-muted-foreground">검사와 자동 보정을 통해 운영 데이터를 정리합니다.</p>
          </div>
          <Badge variant="outline" class="h-7 px-2.5 text-sm font-semibold" :style="{ color: 'var(--color-warning)' }">
            운영 데이터 변경 가능
          </Badge>
        </div>

        <div class="mt-4 border-b border-border/70 pb-4">
          <div class="mb-3 rounded-lg border border-border/70 bg-background/70 px-3 py-2">
            <div class="flex flex-wrap items-center justify-between gap-2 text-sm">
              <p class="font-semibold text-foreground">현재 단계: {{ healthStepTitle }}</p>
              <p class="text-muted-foreground">상태: {{ healthStepStatus }}</p>
            </div>
          </div>
          <ol class="flex items-center gap-2 text-sm">
            <li
              v-for="step in healthSteps"
              :key="step.key"
              class="rounded-md border px-2 py-1"
              :class="clsx(
                healthStep === step.key ? 'border-foreground/30 bg-background text-foreground' : 'border-border/70 text-muted-foreground'
              )"
            >
              {{ step.label }}
            </li>
          </ol>
        </div>

        <div class="mt-5 space-y-3">
          <div v-if="!report" class="rounded-md border border-dashed border-border/70 p-6 text-center">
            <Icon name="MagnifyingGlassIcon" :size="22" class="mx-auto text-muted-foreground" />
            <p class="mt-2 text-sm text-muted-foreground">검사를 실행하면 결과가 표시됩니다.</p>
          </div>

          <div
            v-else-if="report.issues.length === 0"
            class="rounded-md border p-3 text-sm"
            :style="{
              borderColor: 'color-mix(in srgb, var(--color-success) 35%, transparent)',
              backgroundColor: 'color-mix(in srgb, var(--color-success) 8%, transparent)',
              color: 'var(--color-success)'
            }"
          >
            문제 없음: 현재 데이터에서 무결성 문제가 발견되지 않았습니다.
          </div>

          <ul v-else class="max-h-[420px] space-y-2 overflow-y-auto pr-1">
            <li
              v-for="issue in report.issues"
              :key="issue.id"
              class="rounded-md border px-3 py-2.5"
              :style="{
                borderColor: `color-mix(in srgb, ${issueColor(issue.type)} 35%, transparent)`,
                backgroundColor: `color-mix(in srgb, ${issueColor(issue.type)} 8%, transparent)`
              }"
            >
              <div class="flex items-start justify-between gap-2">
                <p class="text-sm font-medium leading-6" :style="{ color: issueColor(issue.type) }">{{ issue.message }}</p>
                <span
                  class="rounded px-1.5 py-0.5 text-sm font-semibold uppercase tracking-wide"
                  :style="{
                    color: issueColor(issue.type),
                    backgroundColor: `color-mix(in srgb, ${issueColor(issue.type)} 15%, transparent)`
                  }"
                >
                  {{ issue.type }}
                </span>
              </div>
              <p v-if="issue.details" class="mt-1 text-sm text-muted-foreground">{{ issue.details }}</p>
              <p class="mt-1 text-sm text-muted-foreground">{{ issue.fixable ? '자동 수정 가능' : '수동 조치 필요' }}</p>
            </li>
          </ul>
        </div>

        <div class="mt-4 border-t border-border/70 pt-4">
          <div class="flex flex-wrap gap-2">
            <Button type="button" class="h-10" :disabled="isScanning || isFixing" @click="runScan">
              <Icon name="ArrowPathIcon" :size="16" :class="clsx('mr-2', isScanning && 'animate-spin')" />
              {{ report ? '재검사' : '검사 실행' }}
            </Button>
            <Button
              v-if="healthStep === 'review'"
              type="button"
              variant="outline"
              class="h-10"
              :disabled="!canMoveToApply || isFixing"
              @click="moveToApplyStep"
            >
              보정 단계로 이동
            </Button>
            <Button
              v-if="healthStep === 'apply'"
              type="button"
              variant="outline"
              class="h-10"
              :disabled="isFixing"
              @click="healthStep = 'review'"
            >
              검토로 돌아가기
            </Button>
          </div>

          <div v-if="healthStep === 'apply'" class="mt-3 space-y-2">
            <p
              class="rounded-md border px-3 py-2 text-sm"
              :style="{
                color: issueCounts.fixable > 0 ? 'var(--color-warning)' : 'var(--color-label-secondary)',
                borderColor: issueCounts.fixable > 0
                  ? 'color-mix(in srgb, var(--color-warning) 45%, transparent)'
                  : 'color-mix(in srgb, var(--color-label-secondary) 40%, transparent)',
                backgroundColor: issueCounts.fixable > 0
                  ? 'color-mix(in srgb, var(--color-warning) 10%, transparent)'
                  : 'color-mix(in srgb, var(--color-label-secondary) 10%, transparent)'
              }"
            >
              {{ issueCounts.fixable > 0 ? '자동 수정은 즉시 DB에 반영됩니다.' : '자동 수정 가능한 항목이 없습니다.' }}
            </p>
            <Button type="button" variant="destructive" class="h-10 w-full" :disabled="!canRunFix" @click="fixIssues">
              <Icon name="WrenchScrewdriverIcon" :size="16" class="mr-2" />
              자동 수정 실행
            </Button>
          </div>
        </div>
      </section>

      <aside class="space-y-4 xl:sticky xl:top-4 xl:col-span-4">
        <section class="rounded-xl border border-dashed border-border/70 bg-background/40 p-4">
          <p class="text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">안전 작업</p>
          <h4 class="mt-1 text-base font-semibold tracking-tight text-foreground">상태 요약</h4>
          <div class="mt-3">
            <div class="flex items-end gap-3">
              <p class="text-3xl font-semibold leading-none" :style="{ color: scoreColor }">{{ report ? report.score : '-' }}</p>
              <p class="pb-0.5 text-sm font-medium text-muted-foreground">{{ scoreLabel }}</p>
            </div>
            <div class="mt-3 h-2 rounded-full bg-muted/40">
              <div class="h-full rounded-full transition-all" :style="{ backgroundColor: scoreColor, width: `${report?.score ?? 0}%` }" />
            </div>
          </div>
          <div class="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div class="rounded-md border border-border/70 p-2">
              <p class="text-muted-foreground">전체 이슈</p>
              <p class="mt-1 text-base font-semibold text-foreground">{{ issueCounts.total }}</p>
            </div>
            <div class="rounded-md border border-border/70 p-2">
              <p class="text-muted-foreground">자동 수정</p>
              <p class="mt-1 text-base font-semibold text-foreground">{{ issueCounts.fixable }}</p>
            </div>
          </div>
          <p v-if="report" class="mt-3 text-sm text-muted-foreground">{{ new Date(report.timestamp).toLocaleString() }}</p>
        </section>

        <section class="rounded-xl border border-border/70 bg-background p-4 shadow-sm">
          <p class="text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">개발 전용</p>
          <h4 class="mt-1 text-sm font-semibold tracking-tight text-foreground">더미 데이터 로드</h4>
          <p class="mt-1 text-sm text-muted-foreground">운영 데이터를 테스트 데이터로 대체합니다.</p>
          <Button type="button" variant="outline" class="mt-3 h-10 w-full" :disabled="isFixing" @click="handleResetDummy">
            더미 데이터 로드
          </Button>
        </section>
      </aside>
    </section>
  </div>
</template>

