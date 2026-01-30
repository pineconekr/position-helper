<script setup lang="ts">
/**
 * AssignmentTable.vue - Vue 3 버전
 * 배정 테이블 with 드래그앤드롭 slots
 */
import { ref } from 'vue'
import { useAssignmentStore } from '@/stores/assignment'
import { RoleKeys, type RoleKey } from '@/shared/types'
import { BLANK_ROLE_VALUE, stripCohort } from '@/shared/utils/assignment'
import { encodeAssignedId, decodeAssignedId, decodeMemberId } from '@/shared/utils/dndIds'
import Icon from '@/components/ui/Icon.vue'
import { Badge } from '@/components/ui/badge'
import clsx from 'clsx'

type PartKey = 'part1' | 'part2'
type SlotKey = `${PartKey}-${RoleKey}` | `${PartKey}-${RoleKey}-${0 | 1}`

interface Props {
  selectedMember?: string | null
  previewScores?: Map<SlotKey, number> | null
}

defineProps<Props>()

const emit = defineEmits<{
  'slot-click': [part: PartKey, role: RoleKey, index?: 0 | 1]
  'clear-slot': [part: PartKey, role: RoleKey, index?: 0 | 1]
  'drop': [part: PartKey, role: RoleKey, memberId: string, index?: 0 | 1]
  'slot-swap': [sourcePart: PartKey, sourceRole: RoleKey, sourceIndex: 0 | 1 | undefined, targetPart: PartKey, targetRole: RoleKey, targetIndex: 0 | 1 | undefined]
}>()

const store = useAssignmentStore()

const ROLE_COUNTS: Record<RoleKey, number> = {
  SW: 1,
  자막: 1,
  고정: 1,
  사이드: 2,
  스케치: 1,
}

const ROLE_COLORS: Record<RoleKey, string> = {
  SW: 'text-violet-600 dark:text-violet-400',
  자막: 'text-amber-600 dark:text-amber-400',
  고정: 'text-emerald-600 dark:text-emerald-400',
  사이드: 'text-sky-600 dark:text-sky-400',
  스케치: 'text-rose-500 dark:text-rose-400',
}

function getValue(part: PartKey, role: RoleKey, index?: 0 | 1): string {
  const draft = store.currentDraft
  const p = draft[part]
  if (role === '사이드') {
    return p['사이드'][index ?? 0] || ''
  }
  return (p[role] as string) || ''
}

function getSlotKey(part: PartKey, role: RoleKey, index?: 0 | 1): SlotKey {
  if (index !== undefined) return `${part}-${role}-${index}`
  return `${part}-${role}`
}

function getScoreColor(score: number): string {
  if (score >= 120) return 'text-[var(--color-success)]'
  if (score >= 80) return 'text-[var(--color-accent)]'
  if (score >= 0) return 'text-[var(--color-warning)]'
  return 'text-[var(--color-danger)]'
}

function getCellClasses(value: string, isSelected: boolean, isDragging: boolean = false) {
  const isEmpty = value === ''
  const isBlank = value === BLANK_ROLE_VALUE
  
  return clsx(
    'group relative w-full h-full flex items-center justify-center',
    'text-base font-medium transition-all duration-150',
    'border border-transparent rounded-[var(--radius-sm)]',
    isDragging && 'opacity-50',
    isEmpty 
      ? clsx(
          'text-[var(--color-label-tertiary)] hover:bg-[var(--color-surface-elevated)]',
          isSelected ? 'cursor-pointer' : 'cursor-default'
        )
      : isBlank
        ? 'bg-[var(--color-surface-elevated)] text-[var(--color-label-tertiary)] border border-dashed border-[var(--color-border-subtle)] cursor-grab'
        : isSelected 
          ? 'bg-[var(--color-accent)] text-white shadow-sm shadow-blue-500/20 z-10 cursor-grab'
          : 'bg-[var(--color-surface)] text-[var(--color-label-primary)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border-default)] hover:shadow-sm cursor-grab'
  )
}

function handleSlotClick(part: PartKey, role: RoleKey, index?: 0 | 1) {
  emit('slot-click', part, role, index)
}

function handleClearSlot(part: PartKey, role: RoleKey, index: 0 | 1 | undefined, e: Event) {
  e.stopPropagation()
  emit('clear-slot', part, role, index)
}

// D&D state
const dragOverSlot = ref<SlotKey | null>(null)
const draggingSlot = ref<SlotKey | null>(null)

