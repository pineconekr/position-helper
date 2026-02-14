<script setup lang="ts">
import { computed, ref, toRaw, watch } from 'vue'
import { useAssignmentStore } from '@/stores/assignment'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Icon from '@/components/ui/Icon.vue'
import { Badge } from '@/components/ui/badge'
import * as DataService from '../services/dataService'
import * as api from '@/api/db'
import type { AppData } from '@/shared/types'
import { toast } from 'vue-sonner'
import clsx from 'clsx'

const store = useAssignmentStore()

const exportMembers = ref(true)
const exportWeeks = ref(true)
const exportRangeType = ref<'all' | 'custom'>('all')
const exportStartDate = ref('')
const exportEndDate = ref('')

const importFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const importPreview = ref<Partial<AppData> | null>(null)
const importIssues = ref<DataService.ImportValidationIssue[]>([])
const isDropzoneHover = ref(false)
const isDropzoneDragging = ref(false)
const mergeStrategy = ref<'overwrite' | 'merge_incoming' | 'merge_existing'>('merge_incoming')
const overwriteAcknowledged = ref(false)
const isImporting = ref(false)
const importStep = ref<'select' | 'preview' | 'confirm'>('select')
const importSteps: Array<{ key: 'select' | 'preview' | 'confirm'; label: string }> = [
  { key: 'select', label: '업로드' },
  { key: 'preview', label: '검토' },
  { key: 'confirm', label: '실행' }
]

const previewStats = computed(() => {
  if (!importPreview.value) return null

  const incoming = importPreview.value
  const current = store.app

  const incomingMemberNames = new Set((incoming.members ?? []).map((m) => m.name))
  const currentMemberNames = new Set(current.members.map((m) => m.name))
  const incomingWeekDates = Object.keys(incoming.weeks ?? {})
  const currentWeekDates = new Set(Object.keys(current.weeks))

  const newMembers = [...incomingMemberNames].filter((name) => !currentMemberNames.has(name))
  const conflictMembers = [...incomingMemberNames].filter((name) => currentMemberNames.has(name))
  const newWeeks = incomingWeekDates.filter((date) => !currentWeekDates.has(date))
  const conflictWeeks = incomingWeekDates.filter((date) => currentWeekDates.has(date))

  return {
    members: {
      total: incoming.members?.length ?? 0,
      new: newMembers.length,
      conflict: conflictMembers.length
    },
    weeks: {
      total: incomingWeekDates.length,
      new: newWeeks.length,
      conflict: conflictWeeks.length
    }
  }
})

const strategyItems: {
  value: 'overwrite' | 'merge_incoming' | 'merge_existing'
  title: string
  description: string
  danger?: boolean
}[] = [
  {
    value: 'merge_incoming',
    title: '병합 (파일 우선)',
    description: '겹치는 항목은 가져온 파일 값으로 갱신합니다.'
  },
  {
    value: 'merge_existing',
    title: '병합 (기존 우선)',
    description: '겹치는 항목은 현재 운영 데이터를 유지합니다.'
  },
  {
    value: 'overwrite',
    title: '전체 덮어쓰기',
    description: '기존 데이터 전체를 파일 데이터로 교체합니다.',
    danger: true
  }
]

const selectedStrategyLabel = computed(
  () => strategyItems.find((item) => item.value === mergeStrategy.value)?.title ?? '-'
)
const blockingIssueCount = computed(() => importIssues.value.filter((issue) => issue.level === 'error').length)
const warningIssueCount = computed(() => importIssues.value.filter((issue) => issue.level === 'warning').length)
const canProceedImport = computed(() => !!importPreview.value && blockingIssueCount.value === 0)
const importReadinessLabel = computed(() => {
  if (!importFile.value) return '복원 대기'
  if (blockingIssueCount.value > 0) return '오류 수정 필요'
  if (!importPreview.value) return '파일 검토 필요'
  if (mergeStrategy.value === 'overwrite' && !overwriteAcknowledged.value) return '확인 필요'
  return '복원 실행 가능'
})
const importReadinessTone = computed(() => {
  if (!importFile.value) return 'var(--color-label-tertiary)'
  if (blockingIssueCount.value > 0) return 'var(--color-danger)'
  if (mergeStrategy.value === 'overwrite' && !overwriteAcknowledged.value) return 'var(--color-danger)'
  return 'var(--color-success)'
})
const stepIndexMap = { select: 0, preview: 1, confirm: 2 } as const
const activeStepIndex = computed(() => stepIndexMap[importStep.value])
const stepLineWidth = computed(() => {
  if (activeStepIndex.value <= 0) return '0rem'
  if (activeStepIndex.value >= importSteps.length - 1) return 'calc(100% - 1.5rem)'
  return 'calc(50% - 0.75rem)'
})

