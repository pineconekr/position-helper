<script setup lang="ts">
/**
 * AssignPage.vue - 배정 페이지
 * 
 * 드래그앤드롭을 통한 역할 배정 메인 페이지
 */
import { computed } from 'vue'
import { useAssignmentStore } from '@/stores/assignment'
import { useToast } from '@/composables/useToast'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { analyzeDraft, slotToLabel } from '@/shared/utils/assignment'
import { saveJsonFile, openJsonFile } from '@/shared/utils/json'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Icon from '@/components/ui/Icon.vue'
import AssignmentBoard from '../components/AssignmentBoard.vue'

// Store & Composables
const assignmentStore = useAssignmentStore()
const { toast } = useToast()
const { confirm } = useConfirmDialog()

// Computed
const currentWeekDate = computed(() => assignmentStore.currentWeekDate)
const draft = computed(() => assignmentStore.currentDraft)
const warnings = computed(() => assignmentStore.warnings)

// Helpers
function buildFileName(dateISO?: string): string {
  if (!dateISO) return 'Position_data'
  const [year, month, day] = dateISO.split('-')
  if (!year || !month || !day) return 'Position_data'
  const compact = `${year.slice(-2)}${month}${day}`
  return `${compact}_Position_data`
}

// Actions
async function handleImport() {
  try {
    const data = await openJsonFile()
    if (data) {
      assignmentStore.importData(data)
      toast({
        kind: 'success',
        title: '데이터를 불러왔어요',
        description: `총 ${Object.keys(data.weeks).length}주 기록과 팀원 ${data.members.length}명이 로드되었습니다.`
      })
    } else {
      toast({
        kind: 'info',
        title: '파일이 선택되지 않았어요',
        description: '작업이 취소되었습니다.'
      })
    }
  } catch (error) {
    console.error('불러오기 오류:', error)
    toast({
      kind: 'error',
      title: '불러오기 실패',
      description: '파일 형식이 올바르지 않거나 손상되었습니다.'
    })
  }
}

async function handleExport() {
  try {
    const fileName = buildFileName(currentWeekDate.value)
    const success = await saveJsonFile(assignmentStore.exportData(), fileName)
    if (success) {
      toast({
        kind: 'success',
        title: 'JSON으로 내보냈어요',
        description: `파일(downloads/${fileName}.json)이 저장되었습니다.`
      })
    } else {
      toast({
        kind: 'error',
        title: '내보내지 못했어요',
        description: '파일 저장 중 문제가 발생했습니다.'
      })
    }
  } catch (error) {
    console.error('내보내기 오류:', error)
    toast({
      kind: 'error',
      title: '내보내기 오류',
      description: '예기치 않은 오류가 발생했습니다.'
    })
  }
}

async function handleFinalize() {
  const { emptySlots } = analyzeDraft(draft.value)
  const previewSlots = emptySlots.slice(0, 3).map((slot) => slotToLabel(slot)).join(', ')
  const extraSlots = emptySlots.length > 3 ? ` 외 ${emptySlots.length - 3}개` : ''

  if (emptySlots.length > 0) {
    const description = [
      previewSlots ? `미배정: ${previewSlots}${extraSlots}` : '',
      '배정을 마치지 않고도 확정할 수 있습니다. 계속 진행할까요?'
    ].filter(Boolean).join('\n')
    
    const confirmed = await confirm({
      title: `미배정 역할 ${emptySlots.length}개`,
      description,
      confirmText: '계속 진행',
      cancelText: '돌아가기',
      variant: 'warning'
    })
    
    if (!confirmed) {
      return
    }
  }

  if (warnings.value.length > 0) {
    const confirmed = await confirm({
      title: `경고 ${warnings.value.length}건`,
      description: '경고 사항이 남아 있습니다. 현재 상태로 확정할까요?',
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
  <div class="space-y-5">
    <!-- Action Bar -->
    <Card class="p-3">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <!-- Left: Info -->
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-[var(--radius-sm)] bg-[var(--color-accent)]/10 flex items-center justify-center border border-[var(--color-accent)]/20">
            <Icon name="drag_indicator" :size="18" class="text-[var(--color-accent)]" />
          </div>
          <div>
            <div class="text-sm font-bold text-[var(--color-label-primary)]">드래그로 배정</div>
            <div class="text-xs text-[var(--color-label-secondary)]">팀원을 역할 슬롯에 끌어다 놓으세요</div>
          </div>
        </div>

        <!-- Right: Actions -->
        <div class="flex items-center gap-2 self-end sm:self-auto">
          <div class="w-px h-5 bg-[var(--color-border-subtle)] mx-1" />

          <Button variant="outline" size="sm" @click="handleImport">
            <Icon name="upload" :size="16" />
            불러오기
          </Button>
          <Button variant="outline" size="sm" @click="handleExport">
            <Icon name="download" :size="16" />
            내보내기
          </Button>

          <div class="w-px h-5 bg-[var(--color-border-subtle)] mx-1" />

          <Button variant="default" size="sm" @click="handleFinalize">
            <Icon name="check" :size="16" />
            확정
          </Button>
        </div>
      </div>
    </Card>

    <!-- Assignment Board -->
    <AssignmentBoard />
  </div>
</template>