function handleDragStart(e: DragEvent, part: PartKey, role: RoleKey, index?: 0 | 1) {
  const value = getValue(part, role, index)
  if (!value) {
    e.preventDefault()
    return
  }
  
  // 배정된 슬롯 정보를 dataTransfer에 저장
  const slotInfo = { part, role, index }
  const assignedId = encodeAssignedId(slotInfo, value)
  e.dataTransfer?.setData('text/plain', assignedId)
  e.dataTransfer!.effectAllowed = 'move'
  draggingSlot.value = getSlotKey(part, role, index)
}

function handleDragEnd() {
  draggingSlot.value = null
}

function handleDragOver(e: DragEvent, part: PartKey, role: RoleKey, index?: 0 | 1) {
  e.preventDefault()
  e.dataTransfer!.dropEffect = 'move'
  dragOverSlot.value = getSlotKey(part, role, index)
}

function handleDragLeave() {
  dragOverSlot.value = null
}

function handleDrop(e: DragEvent, part: PartKey, role: RoleKey, index?: 0 | 1) {
  e.preventDefault()
  const data = e.dataTransfer?.getData('text/plain')
  if (!data) {
    dragOverSlot.value = null
    return
  }

  // Check if it's a slot-to-slot swap (from another cell)
  const assignedSource = decodeAssignedId(data)
  if (assignedSource) {
    // Emit slot-swap event for swapping two assigned slots
    emit('slot-swap', assignedSource.part, assignedSource.role, assignedSource.index, part, role, index)
    dragOverSlot.value = null
    return
  }

  // Check if it's a member from the member list
  const memberName = decodeMemberId(data)
  if (memberName !== null) {
    emit('drop', part, role, data, index)
    dragOverSlot.value = null
    return
  }

  dragOverSlot.value = null
}

function isSlotDragOver(part: PartKey, role: RoleKey, index?: 0 | 1): boolean {
  return dragOverSlot.value === getSlotKey(part, role, index)
}

function isSlotDragging(part: PartKey, role: RoleKey, index?: 0 | 1): boolean {
  return draggingSlot.value === getSlotKey(part, role, index)
}

const gridCols = 'grid-cols-[48px_1fr_1fr_1fr_2fr_1fr]'
</script>

