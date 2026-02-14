<script setup lang="ts">
import { computed, ref, toRaw, watch } from 'vue'
import { useAssignmentStore } from '@/stores/assignment'
import { useThemeStore } from '@/stores/theme'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import Icon from '@/components/ui/Icon.vue'
import type { Absence, PartAssignment, WeekData } from '@/shared/types'
import { toast } from 'vue-sonner'
import * as api from '@/api/db'
import clsx from 'clsx'
import { modal } from '@/shared/composables/useModal'

import { Codemirror } from 'vue-codemirror'
import { json } from '@codemirror/lang-json'
import { oneDark } from '@codemirror/theme-one-dark'

const store = useAssignmentStore()
const themeStore = useThemeStore()

const selectedWeekKey = ref<string | null>(null)
const weekJsonText = ref('')
const editorScope = ref<'board' | 'single'>('board')
const editMode = ref<'form' | 'json'>('form')
const searchTerm = ref('')
const weeksDirty = ref(false)
const isSaving = ref(false)
const isHydrating = ref(false)
const baselineWeek = ref<WeekData | null>(null)
const formWeek = ref<WeekData>({
  part1: { SW: '', 자막: '', 고정: '', 사이드: ['', ''], 스케치: '' },
  part2: { SW: '', 자막: '', 고정: '', 사이드: ['', ''], 스케치: '' },
  absences: []
})
const boardWeekCount = ref<3 | 4 | 6>(4)
const boardDraft = ref<Record<string, WeekData>>({})
const boardBaseline = ref<Record<string, WeekData>>({})
const boardDirty = ref(false)

const isDarkMode = computed(() => themeStore.effectiveTheme === 'dark')
const editorExtensions = computed(() => (isDarkMode.value ? [json(), oneDark] : [json()]))
const editorThemeKey = computed(() => (isDarkMode.value ? 'editor-dark' : 'editor-light'))

const weekKeys = computed(() => Object.keys(store.app.weeks).sort().reverse())
const memberNames = computed(() => store.app.members.map((m) => m.name).sort((a, b) => a.localeCompare(b, 'ko')))

const roleFields: Array<{ key: keyof PartAssignment; label: string; isPair?: boolean }> = [
  { key: 'SW', label: 'SW' },
  { key: '자막', label: '자막' },
  { key: '고정', label: '고정' },
  { key: '사이드', label: '사이드', isPair: true },
  { key: '스케치', label: '스케치' }
]
type BoardSlot = { id: string; label: string; part: 'part1' | 'part2'; role: keyof PartAssignment; index?: 0 | 1 }
const boardSlots: BoardSlot[] = [
  { id: 'p1-sw', label: '1부 · SW', part: 'part1', role: 'SW' },
  { id: 'p1-caption', label: '1부 · 자막', part: 'part1', role: '자막' },
  { id: 'p1-fixed', label: '1부 · 고정', part: 'part1', role: '고정' },
  { id: 'p1-side-1', label: '1부 · 사이드 1', part: 'part1', role: '사이드', index: 0 },
  { id: 'p1-side-2', label: '1부 · 사이드 2', part: 'part1', role: '사이드', index: 1 },
  { id: 'p1-sketch', label: '1부 · 스케치', part: 'part1', role: '스케치' },
  { id: 'p2-sw', label: '2부 · SW', part: 'part2', role: 'SW' },
  { id: 'p2-caption', label: '2부 · 자막', part: 'part2', role: '자막' },
  { id: 'p2-fixed', label: '2부 · 고정', part: 'part2', role: '고정' },
  { id: 'p2-side-1', label: '2부 · 사이드 1', part: 'part2', role: '사이드', index: 0 },
  { id: 'p2-side-2', label: '2부 · 사이드 2', part: 'part2', role: '사이드', index: 1 },
  { id: 'p2-sketch', label: '2부 · 스케치', part: 'part2', role: '스케치' }
]

