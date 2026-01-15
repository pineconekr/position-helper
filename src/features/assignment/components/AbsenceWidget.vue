<script setup lang="ts">
/**
 * AbsenceWidget.vue - 불참자 관리 위젯
 */
import { ref, computed } from 'vue'
import { useAssignmentStore } from '@/stores/assignment'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import Modal from '@/components/common/Modal.vue'
import Icon from '@/components/ui/Icon.vue'
import clsx from 'clsx'

const store = useAssignmentStore()

// Form state
const absenceForm = ref({ name: '', reason: '' })
const editingAbsence = ref<{ name: string; reason: string } | null>(null)

// Computed
const currentWeekDate = computed(() => store.currentWeekDate)
const members = computed(() => store.app.members.filter(m => m.active))
const currentAbsences = computed(() => 
  store.app.weeks[store.currentWeekDate]?.absences ?? []
)

// Actions
function addAbsence() {
  if (!currentWeekDate.value || !absenceForm.value.name) return
  
  const newAbsences = [
    ...currentAbsences.value,
    { name: absenceForm.value.name, reason: absenceForm.value.reason }
  ]
  store.updateAbsences(currentWeekDate.value, newAbsences)
  absenceForm.value = { name: '', reason: '' }
}

function removeAbsence(name: string) {
  if (!currentWeekDate.value) return
  
  const newAbsences = currentAbsences.value.filter(a => a.name !== name)
  store.updateAbsences(currentWeekDate.value, newAbsences)
}

function openEditAbsence(name: string) {
  const absence = currentAbsences.value.find(a => a.name === name)
  if (absence) {
    editingAbsence.value = { name: absence.name, reason: absence.reason || '' }
  }
}

function saveAbsenceReason() {
  if (!currentWeekDate.value || !editingAbsence.value) return
  
  const newAbsences = currentAbsences.value.map(a => 
    a.name === editingAbsence.value!.name
      ? { ...a, reason: editingAbsence.value!.reason }
      : a
  )
  store.updateAbsences(currentWeekDate.value, newAbsences)
  editingAbsence.value = null
}
</script>

<template>
  <Card>
    <CardContent class="p-4 space-y-4">
    <div class="flex items-center justify-between pb-3 border-b border-[var(--color-border-subtle)]">
      <div class="text-sm font-bold text-[var(--color-label-primary)] flex items-center gap-2">
        <Icon name="event_busy" :size="16" class="text-[var(--color-label-tertiary)]" />
        불참자 관리
      </div>
      <span 
        v-if="currentAbsences.length > 0"
        class="px-1.5 py-0.5 rounded-[4px] bg-[var(--color-danger)]/10 text-[var(--color-danger)] text-xs font-medium"
      >
        {{ currentAbsences.length }}명
      </span>
    </div>

    <div class="flex flex-col gap-3">
      <div class="space-y-1">
        <label class="text-xs font-medium text-[var(--color-label-secondary)]">팀원 선택</label>
        <div class="relative">
          <select
            v-model="absenceForm.name"
            :class="clsx(
              'w-full h-8 pl-2 pr-8 rounded-[var(--radius-sm)] appearance-none',
              'bg-[var(--color-surface)] border border-[var(--color-border-default)]',
              'text-sm text-[var(--color-label-primary)]',
              'focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]',
              'transition-all duration-100'
            )"
          >
            <option value="">선택해주세요</option>
            <option v-for="m in members" :key="m.name" :value="m.name">{{ m.name }}</option>
          </select>
          <div class="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-label-tertiary)]">
            <Icon name="expand_more" :size="16" />
          </div>
        </div>
      </div>

      <div class="space-y-1">
        <label class="text-xs font-medium text-[var(--color-label-secondary)]">사유 (선택)</label>
        <Input
          v-model="absenceForm.reason"
          placeholder="예: 시험, 여행"
          class="bg-[var(--color-surface)]"
        />
      </div>

      <Button
        variant="default"
        @click="addAbsence"
        :disabled="!currentWeekDate || !absenceForm.name"
        class="w-full justify-center"
        size="sm"
      >
        불참 등록
      </Button>
    </div>

    <!-- Absence list -->
    <div v-if="currentAbsences.length > 0" class="space-y-2 pt-2">
      <div
        v-for="a in currentAbsences"
        :key="a.name"
        class="flex items-center justify-between p-2 rounded-[var(--radius-sm)] bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] group"
      >
        <div class="flex flex-col">
          <span class="text-sm font-medium text-[var(--color-label-primary)]">{{ a.name }}</span>
          <span class="text-xs text-[var(--color-label-tertiary)]">{{ a.reason || '사유 없음' }}</span>
        </div>
        <div class="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
          <button
            @click="openEditAbsence(a.name)"
            class="p-1 text-[var(--color-label-secondary)] hover:text-[var(--color-accent)] rounded-[4px] hover:bg-[var(--color-surface)]"
          >
            <Icon name="edit" :size="14" />
          </button>
          <button
            @click="removeAbsence(a.name)"
            class="p-1 text-[var(--color-label-secondary)] hover:text-[var(--color-danger)] rounded-[4px] hover:bg-[var(--color-surface)]"
          >
            <Icon name="close" :size="14" />
          </button>
        </div>
      </div>
    </div>

    <!-- No week selected warning -->
    <div 
      v-if="!currentWeekDate"
      class="text-xs text-[var(--color-danger)] text-center py-2 bg-[var(--color-danger)]/5 rounded-[var(--radius-sm)]"
    >
      주차를 먼저 선택해주세요
    </div>

    </CardContent>
  </Card>

  <!-- Edit Modal -->
  <Modal
    :title="editingAbsence ? `사유 수정 - ${editingAbsence.name}` : '사유 수정'"
    :open="editingAbsence !== null"
    @close="editingAbsence = null"
    size="sm"
  >
    <div class="flex flex-col gap-1.5">
      <label class="text-xs font-medium text-[var(--color-label-secondary)]">사유 입력</label>
      <Textarea
        v-if="editingAbsence"
        v-model="editingAbsence.reason"
        placeholder="불참 사유를 수정하세요"
      />
    </div>

    <template #footer>
      <Button variant="ghost" @click="editingAbsence = null">취소</Button>
      <Button variant="default" @click="saveAbsenceReason">저장</Button>
    </template>
  </Modal>
</template>