<template>
  <!-- 모바일 가로 스크롤 지원: overflow-x-auto로 테이블 스크롤 허용 -->
  <div class="w-full overflow-x-auto">
    <div class="min-w-[500px] overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
    <!-- Header -->
    <div :class="clsx('grid gap-px bg-[var(--color-border-subtle)] border-b border-[var(--color-border-subtle)]', gridCols)">
      <div class="bg-[var(--color-surface-elevated)]" />
      <div
        v-for="role in RoleKeys"
        :key="role"
        class="bg-[var(--color-surface-elevated)] py-2 flex items-center justify-center gap-1.5"
      >
        <span :class="clsx('text-sm font-semibold', ROLE_COLORS[role])">
          {{ role }}
        </span>
        <Badge variant="outline" class="text-xs text-[var(--color-label-tertiary)] bg-[var(--color-surface)] px-1.5 py-0.5 rounded-full border-[var(--color-border-subtle)] h-auto min-w-[1.25rem] justify-center">
          {{ ROLE_COUNTS[role] }}
        </Badge>
      </div>
    </div>

    <!-- Rows -->
    <div :class="clsx('grid gap-px bg-[var(--color-border-subtle)]', gridCols)">
      <template v-for="part in (['part1', 'part2'] as PartKey[])" :key="part">
        <!-- Row Header -->
        <div :class="clsx(
          'bg-[var(--color-surface-elevated)] flex items-center justify-center',
          'text-sm font-bold text-[var(--color-label-secondary)]'
        )">
          {{ part === 'part1' ? '1부' : '2부' }}
        </div>

        <!-- Cells -->
        <template v-for="role in RoleKeys" :key="`${part}-${role}`">
          <!-- 사이드 (2 slots) -->
          <div v-if="role === '사이드'" class="bg-[var(--color-canvas)] p-1 flex items-center justify-center">
            <div class="flex w-full gap-1">
              <div
                v-for="idx in [0, 1]"
                :key="idx"
                :class="[
                'relative w-full h-[var(--cell-height)] transition-colors duration-200 rounded-[var(--radius-sm)]',
                  isSlotDragOver(part, role, idx as 0 | 1) && 'bg-blue-500/10 ring-1 ring-blue-500/50'
                ]"
                :draggable="!!getValue(part, role, idx as 0 | 1)"
                @dragstart="(e) => handleDragStart(e, part, role, idx as 0 | 1)"
                @dragend="handleDragEnd"
                @dragover="(e) => handleDragOver(e, part, role, idx as 0 | 1)"
                @dragleave="handleDragLeave"
                @drop="(e) => handleDrop(e, part, role, idx as 0 | 1)"
              >
                <div
                  :class="getCellClasses(getValue(part, role, idx as 0 | 1), selectedMember === getValue(part, role, idx as 0 | 1) && getValue(part, role, idx as 0 | 1) !== '', isSlotDragging(part, role, idx as 0 | 1))"
                  @click="handleSlotClick(part, role, idx as 0 | 1)"
                >
                  <!-- Empty slot with preview score -->
                  <template v-if="getValue(part, role, idx as 0 | 1) === '' && previewScores?.get(getSlotKey(part, role, idx as 0 | 1))">
                    <span :class="clsx('text-xs font-bold', getScoreColor(previewScores.get(getSlotKey(part, role, idx as 0 | 1)) || 0))">
                      +{{ previewScores.get(getSlotKey(part, role, idx as 0 | 1)) }}
                    </span>
                  </template>
                  <template v-else>
                    <span class="truncate px-2">{{ stripCohort(getValue(part, role, idx as 0 | 1)) || '—' }}</span>
                  </template>

                  <!-- Clear button -->
                  <button
                    v-if="getValue(part, role, idx as 0 | 1)"
                    type="button"
                    @click="(e) => handleClearSlot(part, role, idx as 0 | 1, e)"
                    :class="clsx(
                      'absolute -top-1 -right-1 w-4 h-4 rounded-full',
                      'flex items-center justify-center',
                      'opacity-0 group-hover:opacity-100 transition-opacity',
                      'border border-[var(--color-border-subtle)] shadow-sm',
                      selectedMember === getValue(part, role, idx as 0 | 1)
                        ? 'bg-[var(--color-surface-elevated)] text-[var(--color-danger)]'
                        : 'bg-[var(--color-surface-elevated)] text-[var(--color-label-secondary)] hover:text-[var(--color-danger)]'
                    )"
                    tabindex="-1"
                  >
                    <Icon name="XMarkIcon" :size="10" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Single slot roles -->
          <div v-else class="bg-[var(--color-canvas)] p-1 flex items-center justify-center">
            <div 
              :class="[
                'relative w-full h-[var(--cell-height)] transition-colors duration-200 rounded-[var(--radius-sm)]',
                isSlotDragOver(part, role) && 'bg-blue-500/10 ring-1 ring-blue-500/50'
              ]"
              :draggable="!!getValue(part, role)"
              @dragstart="(e) => handleDragStart(e, part, role)"
              @dragend="handleDragEnd"
              @dragover="(e) => handleDragOver(e, part, role)"
              @dragleave="handleDragLeave"
              @drop="(e) => handleDrop(e, part, role)"
            >
              <div
                :class="getCellClasses(getValue(part, role), selectedMember === getValue(part, role) && getValue(part, role) !== '', isSlotDragging(part, role))"
                @click="handleSlotClick(part, role)"
              >
                <!-- Empty slot with preview score -->
                <template v-if="getValue(part, role) === '' && previewScores?.get(getSlotKey(part, role))">
                  <span :class="clsx('text-xs font-bold', getScoreColor(previewScores.get(getSlotKey(part, role)) || 0))">
                    +{{ previewScores.get(getSlotKey(part, role)) }}
                  </span>
                </template>
                <template v-else>
                  <span class="truncate px-2">{{ stripCohort(getValue(part, role)) || '—' }}</span>
                </template>

                <!-- Clear button -->
                <button
                  v-if="getValue(part, role)"
                  type="button"
                  @click="(e) => handleClearSlot(part, role, undefined, e)"
                  :class="clsx(
                    'absolute -top-1 -right-1 w-4 h-4 rounded-full',
                    'flex items-center justify-center',
                    'opacity-0 group-hover:opacity-100 transition-opacity',
                    'border border-[var(--color-border-subtle)] shadow-sm',
                    selectedMember === getValue(part, role)
                      ? 'bg-[var(--color-surface-elevated)] text-[var(--color-danger)]'
                      : 'bg-[var(--color-surface-elevated)] text-[var(--color-label-secondary)] hover:text-[var(--color-danger)]'
                  )"
                  tabindex="-1"
                >
                  <Icon name="XMarkIcon" :size="10" />
                </button>
              </div>
            </div>
          </div>
        </template>
      </template>
    </div>
  </div>
  </div>
</template>
