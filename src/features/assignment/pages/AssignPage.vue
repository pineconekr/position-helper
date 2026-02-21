<script setup lang="ts">
/**
 * AssignPage.vue - 배정 페이지
 * 
 * 드래그앤드롭을 통한 역할 배정 메인 페이지
 * Import/Export는 설정 → 데이터 관리에서 수행
 */
import { computed } from 'vue'
import { useAssignmentStore } from '@/stores/assignment'
import { useToast } from '@/composables/useToast'
import { modal } from '@/shared/composables/useModal'
import { analyzeDraft, slotToLabel } from '@/shared/utils/assignment'
import { Button } from '@/components/ui/button'
import Icon from '@/components/ui/Icon.vue'
import AssignmentBoard from '../components/AssignmentBoard.vue'

// Store & Composables
const assignmentStore = useAssignmentStore()
const { toast } = useToast()

// Computed
const draft = computed(() => assignmentStore.currentDraft)
const warnings = computed(() => assignmentStore.warnings)
const blockingWarnings = computed(() => warnings.value.filter((warning) => warning.level !== 'info'))

// Actions
async function handleFinalize() {
  const { emptySlots } = analyzeDraft(draft.value)
  const previewSlots = emptySlots.slice(0, 3).map((slot) => slotToLabel(slot)).join(', ')
  const extraSlots = emptySlots.length > 3 ? ` 외 ${emptySlots.length - 3}개` : ''

  if (emptySlots.length > 0) {
    const message = [
      previewSlots ? `미배정: ${previewSlots}${extraSlots}` : '',
      '배정을 마치지 않고도 확정할 수 있습니다. 계속 진행할까요?'
    ].filter(Boolean).join('\n')
    
    const confirmed = await modal.confirm({
      title: `미배정 역할 ${emptySlots.length}개`,
      message,
      confirmText: '계속 진행',
      cancelText: '돌아가기',
      variant: 'warning'
    })
    
    if (!confirmed) {
      return
    }
  }

  if (blockingWarnings.value.length > 0) {
    const errorCount = blockingWarnings.value.filter((warning) => warning.level === 'error').length
    const warnCount = blockingWarnings.value.filter((warning) => warning.level === 'warn').length
    const breakdown = [
      errorCount > 0 ? `긴급 ${errorCount}건` : '',
      warnCount > 0 ? `주의 ${warnCount}건` : '',
    ].filter(Boolean).join(', ')

    const confirmed = await modal.confirm({
      title: `경고 ${blockingWarnings.value.length}건`,
      message: `${breakdown}\n경고 사항이 남아 있습니다. 현재 상태로 확정할까요?`,
      confirmText: '확정하기',
      cancelText: '취소',
      variant: 'warning'
    })
    
    if (!confirmed) {
      return
    }
  }

  assignmentStore.finalizeCurrentWeek()
  toast({
    kind: 'success',
    title: '확정 완료',
    description: '이번 주 배정이 저장되었습니다.'
  })
}
</script>

<template>
  <div class="space-y-4">
    <section class="surface-panel px-4 py-4 sm:px-6 sm:py-5">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="space-y-1.5">
          <p class="section-eyebrow">Assignment Workspace</p>
          <h1 class="section-title">배정</h1>
          <p class="section-description">팀원을 드래그하거나 클릭해서 각 역할 슬롯에 배정합니다.</p>
        </div>
        <div class="flex w-full items-center gap-2 sm:w-auto">
          <Button variant="default" @click="handleFinalize" class="h-10 w-full px-4 font-semibold sm:w-auto">
            <Icon name="CheckIcon" :size="16" />
            확정
          </Button>
        </div>
      </div>
    </section>

    <AssignmentBoard />
  </div>
</template>
