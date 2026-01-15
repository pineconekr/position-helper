<script setup lang="ts">
/**
 * MemberList.vue - Vue 3 버전
 */
import { computed, ref } from 'vue'
import { useAssignmentStore } from '@/stores/assignment'
import { BLANK_ROLE_VALUE } from '@/shared/utils/assignment'
import { encodeMemberId } from '@/shared/utils/dndIds'
import Icon from '@/components/ui/Icon.vue'
import { Card, CardContent } from '@/components/ui/card'
import clsx from 'clsx'

interface Props {
  orientation?: 'vertical' | 'horizontal'
  selectedMember?: string | null
  variant?: 'panel' | 'inline'
  title?: string | null
  showInactive?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  orientation: 'vertical',
  variant: 'panel',
  title: '팀원 목록',
  showInactive: false
})

const emit = defineEmits<{
  'member-click': [name: string]
  'toggle-inactive': []
}>()

const store = useAssignmentStore()

// 비활성 멤버 표시 여부
const internalShowInactive = ref(false)
const showInactive = computed(() => props.showInactive || internalShowInactive.value)

function handleToggleInactive() {
  internalShowInactive.value = !internalShowInactive.value
  emit('toggle-inactive')
}

// 비활성 멤버 수
const inactiveCount = computed(() => 
  store.app.members.filter(m => m.active === false).length
)

// 표시할 멤버 목록
const members = computed(() => 
  showInactive.value 
    ? store.app.members 
    : store.app.members.filter(m => m.active !== false)
)

// 현재 주차 불참자 목록
const absentNames = computed(() => {
  const absences = store.app.weeks[store.currentWeekDate]?.absences ?? []
  return new Set(absences.map(a => a.name))
})

// 배정 횟수 맵
const assignmentCounts = computed(() => {
  const counts = new Map<string, number>()
  const draft = store.currentDraft
  if (!draft) return counts

  const parts = [draft.part1, draft.part2]
  parts.forEach(p => {
    const increment = (name: string) => {
      if (name) counts.set(name, (counts.get(name) || 0) + 1)
    }
    increment(p.SW)
    increment(p['자막'])
    increment(p['고정'])
    increment(p['스케치'])
    p['사이드'].forEach(n => increment(n))
  })
  return counts
})

// 멤버 아이템 목록
const items = computed(() => {
  const byCohort = [...members.value].sort((a, b) => {
    const parse = (name: string) => {
      const m = name.match(/^(\d{2})\s/)
      return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER
    }
    const aGen = parse(a.name)
    const bGen = parse(b.name)
    if (aGen !== bGen) return aGen - bGen
    return a.name.localeCompare(b.name, 'ko')
  })
  
  const mapped = byCohort.map(m => ({
    id: encodeMemberId(m.name),
    label: m.name,
    value: m.name,
    inactive: m.active === false
  }))
  
  // 공란 아이템 추가
  return [...mapped, { 
    id: encodeMemberId(BLANK_ROLE_VALUE), 
    label: '공란', 
    value: '', 
    inactive: false 
  }]
})

function getItemClasses(item: typeof items.value[0]) {
  const isAbsent = item.value !== '' && absentNames.value.has(item.value)
  const count = item.value !== '' ? (assignmentCounts.value.get(item.value) || 0) : 0
  const isSelected = props.selectedMember === item.value

  return clsx(
    'px-3 py-1.5 rounded-full border',
    'flex items-center gap-1.5 min-h-[var(--pill-height)]',
    'text-sm font-medium',
    // 비활성/불참이 아닌 경우 드래그 가능한 요소 스타일 적용
    !item.inactive && !isAbsent && 'draggable-item',
    // 비활성 상태
    item.inactive && 'border-dashed border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-[var(--color-label-tertiary)] cursor-not-allowed',
    // 불참 상태
    !item.inactive && isAbsent && 'border-[var(--color-danger)] bg-[var(--color-danger)]/5 text-[var(--color-label-tertiary)] cursor-not-allowed',
    // 선택 상태
    !item.inactive && !isAbsent && isSelected && 'bg-[var(--color-accent)] text-white border-transparent shadow-sm',
    // 배정된 상태
    !item.inactive && !isAbsent && !isSelected && count > 0 && 'bg-[var(--color-surface-elevated)] text-[var(--color-label-secondary)] border-[var(--color-border-subtle)]',
    // 기본 상태
    !item.inactive && !isAbsent && !isSelected && count === 0 && 'bg-[var(--color-surface)] border-[var(--color-border-subtle)] text-[var(--color-label-primary)]'
  )
}