const filteredWeeks = computed(() => {
  const term = searchTerm.value.trim().toLowerCase()
  if (!term) return weekKeys.value
  return weekKeys.value.filter((key) => key.toLowerCase().includes(term))
})
const boardWeekKeys = computed(() => weekKeys.value.slice(0, boardWeekCount.value))

const lineCount = computed(() => (weekJsonText.value ? weekJsonText.value.split('\n').length : 1))
const parsedJsonError = computed(() => {
  if (!weekJsonText.value.trim()) return '내용이 비어 있습니다.'
  try {
    const parsed = JSON.parse(weekJsonText.value) as WeekData
    if (!parsed.part1 || !parsed.part2) return '필수 필드(part1, part2)가 없습니다.'
    return ''
  } catch {
    return 'JSON 문법 오류가 있습니다.'
  }
})

const statusText = computed(() => {
  if (parsedJsonError.value) return parsedJsonError.value
  if (weeksDirty.value) return '저장 대기 중인 변경사항이 있습니다.'
  return '저장 가능한 JSON 형식입니다.'
})

const statusTone = computed<'danger' | 'warn' | 'neutral'>(() => {
  if (parsedJsonError.value) return 'danger'
  if (weeksDirty.value) return 'warn'
  return 'neutral'
})

const statusColor = computed(() => {
  if (statusTone.value === 'danger') return 'var(--color-danger)'
  if (statusTone.value === 'warn') return 'var(--color-warning)'
  return 'var(--color-label-secondary)'
})

const canSaveSingle = computed(() => weeksDirty.value && !parsedJsonError.value && !isSaving.value)
const canSaveBoard = computed(() => boardDirty.value && !isSaving.value)
const parsedWeek = computed(() => {
  try {
    const parsed = JSON.parse(weekJsonText.value) as WeekData
    if (!parsed.part1 || !parsed.part2 || !Array.isArray(parsed.absences)) return null
    return parsed
  } catch {
    return null
  }
})
const changeSummary = computed(() => {
  if (!baselineWeek.value || !parsedWeek.value) {
    return { assignmentChanges: 0, absenceChanges: 0, total: 0 }
  }
  const prev = baselineWeek.value
  const next = parsedWeek.value

  const diffSlot = (part: 'part1' | 'part2', role: keyof PartAssignment, idx?: 0 | 1) => {
    if (role === '사이드') {
      const i = idx ?? 0
      return (prev[part].사이드[i] || '') !== (next[part].사이드[i] || '')
    }
    return (prev[part][role] || '') !== (next[part][role] || '')
  }

  let assignmentChanges = 0
  ;(['part1', 'part2'] as const).forEach((part) => {
    if (diffSlot(part, 'SW')) assignmentChanges += 1
    if (diffSlot(part, '자막')) assignmentChanges += 1
    if (diffSlot(part, '고정')) assignmentChanges += 1
    if (diffSlot(part, '사이드', 0)) assignmentChanges += 1
    if (diffSlot(part, '사이드', 1)) assignmentChanges += 1
    if (diffSlot(part, '스케치')) assignmentChanges += 1
  })

  const prevAbs = JSON.stringify(prev.absences)
  const nextAbs = JSON.stringify(next.absences)
  const absenceChanges = prevAbs === nextAbs ? 0 : Math.abs(next.absences.length - prev.absences.length) + 1

  return {
    assignmentChanges,
    absenceChanges,
    total: assignmentChanges + absenceChanges
  }
})

function getBoardSlotValue(weekKey: string, slot: BoardSlot): string {
  const week = boardDraft.value[weekKey]
  if (!week) return ''
  if (slot.role === '사이드') return week[slot.part].사이드[slot.index ?? 0] || ''
  return week[slot.part][slot.role] || ''
}

function setBoardSlotValue(weekKey: string, slot: BoardSlot, value: string) {
  const week = boardDraft.value[weekKey]
  if (!week) return
  if (slot.role === '사이드') {
    week[slot.part].사이드[slot.index ?? 0] = value
  } else {
    week[slot.part][slot.role] = value
  }
  boardDirty.value = true
}

