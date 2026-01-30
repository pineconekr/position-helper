<script setup lang="ts">
/**
 * ActivityFeed.vue - 활동 피드 컴포넌트
 * 
 * 최근 활동을 표시하고 관리하는 컴포넌트
 */
import { ref, computed } from 'vue'
import { useActivityStore } from '@/stores/activity'
import { useAssignmentStore } from '@/stores/assignment'
import { Button } from '@/components/ui/button'
import Icon from '@/components/ui/Icon.vue'
import Modal from '@/components/common/Modal.vue'
import AnimatedCollapse from './AnimatedCollapse.vue'
import type { ActivityEntry, ActivityType } from '@/shared/types'

type StatusTone = 'success' | 'warning' | 'info' | 'neutral'

interface EntryStyle {
  icon: string
  bgClass: string
  textClass: string
  label: string
  tone: StatusTone
}

interface Props {
  title?: string
  filter?: ActivityType[]
  maxItems?: number
  emptyMessage?: string
  collapsible?: boolean
  defaultCollapsed?: boolean
  showUndo?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '최근 활동',
  maxItems: 16,
  emptyMessage: '최근 활동이 없습니다.',
  collapsible: true,
  defaultCollapsed: true,
  showUndo: false
})

// Store
const activityStore = useActivityStore()
const assignmentStore = useAssignmentStore()

// State
const collapsed = ref(props.collapsible && props.defaultCollapsed)
const showModal = ref(false)

// Labels and Icons
const typeLabels: Record<ActivityType, string> = {
  assignment: '배정',
  absence: '불참',
  finalize: '확정',
  member: '팀원',
  system: '시스템'
}

const typeIcons: Record<ActivityType, string> = {
  assignment: 'ClipboardDocumentCheckIcon',
  absence: 'CalendarDaysIcon',
  finalize: 'SolidCheckCircleIcon',
  member: 'UserIcon',
  system: 'Cog6ToothIcon'
}

// Helpers
function getEntryStyle(entry: ActivityEntry): EntryStyle {
  let icon = typeIcons[entry.type]
  let bgClass = ''
  let textClass = ''
  let label = typeLabels[entry.type]
  let tone: StatusTone = 'info'

  switch (entry.type) {
    case 'assignment':
      bgClass = 'bg-[var(--color-accent)]/10'
      textClass = 'text-[var(--color-accent)]'
      break
    case 'absence':
      bgClass = 'bg-[var(--color-danger)]/10'
      textClass = 'text-[var(--color-danger)]'
      break
    case 'finalize':
      bgClass = 'bg-[var(--color-success)]/10'
      textClass = 'text-[var(--color-success)]'
      tone = 'success'
      break
    case 'member':
      bgClass = 'bg-[var(--color-surface-elevated)]'
      textClass = 'text-[var(--color-label-primary)]'
      break
    case 'system':
      bgClass = 'bg-[var(--color-surface-elevated)]'
      textClass = 'text-[var(--color-label-secondary)]'
      tone = 'neutral'
      break
  }

  // Assignment 세부 상태 확인
  if (entry.type === 'assignment') {
    const before = entry.meta?.before as string | undefined
    const after = entry.meta?.after as string | undefined

    if (before && !after) {
      icon = 'UserMinusIcon'
      bgClass = 'bg-[var(--color-surface-elevated)]'
      textClass = 'text-[var(--color-label-secondary)]'
      label = '해제'
      tone = 'warning'
    } else if (before && after && before !== after) {
      icon = 'ArrowsRightLeftIcon'
      label = '변경'
      tone = 'info'
    }
  }

  return { icon, bgClass, textClass, label, tone }
}

function formatTime(timestamp: string): string {
  try {
    const date = new Date(timestamp)
    return date.toLocaleString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return timestamp
  }
}

function getToneClass(tone: StatusTone): string {
  const classes: Record<StatusTone, string> = {
    success: 'bg-[var(--color-success)]',
    warning: 'bg-[var(--color-warning)]',
    info: 'bg-[var(--color-accent)]',
    neutral: 'bg-[var(--color-label-tertiary)]'
  }
  return classes[tone]
}

// Computed
const filteredEntries = computed(() => {
  const logs = activityStore.activityLog
  return props.filter && props.filter.length > 0
    ? logs.filter((entry: ActivityEntry) => props.filter!.includes(entry.type))
    : logs
})

const displayEntries = computed(() => {
  const maxVisible = collapsed.value ? 1 : props.maxItems
  return filteredEntries.value.slice(0, maxVisible)
})

const newCount = computed(() => Math.max(0, filteredEntries.value.length - 1))

const canUndo = computed(() => assignmentStore.canUndo)

// Actions
function handleRemove(id: string) {
  activityStore.removeActivity(id)
}

function handleUndo() {
  assignmentStore.undoLastAssignment()
}

function toggleCollapse() {
  if (props.collapsible) {
    collapsed.value = !collapsed.value
  }
}
</script>