function getStepVisual(index: number) {
  if (index < activeStepIndex.value) return 'done'
  if (index === activeStepIndex.value) return 'active'
  return 'idle'
}
const importStepTitle = computed(() => {
  if (importStep.value === 'select') return '복원 파일 선택'
  if (importStep.value === 'preview') return '복원 내용 검토'
  return '복원 실행 확인'
})
const canExecuteImport = computed(() => {
  if (!canProceedImport.value) return false
  if (mergeStrategy.value === 'overwrite' && !overwriteAcknowledged.value) return false
  return true
})
const importStatusLine = computed(() => {
  if (importStep.value === 'select') return '파일 선택 후 자동 검증'
  if (importStep.value === 'preview') return `오류 ${blockingIssueCount.value} · 경고 ${warningIssueCount.value}`
  return mergeStrategy.value === 'overwrite' ? '고위험 작업: 덮어쓰기' : '실행 준비 완료'
})
const hasImportWarnings = computed(() => warningIssueCount.value > 0 && blockingIssueCount.value === 0)

function handleExport() {
  if (!exportMembers.value && !exportWeeks.value) {
    toast.error('내보내기 항목을 선택해 주세요.', {
      description: '팀원 또는 주차 데이터를 최소 1개 이상 선택해야 합니다.'
    })
    return
  }

  if (exportRangeType.value === 'custom' && exportWeeks.value) {
    if (!exportStartDate.value || !exportEndDate.value) {
      toast.error('기간을 확인해 주세요.', {
        description: '사용자 지정 기간은 시작일과 종료일이 모두 필요합니다.'
      })
      return
    }

    if (exportStartDate.value > exportEndDate.value) {
      toast.error('기간 범위가 잘못되었습니다.', {
        description: '시작일은 종료일보다 이후일 수 없습니다.'
      })
      return
    }
  }

  const options: DataService.ExportOptions = {
    includeMembers: exportMembers.value,
    includeWeeks: exportWeeks.value,
    weekRange:
      exportRangeType.value === 'custom' && exportStartDate.value && exportEndDate.value
        ? { start: exportStartDate.value, end: exportEndDate.value }
        : undefined
  }

  const data = DataService.filterDataForExport(toRaw(store.app), options)
  const filename = `backup-${new Date().toISOString().slice(0, 10)}.json`
  DataService.downloadJson(data, filename)
  toast.success('내보내기 완료', { description: `${filename} 파일을 저장했습니다.` })
}