function handleClick(item: typeof items.value[0]) {
  if (item.inactive || absentNames.value.has(item.value) || item.value === '') return
  emit('member-click', item.value)
}

function handleDragStart(e: DragEvent, item: typeof items.value[0]) {
  if (item.inactive || absentNames.value.has(item.value)) {
    e.preventDefault()
    return
  }
  e.dataTransfer?.setData('text/plain', item.id)
  e.dataTransfer!.effectAllowed = 'move'
}

const isInline = computed(() => props.variant === 'inline')
</script>

<template>
  <!-- Panel wrapper -->
  <Card v-if="!isInline">
    <CardContent class="p-3">
    <div v-if="title" class="text-sm font-semibold mb-2 flex items-center justify-between text-[var(--color-label-secondary)]">
      <span>{{ title }}</span>
      <button
        type="button"
        @click="handleToggleInactive"
        :class="clsx(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all',
          showInactive
            ? 'bg-[var(--color-accent)] text-white shadow-sm'
            : 'bg-[var(--color-surface-elevated)] text-[var(--color-label-tertiary)] hover:text-[var(--color-label-secondary)] border border-[var(--color-border-subtle)]'
        )"
      >
        <Icon :name="showInactive ? 'visibility' : 'visibility_off'" :size="14" />
        <span>비활성 멤버 포함 {{ inactiveCount > 0 ? `(${inactiveCount})` : '' }}</span>
      </button>
    </div>

    <div :class="`flex gap-2 ${orientation === 'horizontal' ? 'flex-row flex-wrap' : 'flex-col'}`">
      <div
        v-for="(item, idx) in items"
        :key="item.id"
        v-motion
        :initial="{ opacity: 0, y: 10 }"
        :enter="{ opacity: 1, y: 0, transition: { delay: idx * 30 } }"
        :class="getItemClasses(item)"
        :draggable="!item.inactive && !absentNames.has(item.value)"
        :data-member-id="item.id"
        @click="handleClick(item)"
        @dragstart="(e) => handleDragStart(e, item)"
      >
        <!-- 비활성 아이콘 -->
        <Icon v-if="item.inactive" name="block" :size="12" class="text-[var(--color-label-tertiary)]" />
        
        <!-- 불참 아이콘 -->
        <Icon v-else-if="absentNames.has(item.value)" name="person_off" :size="12" class="text-[var(--color-danger)]" />
        
        <!-- 배정 횟수 배지 -->
        <span
          v-else-if="item.value !== '' && (assignmentCounts.get(item.value) || 0) > 0"
          :class="clsx(
            'text-[10px] font-bold rounded-full min-w-[var(--badge-size-sm)] h-[var(--badge-size-sm)] flex items-center justify-center px-1',
            selectedMember === item.value
              ? 'bg-[var(--color-surface-elevated)]/30 text-[var(--color-surface-elevated)]'
              : 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
          )"
        >
          ×{{ assignmentCounts.get(item.value) }}
        </span>

        <!-- 이름 -->
        <span :class="item.inactive || absentNames.has(item.value) ? 'line-through' : ''">
          {{ item.label }}
        </span>
      </div>

      <div v-if="items.length === 0" class="text-xs text-[var(--color-label-tertiary)] py-2">
        팀원을 먼저 추가하세요
      </div>
    </div>
    </CardContent>
  </Card>

  <!-- Inline variant -->
  <div v-else class="flex flex-col gap-2">
    <div :class="`flex gap-2 ${orientation === 'horizontal' ? 'flex-row flex-wrap' : 'flex-col'}`">
      <div
        v-for="(item, idx) in items"
        :key="item.id"
        v-motion
        :initial="{ opacity: 0, y: 10 }"
        :enter="{ opacity: 1, y: 0, transition: { delay: idx * 30 } }"
        :class="getItemClasses(item)"
        :draggable="!item.inactive && !absentNames.has(item.value)"
        @click="handleClick(item)"
        @dragstart="(e) => handleDragStart(e, item)"
      >
        <Icon v-if="item.inactive" name="block" :size="12" class="text-[var(--color-label-tertiary)]" />
        <Icon v-else-if="absentNames.has(item.value)" name="person_off" :size="12" class="text-[var(--color-danger)]" />
        <span>{{ item.label }}</span>
      </div>
    </div>
  </div>
</template>