<template>
  <!-- Empty State -->
  <div
    v-if="filteredEntries.length === 0"
    class="p-3 rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] flex justify-between items-center"
  >
    <div class="text-sm font-semibold text-[var(--color-label-primary)]">{{ title }}</div>
    <span class="text-sm text-[var(--color-label-tertiary)]">{{ emptyMessage }}</span>
  </div>

  <!-- Activity Feed -->
  <template v-else>
    <div class="p-3 rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] shadow-sm">
      <!-- Header -->
      <div
        :class="[
          'flex items-center justify-between select-none',
          collapsed ? 'mb-0' : 'mb-3',
          collapsible ? 'cursor-pointer' : 'cursor-default'
        ]"
        @click="toggleCollapse"
      >
        <div class="flex items-center gap-2">
          <div class="text-sm font-semibold text-[var(--color-label-primary)]">{{ title }}</div>
          <span
            v-if="collapsed && newCount > 0"
            class="text-xs px-1.5 py-0.5 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-medium"
          >
            +{{ newCount }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <!-- Undo Button -->
          <button
            v-if="showUndo && canUndo"
            type="button"
            @click.stop="handleUndo"
            class="flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium rounded-[4px] bg-[var(--color-warning)]/10 text-[var(--color-warning)] hover:bg-[var(--color-warning)]/20 transition-colors"
          >
            <Icon name="ArrowUturnLeftIcon" :size="12" />
            <span>실행취소</span>
          </button>
          <!-- Collapse Toggle -->
          <Icon
            v-if="collapsible"
            name="ChevronDownIcon"
            :size="16"
            :class="[
              'text-[var(--color-label-tertiary)] transition-transform',
              collapsed ? 'rotate-0' : 'rotate-180'
            ]"
          />
        </div>
      </div>

      <!-- Activity List -->
      <AnimatedCollapse :isOpen="!collapsed">
        <ul class="flex flex-col gap-1.5 list-none">
          <li
            v-for="entry in displayEntries"
            :key="entry.id"
            class="flex items-center py-2 px-3 rounded-[var(--radius-sm)] bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-sm"
          >
            <div
              :class="[
                'w-6 h-6 rounded-[4px] flex items-center justify-center shrink-0',
                getEntryStyle(entry).bgClass,
                getEntryStyle(entry).textClass
              ]"
            >
              <Icon :name="getEntryStyle(entry).icon" :size="14" />
            </div>
            <div class="flex-1 min-w-0 ml-3 flex items-center gap-2">
              <div class="flex items-center shrink-0">
                <span :class="['inline-block w-1.5 h-1.5 rounded-full shrink-0 mr-2', getToneClass(getEntryStyle(entry).tone)]" />
                <span class="font-semibold text-[var(--color-label-primary)]">{{ getEntryStyle(entry).label }}</span>
              </div>
              <span class="text-[var(--color-label-tertiary)]">|</span>
              <span class="flex-1 truncate text-[var(--color-label-secondary)]">
                {{ entry.description || entry.title }}
              </span>
              <time class="text-xs text-[var(--color-label-tertiary)] whitespace-nowrap ml-auto">
                {{ formatTime(entry.timestamp) }}
              </time>
            </div>
          </li>
        </ul>
        <div class="flex justify-center mt-2">
          <Button
            size="sm"
            variant="ghost"
            class="text-xs h-6"
            @click.stop="showModal = true"
          >
            전체 기록 보기
          </Button>
        </div>
      </AnimatedCollapse>
    </div>

    <!-- Full Activity Modal -->
    <Modal
      title="활동 기록 전체"
      :open="showModal"
      @close="showModal = false"
    >
      <ul class="flex flex-col gap-2 list-none">
        <li
          v-for="entry in filteredEntries"
          :key="entry.id"
          class="flex gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--color-canvas)] border border-[var(--color-border-subtle)] group"
        >
          <div
            :class="[
              'w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0',
              getEntryStyle(entry).bgClass,
              getEntryStyle(entry).textClass
            ]"
          >
            <Icon :name="getEntryStyle(entry).icon" :size="16" />
          </div>
          <div class="flex-1 min-w-0 flex flex-col gap-0.5">
            <div class="flex items-center justify-between mb-0.5">
              <div class="flex items-center gap-2">
                <span :class="['inline-block w-1.5 h-1.5 rounded-full shrink-0', getToneClass(getEntryStyle(entry).tone)]" />
                <span class="text-xs font-semibold text-[var(--color-label-secondary)] uppercase">
                  {{ getEntryStyle(entry).label }}
                </span>
                <time class="text-xs text-[var(--color-label-tertiary)]">
                  {{ formatTime(entry.timestamp) }}
                </time>
              </div>
              <button
                type="button"
                class="opacity-0 group-hover:opacity-100 p-1 text-[var(--color-label-tertiary)] hover:text-[var(--color-danger)] transition-opacity"
                @click="handleRemove(entry.id)"
              >
                <Icon name="XMarkIcon" :size="14" />
              </button>
            </div>
            <div class="text-base font-medium text-[var(--color-label-primary)]">{{ entry.title }}</div>
            <div v-if="entry.description" class="text-sm text-[var(--color-label-secondary)]">
              {{ entry.description }}
            </div>
          </div>
        </li>
      </ul>
      <div v-if="filteredEntries.length === 0" class="text-center py-8 text-[var(--color-label-tertiary)] text-sm">
        기록이 없습니다.
      </div>
    </Modal>
  </template>
</template>