const selectedFileMeta = computed(() => {
  if (!importFile.value) return null
  const sizeKb = importFile.value.size / 1024
  const sizeLabel = sizeKb < 1024 ? `${sizeKb.toFixed(1)} KB` : `${(sizeKb / 1024).toFixed(2)} MB`
  return {
    name: importFile.value.name,
    sizeLabel
  }
})
const exportSummary = computed(() => {
  const sectionLabel = [
    exportMembers.value ? '팀원' : null,
    exportWeeks.value ? '주차' : null
  ]
    .filter(Boolean)
    .join(' + ')

  const rangeLabel = !exportWeeks.value
    ? '주차 데이터 제외'
    : exportRangeType.value === 'all'
      ? '전체 기간'
      : exportStartDate.value && exportEndDate.value
        ? `${exportStartDate.value} ~ ${exportEndDate.value}`
        : '기간 입력 필요'

  return {
    sectionLabel: sectionLabel || '선택 없음',
    rangeLabel
  }
})
const canExport = computed(() => {
  if (!exportMembers.value && !exportWeeks.value) return false
  if (!exportWeeks.value) return true
  if (exportRangeType.value === 'all') return true
  if (!exportStartDate.value || !exportEndDate.value) return false
  return exportStartDate.value <= exportEndDate.value
})
const exportDisabledReason = computed(() => {
  if (!exportMembers.value && !exportWeeks.value) return '팀원 또는 주차 데이터 중 최소 1개를 선택해야 합니다.'
  if (exportWeeks.value && exportRangeType.value === 'custom' && (!exportStartDate.value || !exportEndDate.value)) {
    return '기간을 입력해 주세요.'
  }
  if (exportWeeks.value && exportRangeType.value === 'custom' && exportStartDate.value > exportEndDate.value) {
    return '시작일은 종료일보다 이후일 수 없습니다.'
  }
  return ''
})

watch(mergeStrategy, (value) => {
  if (value !== 'overwrite') {
    overwriteAcknowledged.value = false
  }
})

function onFileSelected(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files?.length) {
    processFile(target.files[0])
  }
}

function onDrop(event: DragEvent) {
  isDropzoneDragging.value = false
  isDropzoneHover.value = false
  if (event.dataTransfer?.files.length) {
    processFile(event.dataTransfer.files[0])
  }
}

function handleDropzoneEnter(event: DragEvent) {
  event.preventDefault()
  isDropzoneDragging.value = true
}

function handleDropzoneLeave(event: DragEvent) {
  event.preventDefault()
  const target = event.currentTarget as HTMLElement | null
  const related = event.relatedTarget as Node | null
  if (target && related && target.contains(related)) return
  isDropzoneDragging.value = false
  isDropzoneHover.value = false
}

function handleDropzoneOver(event: DragEvent) {
  event.preventDefault()
  isDropzoneDragging.value = true
}

async function processFile(file: File) {
  importFile.value = file

  try {
    const text = await file.text()
    const json = JSON.parse(text) as unknown
    const validation = DataService.validateImportPayload(json)
    importIssues.value = validation.issues
    if (!validation.data) {
      importPreview.value = null
      importStep.value = 'preview'
      return
    }

    importPreview.value = validation.data
    importStep.value = 'preview'
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    toast.error('파일을 읽을 수 없습니다.', {
      description: message || '유효한 JSON 파일인지 확인해 주세요.'
    })
    resetImport()
  }
}

function resetImport() {
  importFile.value = null
  importPreview.value = null
  importIssues.value = []
  importStep.value = 'select'
  mergeStrategy.value = 'merge_incoming'
  overwriteAcknowledged.value = false
  if (fileInput.value) {
    fileInput.value.value = ''
  }
  isDropzoneDragging.value = false
  isDropzoneHover.value = false
}

function proceedToConfirm() {
  if (!canProceedImport.value) return
  importStep.value = 'confirm'
}

function toggleExportTarget(target: 'members' | 'weeks') {
  if (target === 'members') {
    exportMembers.value = !exportMembers.value
    return
  }
  exportWeeks.value = !exportWeeks.value
}

function setOverwriteAcknowledged(value: boolean) {
  overwriteAcknowledged.value = value
}