function initializeBoard() {
  const keys = boardWeekKeys.value
  const nextDraft: Record<string, WeekData> = {}
  const nextBaseline: Record<string, WeekData> = {}
  keys.forEach((key) => {
    const week = store.app.weeks[key]
    if (!week) return
    nextDraft[key] = structuredClone(toRaw(week))
    nextBaseline[key] = structuredClone(toRaw(week))
  })
  boardDraft.value = nextDraft
  boardBaseline.value = nextBaseline
  boardDirty.value = false
}

function resetBoard() {
  boardDraft.value = structuredClone(toRaw(boardBaseline.value))
  boardDirty.value = false
}

async function saveBoard() {
  if (!canSaveBoard.value) return
  const changedKeys = boardWeekKeys.value.filter((key) => {
    const before = boardBaseline.value[key]
    const after = boardDraft.value[key]
    if (!before || !after) return false
    return JSON.stringify(before) !== JSON.stringify(after)
  })
  if (changedKeys.length === 0) {
    boardDirty.value = false
    return
  }

  const confirmed = await modal.confirm({
    title: '여러 주차 저장',
    message: `${changedKeys.length}개 주차가 동시에 반영됩니다.`,
    confirmText: '저장',
    variant: 'default'
  })
  if (!confirmed) return

  isSaving.value = true
  const merged = structuredClone(toRaw(store.app))
  changedKeys.forEach((key) => {
    merged.weeks[key] = structuredClone(toRaw(boardDraft.value[key]))
  })

  try {
    await api.batchImport(merged)
    store.importData(merged)
    boardBaseline.value = structuredClone(toRaw(boardDraft.value))
    boardDirty.value = false
    toast.success('저장 완료', {
      description: `${changedKeys.length}개 주차가 반영되었습니다.`
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    toast.error('저장 실패', {
      description: message || '일괄 저장 중 문제가 발생했습니다.'
    })
  } finally {
    isSaving.value = false
  }
}

watch(
  weekKeys,
  (keys) => {
    if (keys.length === 0) {
      selectedWeekKey.value = null
      weekJsonText.value = ''
      weeksDirty.value = false
      return
    }

    if (!selectedWeekKey.value || !keys.includes(selectedWeekKey.value)) {
      hydrateEditor(keys[0])
    }
  },
  { immediate: true }
)

watch(
  [editorScope, boardWeekCount, weekKeys],
  () => {
    if (editorScope.value === 'board') initializeBoard()
  },
  { immediate: true }
)

function hydrateEditor(key: string) {
  const week = store.app.weeks[key]
  if (!week) return
  isHydrating.value = true
  selectedWeekKey.value = key
  baselineWeek.value = structuredClone(toRaw(week))
  formWeek.value = structuredClone(toRaw(week))
  weekJsonText.value = JSON.stringify(formWeek.value, null, 2)
  weeksDirty.value = false
  isHydrating.value = false
}

async function switchWeek(key: string) {
  if (key === selectedWeekKey.value) return

  if (weeksDirty.value) {
    const confirmed = await modal.confirm({
      title: '미저장 변경사항',
      message: '저장하지 않은 변경사항이 있습니다. 이동하면 변경사항이 사라집니다. 계속하시겠습니까?',
      confirmText: '이동',
      variant: 'default'
    })
    if (!confirmed) return
  }

  hydrateEditor(key)
}

function handleChange(val: string) {
  weekJsonText.value = val
  if (!isHydrating.value) weeksDirty.value = true
}

function syncFormToJson(markDirty = true) {
  weekJsonText.value = JSON.stringify(formWeek.value, null, 2)
  if (markDirty) weeksDirty.value = true
}

function syncJsonToForm() {
  if (!parsedWeek.value) return false
  formWeek.value = structuredClone(toRaw(parsedWeek.value))
  return true
}

function updateAssignment(part: 'part1' | 'part2', role: keyof PartAssignment, value: string, index?: 0 | 1) {
  if (role === '사이드') {
    const idx = index ?? 0
    formWeek.value[part].사이드[idx] = value
  } else {
    formWeek.value[part][role] = value
  }
  syncFormToJson(true)
}

function addAbsence() {
  formWeek.value.absences.push({ name: '', reason: '' })
  syncFormToJson(true)
}

function removeAbsence(index: number) {
  formWeek.value.absences.splice(index, 1)
  syncFormToJson(true)
}

function updateAbsence(index: number, patch: Partial<Absence>) {
  const current = formWeek.value.absences[index]
  if (!current) return
  formWeek.value.absences[index] = { ...current, ...patch }
  syncFormToJson(true)
}

function setEditMode(mode: 'form' | 'json') {
  if (mode === editMode.value) return
  if (mode === 'form') {
    if (!syncJsonToForm()) {
      toast.error('폼으로 전환할 수 없습니다', { description: 'JSON 오류를 먼저 수정해 주세요.' })
      return
    }
  } else {
    syncFormToJson(false)
  }
  editMode.value = mode
}

async function saveWeek() {
  if (!selectedWeekKey.value || !canSaveSingle.value) return

  let parsed: WeekData
  try {
    parsed = JSON.parse(weekJsonText.value) as WeekData
    if (!parsed.part1 || !parsed.part2) throw new Error('invalid-structure')
  } catch {
    toast.error('저장할 수 없습니다', {
      description: 'JSON 문법 또는 구조를 확인한 뒤 다시 시도하세요.'
    })
    return
  }

  const summary = changeSummary.value
  if (summary.total > 0) {
    const confirmed = await modal.confirm({
      title: '변경사항 저장',
      message: `역할 ${summary.assignmentChanges}건, 불참 ${summary.absenceChanges}건 변경됩니다.`,
      confirmText: '저장',
      variant: 'default'
    })
    if (!confirmed) return
  }

  isSaving.value = true
  try {
    store.app.weeks[selectedWeekKey.value] = parsed
    await api.saveWeekAssignment(selectedWeekKey.value, parsed)
    weeksDirty.value = false
    baselineWeek.value = structuredClone(toRaw(parsed))
    formWeek.value = structuredClone(toRaw(parsed))
    toast.success('저장 완료', {
      description: `${selectedWeekKey.value} 데이터가 반영되었습니다.`
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    toast.error('저장 실패', {
      description: message || 'DB 저장 중 문제가 발생했습니다.'
    })
  } finally {
    isSaving.value = false
  }
}

function resetWeek() {
  if (!selectedWeekKey.value) return
  const current = store.app.weeks[selectedWeekKey.value]
  if (!current) return
  hydrateEditor(selectedWeekKey.value)
  toast.info('변경사항을 취소했습니다.')
}

function formatJson() {
  try {
    const parsed = JSON.parse(weekJsonText.value)
    weekJsonText.value = JSON.stringify(parsed, null, 2)
    weeksDirty.value = true
  } catch {
    toast.error('정렬할 수 없습니다', {
      description: '먼저 JSON 문법 오류를 수정해 주세요.'
    })
  }
}

async function deleteWeek() {
  const key = selectedWeekKey.value
  if (!key) return

  const confirmed = await modal.confirm({
    title: '주차 데이터 삭제',
    message: `'${key}' 데이터를 삭제하시겠습니까? 이 작업은 즉시 반영됩니다.`,
    confirmText: '삭제',
    variant: 'destructive'
  })
  if (!confirmed) return

  const snapshot = structuredClone(toRaw(store.app))

  isSaving.value = true
  try {
    delete store.app.weeks[key]
    await api.batchImport(toRaw(store.app))

    const next = weekKeys.value[0] ?? null
    if (next) {
      hydrateEditor(next)
    } else {
      selectedWeekKey.value = null
      weekJsonText.value = ''
      weeksDirty.value = false
    }

    toast.success('삭제 완료', {
      description: `${key} 데이터가 제거되었습니다.`
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    store.importData(snapshot)
    toast.error('삭제 실패', {
      description: message || '삭제 중 문제가 발생했습니다. 원래 데이터로 복원했습니다.'
    })
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
    <div class="grid min-h-[560px] grid-cols-1 lg:grid-cols-[240px_1fr]">
      <aside class="border-b border-border/70 bg-muted/10 lg:border-b-0 lg:border-r">
        <div class="border-b border-border/70 p-3">
          <p class="mb-1 text-sm font-semibold uppercase tracking-[0.1em] text-muted-foreground">Weeks</p>
          <div class="relative">
            <Icon name="MagnifyingGlassIcon" :size="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input v-model="searchTerm" type="text" class="h-10 pl-9 text-sm" placeholder="주차 검색" />
          </div>
        </div>

        <div class="max-h-[430px] overflow-y-auto p-2">
          <button
            v-for="key in filteredWeeks"
            :key="key"
            type="button"
            @click="switchWeek(key)"
            :class="clsx(
              'mb-1 w-full rounded-md border px-3 py-2 text-left text-sm',
              selectedWeekKey === key
                ? 'border-foreground/25 bg-card text-foreground'
                : 'border-transparent text-muted-foreground hover:border-border/70 hover:bg-background hover:text-foreground'
            )"
          >
            <span class="font-mono">{{ key }}</span>
          </button>

          <p v-if="filteredWeeks.length === 0" class="px-2 py-4 text-sm text-muted-foreground">검색 결과가 없습니다.</p>
        </div>
      </aside>

      <section class="flex min-h-[560px] flex-col">
        <div class="border-b border-border/70 bg-muted/10 px-4 py-2.5">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="rounded-md border border-border/70 bg-background p-0.5">
              <button
                type="button"
                @click="editorScope = 'board'"
                :class="clsx('rounded px-2.5 py-1 text-xs font-medium', editorScope === 'board' ? 'bg-foreground text-background' : 'text-muted-foreground')"
              >
                멀티 주차
              </button>
              <button
                type="button"
                @click="editorScope = 'single'"
                :class="clsx('rounded px-2.5 py-1 text-xs font-medium', editorScope === 'single' ? 'bg-foreground text-background' : 'text-muted-foreground')"
              >
                단일 주차
              </button>
            </div>
            <div v-if="editorScope === 'board'" class="flex items-center gap-1 rounded-md border border-border/70 bg-background p-0.5">
              <button
                v-for="count in [3, 4, 6]"
                :key="`wk-${count}`"
                type="button"
                @click="boardWeekCount = count as 3 | 4 | 6"
                :class="clsx('rounded px-2 py-1 text-xs font-medium', boardWeekCount === count ? 'bg-foreground text-background' : 'text-muted-foreground')"
              >
                {{ count }}주
              </button>
            </div>
          </div>
        </div>

        <div v-if="editorScope === 'board'" class="flex h-full flex-col">
          <header class="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-muted/10 px-4 py-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Board</p>
              <h3 class="text-sm font-semibold text-foreground">여러 주차 동시 편집</h3>
            </div>
            <div class="flex items-center gap-2">
              <Badge v-if="boardDirty" variant="secondary" class="h-7 px-2 text-sm font-semibold">미저장</Badge>
              <Button type="button" variant="ghost" size="sm" @click="resetBoard" :disabled="!boardDirty || isSaving">되돌리기</Button>
              <Button type="button" variant="outline" size="sm" @click="saveBoard" :disabled="!canSaveBoard">
                <Icon v-if="isSaving" name="ArrowPathIcon" :size="16" class="mr-2 animate-spin" />
                한 번에 저장
              </Button>
            </div>
          </header>
          <div class="h-full overflow-auto p-3">
            <table class="w-full min-w-[980px] border-separate border-spacing-0">
              <thead>
                <tr>
                  <th class="sticky left-0 z-10 border border-border/70 bg-background px-3 py-2 text-left text-xs font-semibold text-muted-foreground">역할</th>
                  <th
                    v-for="weekKey in boardWeekKeys"
                    :key="`head-${weekKey}`"
                    class="border border-border/70 bg-background px-3 py-2 text-left text-xs font-semibold text-foreground"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <span class="font-mono">{{ weekKey }}</span>
                      <span class="text-[11px] text-muted-foreground">불참 {{ boardDraft[weekKey]?.absences.length ?? 0 }}</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="slot in boardSlots" :key="slot.id">
                  <td class="sticky left-0 z-10 border border-border/70 bg-background px-3 py-2 text-sm font-medium text-foreground">{{ slot.label }}</td>
                  <td v-for="weekKey in boardWeekKeys" :key="`cell-${slot.id}-${weekKey}`" class="border border-border/70 bg-card p-1.5">
                    <Input
                      :list="`member-list-board-${weekKey}`"
                      :model-value="getBoardSlotValue(weekKey, slot)"
                      @update:model-value="(v) => setBoardSlotValue(weekKey, slot, String(v))"
                      class="h-8 text-sm"
                      :placeholder="slot.label"
                    />
                    <datalist :id="`member-list-board-${weekKey}`">
                      <option v-for="name in memberNames" :key="`board-${weekKey}-${name}`" :value="name" />
                    </datalist>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <footer class="flex items-center justify-between border-t border-border/70 bg-muted/10 px-4 py-2.5 text-sm">
            <p class="text-muted-foreground">좌우 스크롤로 여러 주차를 한 번에 수정할 수 있습니다.</p>
            <p class="text-xs text-muted-foreground">현재 {{ boardWeekKeys.length }}주 표시</p>
          </footer>
        </div>

        <div v-else-if="selectedWeekKey" class="flex h-full flex-col">
          <header class="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-muted/10 px-4 py-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Current</p>
              <h3 class="font-mono text-sm font-semibold text-foreground">{{ selectedWeekKey }}.json</h3>
            </div>

            <div class="flex items-center gap-2">
              <Badge v-if="weeksDirty" variant="secondary" class="h-7 px-2 text-sm font-semibold">미저장</Badge>
              <div class="rounded-md border border-border/70 bg-background p-0.5">
                <button
                  type="button"
                  @click="setEditMode('form')"
                  :class="clsx('rounded px-2 py-1 text-xs font-medium', editMode === 'form' ? 'bg-foreground text-background' : 'text-muted-foreground')"
                >
                  기본 편집
                </button>
                <button
                  type="button"
                  @click="setEditMode('json')"
                  :class="clsx('rounded px-2 py-1 text-xs font-medium', editMode === 'json' ? 'bg-foreground text-background' : 'text-muted-foreground')"
                >
                  고급 JSON
                </button>
              </div>
              <Button type="button" variant="ghost" size="sm" @click="formatJson" :disabled="isSaving || editMode === 'form'">정렬</Button>
              <Button v-if="weeksDirty" type="button" variant="ghost" size="sm" @click="resetWeek" :disabled="isSaving">되돌리기</Button>
              <Button type="button" variant="outline" size="sm" @click="saveWeek" :disabled="!canSaveSingle">
                <Icon v-if="isSaving" name="ArrowPathIcon" :size="16" class="mr-2 animate-spin" />
                저장
              </Button>
              <Button type="button" variant="outline" size="sm" class="text-[var(--color-danger)]" @click="deleteWeek" :disabled="isSaving">삭제</Button>
            </div>
          </header>

          <div class="editor-pane flex-1 overflow-hidden bg-background">
            <div v-if="editMode === 'form'" class="h-full overflow-y-auto p-4">
              <div class="space-y-4">
                <section v-for="part in (['part1', 'part2'] as const)" :key="part" class="rounded-lg border border-border/70 bg-muted/10 p-3">
                  <h4 class="mb-2 text-sm font-semibold text-foreground">{{ part === 'part1' ? '1부' : '2부' }}</h4>
                  <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div v-for="field in roleFields" :key="`${part}-${field.key}`" class="space-y-1">
                      <label class="text-xs font-medium text-muted-foreground">{{ field.label }}</label>
                      <template v-if="field.isPair">
                        <div class="grid grid-cols-2 gap-2">
                          <Input
                            :list="`member-list-${part}`"
                            :model-value="formWeek[part].사이드[0]"
                            @update:model-value="(v) => updateAssignment(part, '사이드', String(v), 0)"
                            placeholder="사이드 1"
                            class="h-9 text-sm"
                          />
                          <Input
                            :list="`member-list-${part}`"
                            :model-value="formWeek[part].사이드[1]"
                            @update:model-value="(v) => updateAssignment(part, '사이드', String(v), 1)"
                            placeholder="사이드 2"
                            class="h-9 text-sm"
                          />
                        </div>
                      </template>
                      <Input
                        v-else
                        :list="`member-list-${part}`"
                        :model-value="formWeek[part][field.key] as string"
                        @update:model-value="(v) => updateAssignment(part, field.key, String(v))"
                        class="h-9 text-sm"
                        :placeholder="`${field.label} 담당자`"
                      />
                    </div>
                  </div>
                  <datalist :id="`member-list-${part}`">
                    <option v-for="name in memberNames" :key="`${part}-${name}`" :value="name" />
                  </datalist>
                </section>

                <section class="rounded-lg border border-border/70 bg-muted/10 p-3">
                  <div class="mb-2 flex items-center justify-between">
                    <h4 class="text-sm font-semibold text-foreground">불참자</h4>
                    <Button type="button" size="sm" variant="outline" @click="addAbsence">추가</Button>
                  </div>
                  <div v-if="formWeek.absences.length === 0" class="text-sm text-muted-foreground">불참자가 없습니다.</div>
                  <div v-else class="space-y-2">
                    <div v-for="(absence, idx) in formWeek.absences" :key="`abs-${idx}`" class="grid grid-cols-[1fr_1fr_auto] gap-2">
                      <Input
                        list="member-list-absence"
                        :model-value="absence.name"
                        @update:model-value="(v) => updateAbsence(idx, { name: String(v) })"
                        placeholder="이름"
                        class="h-9 text-sm"
                      />
                      <Input
                        :model-value="absence.reason || ''"
                        @update:model-value="(v) => updateAbsence(idx, { reason: String(v) })"
                        placeholder="사유(선택)"
                        class="h-9 text-sm"
                      />
                      <Button type="button" size="sm" variant="ghost" @click="removeAbsence(idx)">삭제</Button>
                    </div>
                    <datalist id="member-list-absence">
                      <option v-for="name in memberNames" :key="`absence-${name}`" :value="name" />
                    </datalist>
                  </div>
                </section>
              </div>
            </div>

            <Codemirror
              v-else
              :key="editorThemeKey"
              v-model="weekJsonText"
              :extensions="editorExtensions"
              :style="{ height: '100%' }"
              :autofocus="true"
              :indent-with-tab="true"
              :tab-size="2"
              @change="handleChange"
            />
          </div>

          <footer class="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 bg-muted/10 px-4 py-2.5 text-sm">
            <p :class="clsx(statusTone !== 'neutral' ? 'font-medium' : '')" :style="{ color: statusColor }">{{ statusText }}</p>
            <p v-if="weeksDirty" class="text-xs text-muted-foreground">변경 요약: 역할 {{ changeSummary.assignmentChanges }}건 · 불참 {{ changeSummary.absenceChanges }}건</p>
            <p class="font-mono text-sm text-muted-foreground">Lines {{ lineCount }}</p>
          </footer>
        </div>

        <div v-else class="flex h-full min-h-[560px] flex-col items-center justify-center gap-3 px-6 text-center">
          <Icon name="CodeBracketSquareIcon" :size="40" class="text-muted-foreground/60" />
          <p class="text-base font-semibold text-foreground">편집할 주차 데이터가 없습니다.</p>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.editor-pane :deep(.cm-editor) {
  height: 100%;
  font-family: var(--font-mono);
}

.editor-pane :deep(.cm-scroller) {
  line-height: 1.55;
}

.editor-pane :deep(.cm-gutters) {
  border-right: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
}
</style>
