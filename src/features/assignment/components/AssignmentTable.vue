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



// 역할별 그라디언트 (채워진 슬롯 배경)
const ROLE_BG_CLASSES: Record<RoleKey, string> = {
  SW: 'bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-900/30 dark:to-violet-800/20',
  자막: 'bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/30 dark:to-amber-800/20',
  고정: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/30 dark:to-emerald-800/20',
  사이드: 'bg-gradient-to-br from-sky-50 to-sky-100/50 dark:from-sky-900/30 dark:to-sky-800/20',
  스케치: 'bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-900/30 dark:to-rose-800/20',
}

// 역할별 테두리 색상
const ROLE_BORDER_CLASSES: Record<RoleKey, string> = {
  SW: 'border-violet-200 dark:border-violet-700/50',
  자막: 'border-amber-200 dark:border-amber-700/50',
  고정: 'border-emerald-200 dark:border-emerald-700/50',
  사이드: 'border-sky-200 dark:border-sky-700/50',
  스케치: 'border-rose-200 dark:border-rose-700/50',
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

function getCellClasses(value: string, isSelected: boolean, isDragging: boolean = false, role?: RoleKey) {
  const isEmpty = value === ''
  const isBlank = value === BLANK_ROLE_VALUE
  
  // 기본 스타일
  const baseStyles = clsx(
    'group relative w-full h-full flex items-center justify-center',
    'text-base font-semibold transition-all duration-200 ease-out',
    'rounded-[var(--radius-md)]',
  )
  
  // 드래그 중 스타일
  if (isDragging) {
    return clsx(baseStyles, 'opacity-40 scale-95 border-2 border-dashed border-[var(--color-border-default)]')
  }
  
  // 빈 슬롯 스타일 (플러스 아이콘 영역)
  if (isEmpty) {
    return clsx(
      baseStyles,
      'border-2 border-dashed border-[var(--color-border-subtle)]',
      'text-[var(--color-label-tertiary)]',
      'hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/5',
      'hover:scale-[1.02] active:scale-100',
      isSelected ? 'cursor-pointer' : 'cursor-default'
    )
  }
  
  // 공란(blank) 슬롯 스타일
  if (isBlank) {
    return clsx(
      baseStyles,
      'bg-[var(--color-surface-elevated)]',
      'text-[var(--color-label-tertiary)] italic',
      'border-2 border-dashed border-[var(--color-border-subtle)]',
      'hover:border-[var(--color-border-default)] hover:shadow-sm',
      'cursor-grab active:cursor-grabbing'
    )
  }
  
  // 선택된 슬롯 스타일 (글로우 효과)
  if (isSelected) {
    return clsx(
      baseStyles,
      'bg-[var(--color-accent)] text-white',
      'border-2 border-[var(--color-accent)]',
      'shadow-lg shadow-[var(--color-accent)]/30',
      'scale-[1.02] z-10',
      'cursor-grab active:cursor-grabbing'
    )
  }
  
  // 채워진 슬롯 스타일 (역할별 그라디언트)
  return clsx(
    baseStyles,
    role ? ROLE_BG_CLASSES[role] : 'bg-[var(--color-surface)]',
    'text-[var(--color-label-primary)]',
    'border',
    role ? ROLE_BORDER_CLASSES[role] : 'border-[var(--color-border-subtle)]',
    'shadow-sm',
    'hover:shadow-md hover:scale-[1.02] hover:z-10',
    'active:scale-100 active:shadow-sm',
    'cursor-grab active:cursor-grabbing'
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

const gridCols = 'grid-cols-[4rem_1fr_1fr_1fr_2fr_1fr]'

// 모바일 접근성을 위한 터치 친화적 셀 높이 (WCAG 권장: 최소 48px)
const cellHeight = 'h-14' // 56px - 터치 친화적
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
        :class="clsx(
          'py-3 px-2 flex flex-col items-center justify-center gap-0.5',
          ROLE_BG_CLASSES[role]
        )"
      >
        <span :class="clsx('text-base font-bold tracking-tight', ROLE_COLORS[role])">
          {{ role }}
        </span>
        <Badge 
          variant="outline" 
          :class="clsx(
            'text-[10px] px-1.5 py-0 rounded-full h-auto min-w-[1.25rem] justify-center',
            'bg-white/50 dark:bg-black/20 border-0'
          )"
        >
          {{ ROLE_COUNTS[role] }}명
        </Badge>
      </div>
    </div>

    <!-- Rows -->
    <div :class="clsx('grid gap-px bg-[var(--color-border-subtle)]', gridCols)">
      <template v-for="part in (['part1', 'part2'] as PartKey[])" :key="part">
        <!-- Row Header -->
        <div :class="clsx(
          'bg-[var(--color-surface-elevated)] flex items-center justify-center',
          'text-sm font-bold text-[var(--color-label-secondary)]',
          'px-2'
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
                `relative w-full ${cellHeight} transition-all duration-200 rounded-[var(--radius-md)]`,
                isSlotDragOver(part, role, idx as 0 | 1) && 'ring-2 ring-[var(--color-accent)] ring-offset-2 ring-offset-[var(--color-canvas)] bg-[var(--color-accent)]/10'
              ]"
              :draggable="!!getValue(part, role, idx as 0 | 1)"
              @dragstart="(e) => handleDragStart(e, part, role, idx as 0 | 1)"
              @dragend="handleDragEnd"
              @dragover="(e) => handleDragOver(e, part, role, idx as 0 | 1)"
              @dragleave="handleDragLeave"
              @drop="(e) => handleDrop(e, part, role, idx as 0 | 1)"
            >
              <div
                :class="getCellClasses(getValue(part, role, idx as 0 | 1), selectedMember === getValue(part, role, idx as 0 | 1) && getValue(part, role, idx as 0 | 1) !== '', isSlotDragging(part, role, idx as 0 | 1), role)"
                @click="handleSlotClick(part, role, idx as 0 | 1)"
              >
                <!-- Empty slot: plus icon or preview score -->
                <template v-if="getValue(part, role, idx as 0 | 1) === ''">
                  <template v-if="previewScores?.get(getSlotKey(part, role, idx as 0 | 1))">
                    <span :class="clsx('text-xs font-bold', getScoreColor(previewScores.get(getSlotKey(part, role, idx as 0 | 1)) || 0))">
                      +{{ previewScores.get(getSlotKey(part, role, idx as 0 | 1)) }}
                    </span>
                  </template>
                  <template v-else>
                    <Icon name="PlusIcon" :size="18" class="text-[var(--color-label-tertiary)] group-hover:text-[var(--color-accent)] transition-colors" />
                  </template>
                </template>
                <!-- Filled slot -->
                <template v-else>
                  <span class="truncate px-2">{{ stripCohort(getValue(part, role, idx as 0 | 1)) }}</span>
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
              `relative w-full ${cellHeight} transition-all duration-200 rounded-[var(--radius-md)]`,
              isSlotDragOver(part, role) && 'ring-2 ring-[var(--color-accent)] ring-offset-2 ring-offset-[var(--color-canvas)] bg-[var(--color-accent)]/10'
            ]"
            :draggable="!!getValue(part, role)"
            @dragstart="(e) => handleDragStart(e, part, role)"
            @dragend="handleDragEnd"
            @dragover="(e) => handleDragOver(e, part, role)"
            @dragleave="handleDragLeave"
            @drop="(e) => handleDrop(e, part, role)"
          >
            <div
              :class="getCellClasses(getValue(part, role), selectedMember === getValue(part, role) && getValue(part, role) !== '', isSlotDragging(part, role), role)"
              @click="handleSlotClick(part, role)"
            >
              <!-- Empty slot: plus icon or preview score -->
              <template v-if="getValue(part, role) === ''">
                <template v-if="previewScores?.get(getSlotKey(part, role))">
                  <span :class="clsx('text-xs font-bold', getScoreColor(previewScores.get(getSlotKey(part, role)) || 0))">
                    +{{ previewScores.get(getSlotKey(part, role)) }}
                  </span>
                </template>
                <template v-else>
                  <Icon name="PlusIcon" :size="18" class="text-[var(--color-label-tertiary)] group-hover:text-[var(--color-accent)] transition-colors" />
                </template>
              </template>
              <!-- Filled slot -->
              <template v-else>
                <span class="truncate px-2">{{ stripCohort(getValue(part, role)) }}</span>
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