async function handleImport() {
  if (!importPreview.value || !canExecuteImport.value) return

  isImporting.value = true
  try {
    const backupFilename = `auto-backup-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
    DataService.downloadJson(toRaw(store.app), backupFilename)

    const merged = DataService.mergeAppData(toRaw(store.app), importPreview.value, mergeStrategy.value)
    const imported = await api.batchImport(merged)
    store.importData(merged)

    toast.success('가져오기 완료', {
      description: `팀원 ${imported.members}명, 주차 ${imported.weeks}개가 반영되었습니다.`
    })
    resetImport()
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    toast.error('가져오기 실패', {
      description: message || 'DB 반영 중 오류가 발생했습니다.'
    })
  } finally {
    isImporting.value = false
  }
}
</script>

<template>
  <div class="grid grid-cols-1 gap-4 xl:grid-cols-12 xl:items-start">
    <section
      class="rounded-2xl border p-5 shadow-sm sm:p-6 xl:col-span-8"
      :style="{
        borderColor: 'color-mix(in srgb, var(--color-warning) 35%, var(--border))',
        backgroundColor: 'color-mix(in srgb, var(--color-warning) 4%, var(--card))'
      }"
    >
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 class="mt-1 text-xl font-semibold tracking-tight text-foreground">백업 복원</h3>
          <p class="mt-1 text-sm text-muted-foreground">백업 파일 내용으로 현재 데이터를 업데이트합니다.</p>
        </div>
        <div class="flex items-center gap-2">
          <Badge variant="outline" class="h-7 px-2.5 text-sm font-semibold" :style="{ color: importReadinessTone }">
            {{ importReadinessLabel }}
          </Badge>
        </div>
      </div>

      <div class="mt-4 border-b border-border/70 pb-4">
        <div class="mb-3 rounded-lg border border-border/70 bg-background/70 px-3 py-2">
          <div class="flex flex-wrap items-center justify-between gap-2 text-sm">
            <p class="font-semibold text-foreground">현재 단계: {{ importStepTitle }}</p>
            <p class="text-muted-foreground">상태: {{ importStatusLine }}</p>
          </div>
        </div>
        <div class="relative">
          <div class="absolute left-3 right-3 top-2 h-px bg-border/70" />
          <div class="absolute left-3 top-2 h-px bg-[var(--color-accent)] transition-all duration-300" :style="{ width: stepLineWidth }" />
          <ol class="relative flex items-start justify-between">
            <li v-for="(step, index) in importSteps" :key="step.key" class="flex flex-1 flex-col items-center gap-1.5">
              <span
                class="inline-flex h-4 w-4 items-center justify-center rounded-full border bg-background text-[9px] font-semibold"
                :class="clsx(
                  getStepVisual(index) === 'active' && 'border-[var(--color-accent)] text-[var(--color-accent)]',
                  getStepVisual(index) === 'done' && 'border-[var(--color-success)] text-[var(--color-success)]',
                  getStepVisual(index) === 'idle' && 'border-border/70 text-muted-foreground'
                )"
              >
                <Icon v-if="getStepVisual(index) === 'done'" name="CheckIcon" :size="10" />
                <span v-else>{{ index + 1 }}</span>
              </span>
              <span
                class="text-sm font-medium"
                :class="clsx(
                  getStepVisual(index) === 'active' && 'text-foreground',
                  getStepVisual(index) === 'done' && 'text-[var(--color-success)]',
                  getStepVisual(index) === 'idle' && 'text-muted-foreground'
                )"
              >
                {{ step.label }}
              </span>
            </li>
          </ol>
        </div>
      </div>

      <div v-if="importStep === 'select'" class="mt-5 space-y-3">
        <button
          type="button"
          :class="clsx(
            'group w-full overflow-hidden rounded-xl border bg-card text-left transition-all duration-150',
            isDropzoneDragging
              ? 'scale-[1.005] border-[var(--color-accent)] shadow-sm'
              : 'border-border/70 hover:border-foreground/30',
            isDropzoneHover && !isDropzoneDragging && 'border-foreground/25'
          )"
          :style="{
            background: isDropzoneDragging
              ? 'linear-gradient(145deg, color-mix(in srgb, var(--color-accent) 12%, var(--card)), var(--card))'
              : 'linear-gradient(145deg, color-mix(in srgb, var(--muted) 24%, var(--card)), var(--card))'
          }"
          @dragenter="handleDropzoneEnter"
          @dragleave="handleDropzoneLeave"
          @dragover="handleDropzoneOver"
          @drop.prevent="onDrop"
          @mouseenter="isDropzoneHover = true"
          @mouseleave="isDropzoneHover = false"
          @click="fileInput?.click()"
        >
          <input ref="fileInput" type="file" accept=".json" class="hidden" @change="onFileSelected" />
          <div class="flex items-center gap-4 px-5 py-6">
            <div
              :class="clsx(
                'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-background transition-all duration-150',
                isDropzoneDragging ? 'border-[var(--color-accent)] shadow-sm' : 'border-border/70'
              )"
            >
              <Icon
                name="ArrowUpTrayIcon"
                :size="20"
                :class="clsx(
                  'transition-colors',
                  isDropzoneDragging ? 'text-[var(--color-accent)]' : 'text-muted-foreground group-hover:text-foreground'
                )"
              />
            </div>

            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold leading-6 text-foreground">
                {{ isDropzoneDragging ? '여기에 파일을 놓아 업로드' : 'JSON 파일 선택 또는 드래그 앤 드롭' }}
              </p>
              <p class="mt-0.5 text-sm text-muted-foreground">지원 형식: .json</p>
            </div>
          </div>
        </button>

        <div v-if="selectedFileMeta" class="rounded-lg border border-border/70 bg-muted/10 px-3 py-2.5">
          <p class="text-sm font-semibold uppercase tracking-[0.1em] text-muted-foreground">최근 선택 파일</p>
          <div class="mt-1 flex items-center justify-between gap-3">
            <p class="truncate font-mono text-sm text-foreground">{{ selectedFileMeta.name }}</p>
            <span class="shrink-0 rounded border border-border/60 bg-background px-1.5 py-0.5 text-sm font-semibold text-muted-foreground">
              {{ selectedFileMeta.sizeLabel }}
            </span>
          </div>
          <div class="mt-2 flex gap-2">
            <Button type="button" size="sm" variant="outline" @click="fileInput?.click()">파일 변경</Button>
            <Button type="button" size="sm" variant="ghost" @click="resetImport">초기화</Button>
          </div>
        </div>
      </div>

      <div v-else-if="importStep === 'preview'" class="mt-5 space-y-3">
        <div class="flex flex-wrap items-end justify-between gap-3 rounded-lg border border-border/70 bg-muted/10 p-3">
          <div>
            <p class="text-sm font-medium text-muted-foreground">선택 파일</p>
            <p class="mt-1 truncate font-mono text-sm text-foreground">{{ importFile?.name }}</p>
          </div>
          <Button type="button" size="sm" variant="outline" @click="importStep = 'select'">파일 다시 선택</Button>
        </div>

        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div class="rounded-lg border border-border/70 bg-card p-3">
            <p class="text-sm text-muted-foreground">팀원</p>
            <p class="mt-1 text-lg font-semibold text-foreground">{{ previewStats?.members.total ?? 0 }}</p>
            <p class="text-sm leading-5 text-muted-foreground">신규 {{ previewStats?.members.new ?? 0 }} / 충돌 {{ previewStats?.members.conflict ?? 0 }}</p>
          </div>
          <div class="rounded-lg border border-border/70 bg-card p-3">
            <p class="text-sm text-muted-foreground">주차</p>
            <p class="mt-1 text-lg font-semibold text-foreground">{{ previewStats?.weeks.total ?? 0 }}</p>
            <p class="text-sm leading-5 text-muted-foreground">신규 {{ previewStats?.weeks.new ?? 0 }} / 충돌 {{ previewStats?.weeks.conflict ?? 0 }}</p>
          </div>
        </div>

        <div v-if="importIssues.length > 0" class="rounded-md border border-border/70 bg-muted/20 p-3">
          <div class="flex flex-wrap items-center gap-2 text-sm">
            <span class="font-semibold text-foreground">검증 결과</span>
            <span v-if="blockingIssueCount > 0" class="rounded px-1.5 py-0.5" :style="{ color: 'var(--color-danger)', backgroundColor: 'color-mix(in srgb, var(--color-danger) 14%, transparent)' }">
              오류 {{ blockingIssueCount }}
            </span>
            <span v-if="warningIssueCount > 0" class="rounded px-1.5 py-0.5" :style="{ color: 'var(--color-warning)', backgroundColor: 'color-mix(in srgb, var(--color-warning) 14%, transparent)' }">
              경고 {{ warningIssueCount }}
            </span>
          </div>
          <ul class="mt-2 max-h-40 space-y-1 overflow-y-auto text-sm text-muted-foreground">
            <li v-for="(issue, idx) in importIssues" :key="`${issue.field}-${idx}`">
              <span :style="{ color: issue.level === 'error' ? 'var(--color-danger)' : 'var(--color-warning)' }">[{{ issue.level === 'error' ? '오류' : '경고' }}]</span>
              <span class="font-mono">{{ issue.field }}</span>
              <span> - {{ issue.message }}</span>
            </li>
          </ul>
        </div>

        <fieldset class="space-y-2 rounded-lg border border-border/70 bg-muted/10 p-3">
          <legend class="text-sm font-semibold uppercase tracking-[0.1em] text-muted-foreground">병합 방식</legend>
          <button
            v-for="item in strategyItems"
            :key="item.value"
            type="button"
            @click="mergeStrategy = item.value"
            :class="clsx(
              'w-full rounded-md border px-3 py-2.5 text-left transition-all duration-150',
              mergeStrategy === item.value
                ? item.danger
                  ? 'border-[var(--color-border-default)]'
                  : 'border-foreground/30 bg-card shadow-sm'
                : 'border-border/70 bg-background hover:border-foreground/25 hover:bg-card/70'
            )"
            :style="mergeStrategy === item.value && item.danger
              ? {
                  borderColor: 'color-mix(in srgb, var(--color-danger) 55%, transparent)',
                  backgroundColor: 'color-mix(in srgb, var(--color-danger) 8%, transparent)'
                }
              : undefined"
          >
            <p
              class="text-sm font-semibold leading-5"
              :style="item.danger && mergeStrategy === item.value ? { color: 'var(--color-danger)' } : undefined"
            >{{ item.title }}</p>
            <p class="mt-0.5 text-sm leading-6 text-muted-foreground">{{ item.description }}</p>
          </button>
        </fieldset>

        <p
          v-if="mergeStrategy === 'overwrite'"
          class="rounded-md border px-3 py-2 text-sm"
          :style="{
            color: 'var(--color-danger)',
            borderColor: 'color-mix(in srgb, var(--color-danger) 55%, transparent)',
            backgroundColor: 'color-mix(in srgb, var(--color-danger) 10%, transparent)'
          }"
        >
          전체 덮어쓰기는 기존 데이터를 교체합니다.
        </p>
        <p v-else-if="hasImportWarnings" class="rounded-md border border-border/70 bg-muted/15 px-3 py-2 text-sm text-muted-foreground">
          경고 항목이 있습니다. 영향 범위를 확인한 뒤 진행하세요.
        </p>

        <div class="flex gap-2 border-t border-border/70 pt-3">
          <Button type="button" variant="outline" @click="resetImport">취소</Button>
          <Button type="button" :disabled="!canProceedImport" @click="proceedToConfirm">다음</Button>
        </div>
      </div>

      <div v-else class="mt-5 space-y-3">
        <div
          class="rounded-lg border p-3 text-sm"
          :style="{
            borderColor: mergeStrategy === 'overwrite'
              ? 'color-mix(in srgb, var(--color-danger) 55%, transparent)'
              : 'color-mix(in srgb, var(--color-warning) 45%, transparent)',
            backgroundColor: mergeStrategy === 'overwrite'
              ? 'color-mix(in srgb, var(--color-danger) 14%, transparent)'
              : 'color-mix(in srgb, var(--color-warning) 12%, transparent)',
            color: mergeStrategy === 'overwrite' ? 'var(--color-danger)' : 'var(--color-warning)'
          }"
        >
          병합 방식: <span class="font-semibold">{{ selectedStrategyLabel }}</span>
        </div>
        <div class="grid grid-cols-1 gap-2 rounded-md border border-border/70 bg-muted/10 p-3 text-sm sm:grid-cols-2">
          <p class="text-muted-foreground">가져올 팀원: <span class="font-semibold text-foreground">{{ previewStats?.members.total ?? 0 }}명</span></p>
          <p class="text-muted-foreground">가져올 주차: <span class="font-semibold text-foreground">{{ previewStats?.weeks.total ?? 0 }}개</span></p>
        </div>
        <div class="flex gap-2 border-t border-border/70 pt-3">
          <Button type="button" variant="outline" :disabled="isImporting" @click="importStep = 'preview'">이전</Button>
          <div class="min-w-0 flex-1 space-y-2">
            <p
              class="rounded-md border px-3 py-2 text-sm"
              :style="{
                color: mergeStrategy === 'overwrite' ? 'var(--color-danger)' : 'var(--color-warning)',
                borderColor: mergeStrategy === 'overwrite'
                  ? 'color-mix(in srgb, var(--color-danger) 55%, transparent)'
                  : 'color-mix(in srgb, var(--color-warning) 45%, transparent)',
                backgroundColor: mergeStrategy === 'overwrite'
                  ? 'color-mix(in srgb, var(--color-danger) 10%, transparent)'
                  : 'color-mix(in srgb, var(--color-warning) 10%, transparent)'
              }"
            >
              실행 즉시 DB 반영
            </p>
            <div
              v-if="mergeStrategy === 'overwrite'"
              class="space-y-2 rounded-md border px-3 py-2 text-sm"
              :style="{
                borderColor: 'color-mix(in srgb, var(--color-danger) 55%, transparent)',
                backgroundColor: 'color-mix(in srgb, var(--color-danger) 8%, transparent)'
              }"
            >
              <p class="text-foreground">기존 데이터가 바뀐다는 점을 확인해 주세요.</p>
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  @click="setOverwriteAcknowledged(true)"
                  :class="clsx(
                    'rounded-md border px-2 py-1.5 text-sm font-medium transition-colors',
                    overwriteAcknowledged
                      ? 'border-[var(--color-danger)] bg-[color:color-mix(in_srgb,var(--color-danger)_14%,transparent)] text-[var(--color-danger)]'
                      : 'border-border/60 bg-background text-muted-foreground hover:text-foreground'
                  )"
                >
                  확인했어요
                </button>
                <button
                  type="button"
                  @click="setOverwriteAcknowledged(false)"
                  :class="clsx(
                    'rounded-md border px-2 py-1.5 text-sm font-medium transition-colors',
                    !overwriteAcknowledged
                      ? 'border-foreground/30 bg-muted/20 text-foreground'
                      : 'border-border/60 bg-background text-muted-foreground hover:text-foreground'
                  )"
                >
                  다시 검토할게요
                </button>
              </div>
            </div>
            <Button
              type="button"
              class="w-full"
              :variant="mergeStrategy === 'overwrite' ? 'destructive' : 'default'"
              :disabled="isImporting || !canExecuteImport"
              @click="handleImport"
            >
              <Icon v-if="isImporting" name="ArrowPathIcon" :size="16" class="mr-2 animate-spin" />
              {{ isImporting ? '복원 반영 중...' : '복원 실행' }}
            </Button>
          </div>
        </div>
      </div>
    </section>

    <section class="rounded-xl border border-dashed border-border/70 bg-background/40 p-4 sm:p-5 xl:sticky xl:top-4 xl:col-span-4">
      <div class="flex items-start justify-between gap-3 border-b border-border/70 pb-3">
        <div>
          <h3 class="mt-1 text-lg font-semibold tracking-tight text-foreground">백업 파일 생성</h3>
          <p class="mt-1 text-sm text-muted-foreground">현재 데이터를 JSON으로 저장합니다.</p>
        </div>
        <Badge variant="outline" class="h-6 px-2 text-sm font-semibold" :style="{ color: 'var(--color-info)' }">다운로드</Badge>
      </div>

      <div class="mt-4 space-y-3">
        <fieldset class="rounded-lg border border-border/70 bg-card p-3">
          <legend class="px-1 text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">백업 구성</legend>
          <div class="mt-1 grid grid-cols-1 gap-2">
            <button
              type="button"
              @click="toggleExportTarget('members')"
              :class="clsx(
                'flex items-center justify-between rounded-md border px-3 py-2.5 text-left text-sm transition-colors',
                exportMembers
                  ? 'border-[var(--color-accent)] bg-[color:color-mix(in_srgb,var(--color-accent)_10%,transparent)]'
                  : 'border-border/60 bg-background hover:border-foreground/25'
              )"
            >
              <div>
                <p class="font-medium text-foreground">팀원 데이터</p>
                <p class="text-sm text-muted-foreground">이름, 기수, 활동 상태, 메모</p>
              </div>
              <span class="text-sm font-semibold" :class="exportMembers ? 'text-foreground' : 'text-muted-foreground'">
                {{ exportMembers ? '선택됨' : '선택 안 함' }}
              </span>
            </button>
            <button
              type="button"
              @click="toggleExportTarget('weeks')"
              :class="clsx(
                'flex items-center justify-between rounded-md border px-3 py-2.5 text-left text-sm transition-colors',
                exportWeeks
                  ? 'border-[var(--color-accent)] bg-[color:color-mix(in_srgb,var(--color-accent)_10%,transparent)]'
                  : 'border-border/60 bg-background hover:border-foreground/25'
              )"
            >
              <div>
                <p class="font-medium text-foreground">주차 데이터</p>
                <p class="text-sm text-muted-foreground">역할 배정 및 불참 기록</p>
              </div>
              <span class="text-sm font-semibold" :class="exportWeeks ? 'text-foreground' : 'text-muted-foreground'">
                {{ exportWeeks ? '선택됨' : '선택 안 함' }}
              </span>
            </button>
          </div>
        </fieldset>

        <fieldset v-if="exportWeeks" class="rounded-lg border border-border/70 bg-card p-3">
          <legend class="px-1 text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">기간 설정</legend>
          <div class="mt-1 grid grid-cols-2 gap-2">
            <button
              type="button"
              @click="exportRangeType = 'all'"
              :class="clsx(
                'rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                exportRangeType === 'all'
                  ? 'border-[var(--color-accent)] bg-[color:color-mix(in_srgb,var(--color-accent)_10%,transparent)] text-foreground'
                  : 'border-border/60 bg-background text-muted-foreground hover:text-foreground'
              )"
            >
              전체 기간
            </button>
            <button
              type="button"
              @click="exportRangeType = 'custom'"
              :class="clsx(
                'rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                exportRangeType === 'custom'
                  ? 'border-[var(--color-accent)] bg-[color:color-mix(in_srgb,var(--color-accent)_10%,transparent)] text-foreground'
                  : 'border-border/60 bg-background text-muted-foreground hover:text-foreground'
              )"
            >
              사용자 지정
            </button>
          </div>

          <div v-if="exportRangeType === 'custom'" class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label class="mb-1 block text-sm font-medium text-muted-foreground">시작일</label>
              <Input v-model="exportStartDate" type="date" class="h-10" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-muted-foreground">종료일</label>
              <Input v-model="exportEndDate" type="date" class="h-10" />
            </div>
          </div>
        </fieldset>

        <div class="rounded-lg border border-border/70 bg-card px-3 py-2.5">
          <p class="text-sm font-semibold text-foreground">요약</p>
          <div class="mt-1.5 grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2">
            <p class="text-muted-foreground">구성: <span class="font-semibold text-foreground">{{ exportSummary.sectionLabel }}</span></p>
            <p class="text-muted-foreground">기간: <span class="font-semibold text-foreground">{{ exportSummary.rangeLabel }}</span></p>
          </div>
        </div>

        <p v-if="exportDisabledReason" class="text-sm text-muted-foreground">{{ exportDisabledReason }}</p>

        <Button type="button" class="h-11 w-full text-sm font-semibold" :disabled="!canExport" @click="handleExport">
          <Icon name="ArrowDownTrayIcon" :size="16" class="mr-2" />
          백업 JSON 다운로드
        </Button>
      </div>
    </section>
  </div>
</template>
