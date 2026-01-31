<script setup lang="ts">
/**
 * AssignmentBoard.vue - 배정 보드 (메인 컴포넌트)
 * 
 * 클릭 또는 드래그로 팀원을 역할에 배정하는 메인 보드
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAssignmentStore } from '@/stores/assignment'
import { useToast } from '@/composables/useToast'
import { formatDateISO } from '@/shared/utils/date'
import { validateAssignment, getPartLabel, type PartKey } from '../utils/slotValidation'
import { type RoleKey } from '@/shared/types'
import { decodeMemberId } from '@/shared/utils/dndIds'
import { BLANK_ROLE_VALUE } from '@/shared/utils/assignment'
import AssignmentSummary from './AssignmentSummary.vue'
import AssignmentTable from './AssignmentTable.vue'
import MemberList from './MemberList.vue'

import AbsenceWidget from './AbsenceWidget.vue'
import WarningWidget from './WarningWidget.vue'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import Icon from '@/components/ui/Icon.vue'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'


// Store & Composables
const assignmentStore = useAssignmentStore()
const { toast } = useToast()

// State
const selectedMember = ref<string | null>(null)
const showInactive = ref(false)

// Computed
const currentWeekDate = computed(() => assignmentStore.currentWeekDate)
const draft = computed(() => assignmentStore.currentDraft)

const app = computed(() => assignmentStore.app)
const canUndo = computed(() => assignmentStore.canUndo)
const currentAbsences = computed(() => {
  return app.value.weeks[currentWeekDate.value]?.absences ?? []
})



// Keyboard shortcut for undo (Ctrl+Z / Cmd+Z)
function handleKeyDown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
    e.preventDefault()
    handleUndo()
  }
}

// Lifecycle
onMounted(() => {
  if (!currentWeekDate.value) {
    const today = formatDateISO(new Date())
    assignmentStore.setWeekDate(today)
  }
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})



// Actions
function handleMemberClick(name: string) {
  selectedMember.value = selectedMember.value === name ? null : name
}

function handleSlotClick(part: PartKey, role: RoleKey, index?: 0 | 1) {
  if (!selectedMember.value) return

  const validation = validateAssignment(draft.value, part, role, selectedMember.value, index)

  if (!validation.canAssign) {
    if (validation.reason === 'same_slot') {
      selectedMember.value = null
      toast({
        kind: 'info',
        title: '알림',
        description: '이미 해당 슬롯에 배정되어 있습니다.'
      })
    } else {
      toast({
        kind: 'error',
        title: '배정 불가',
        description: `${getPartLabel(part)}에 이미 배정된 인원입니다.`
      })
    }
    return
  }

  assignmentStore.assignRole(part, role, selectedMember.value, index)
  selectedMember.value = null
}

function handleClearSlot(part: PartKey, role: RoleKey, index?: 0 | 1) {
  assignmentStore.clearRole(part, role, index)
}

function handleDrop(part: PartKey, role: RoleKey, memberId: string, index?: 0 | 1) {
  // Decode the member ID from the drag data
  const rawName = decodeMemberId(memberId)
  if (rawName === null) return

  const value = rawName === BLANK_ROLE_VALUE ? BLANK_ROLE_VALUE : rawName

  // If dropping blank, just assign it
  if (value === BLANK_ROLE_VALUE) {
    assignmentStore.assignRole(part, role, value, index)
    selectedMember.value = null
    return
  }

  // Validate the assignment
  const validation = validateAssignment(draft.value, part, role, value, index)

  if (!validation.canAssign) {
    if (validation.reason !== 'same_slot') {
      toast({
        kind: 'error',
        title: '배정 불가',
        description: `${getPartLabel(part)}에 이미 배정된 인원입니다.`
      })
    }
    return
  }

  assignmentStore.assignRole(part, role, value, index)
  selectedMember.value = null
}

function handleUndo() {
  if (!canUndo.value) {
    toast({
      kind: 'info',
      title: '알림',
      description: '되돌릴 작업이 없습니다.'
    })
    return
  }
  assignmentStore.undoLastAssignment()
  toast({
    kind: 'success',
    title: '실행 취소',
    description: '마지막 배정 작업이 취소되었습니다.'
  })
}

// 슬롯 간 교환 (배정된 팀원 간 이동/스왓)
function handleSlotSwap(
  sourcePart: PartKey,
  sourceRole: RoleKey,
  sourceIndex: 0 | 1 | undefined,
  targetPart: PartKey,
  targetRole: RoleKey,
  targetIndex: 0 | 1 | undefined
) {
  const source = sourceRole === '사이드'
    ? { part: sourcePart, role: sourceRole, index: sourceIndex }
    : { part: sourcePart, role: sourceRole }
  const target = targetRole === '사이드'
    ? { part: targetPart, role: targetRole, index: targetIndex }
    : { part: targetPart, role: targetRole }

  assignmentStore.moveRole(source, target)
  
  toast({
    kind: 'success',
    title: '역할 교환',
    description: '배정이 교환되었습니다.'
  })
}

function handleWeekChange(event: Event) {
  const target = event.target as HTMLInputElement
  const value = target.value
  if (value) {
    assignmentStore.setWeekDate(value)
  }
}


</script>

<template>
  <div class="flex flex-wrap gap-4 items-start">
    <!-- 메인 컬럼 (배정판) -->
    <div class="flex-[1_1_500px] min-w-0 flex flex-col gap-4">
      <AssignmentSummary />

      <Card>
        <CardContent class="p-4 space-y-4">
        <!-- 주차 선택 & 경고 배지 -->
        <div class="flex justify-between items-center flex-wrap gap-3 pb-4 border-b border-[var(--color-border-subtle)]">
          <div class="flex gap-2 items-center flex-wrap">
            <label class="text-sm font-medium text-[var(--color-label-secondary)]">주차</label>
            <Input
              type="date"
              :value="currentWeekDate || formatDateISO(new Date())"
              @input="handleWeekChange"
              class="w-auto px-2 py-1 h-8 text-sm"
            />
            <Badge v-if="currentAbsences.length > 0" variant="destructive">
              불참 {{ currentAbsences.length }}
            </Badge>
          </div>

        </div>

        <!-- 배정 테이블 -->
        <div>
          <div class="flex items-center justify-between gap-2 mb-2">
            <div class="flex items-center gap-2">
              <span class="text-base font-bold text-[var(--color-label-primary)]">배정</span>
              <span class="text-xs text-[var(--color-label-tertiary)]">
                드래그하여 배정하세요
              </span>
              <!-- Undo 버튼 -->
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      v-if="canUndo"
                      size="sm"
                      variant="ghost"
                      @click="handleUndo"
                      class="!px-2 !py-1 !h-auto text-xs active:scale-95 transition-transform origin-left"
                    >
                      <Icon name="ArrowUturnLeftIcon" :size="14" />
                      <span class="ml-1">되돌리기</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>되돌리기 (Ctrl+Z)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <AssignmentTable
            :selectedMember="selectedMember"
            @slot-click="handleSlotClick"
            @clear-slot="handleClearSlot"
            @drop="handleDrop"
            @slot-swap="handleSlotSwap"
          />
        </div>
        </CardContent>
      </Card>

      <!-- 팀원 목록 -->
      <Card>
        <CardContent class="p-4">
        <div class="flex items-center justify-between gap-2 mb-3">
          <div class="flex items-center gap-2">
            <span class="text-base font-bold text-[var(--color-label-primary)]">팀원 목록</span>
            <Badge v-if="selectedMember" variant="accent" size="sm">
              선택됨: {{ selectedMember }}
            </Badge>
          </div>
          <button
            type="button"
            @click="showInactive = !showInactive"
            :class="[
              'btn-interactive flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
              showInactive
                ? 'bg-[var(--color-accent)] text-white shadow-sm'
                : 'bg-[var(--color-surface-elevated)] text-[var(--color-label-tertiary)] hover:text-[var(--color-label-secondary)] border border-[var(--color-border-subtle)]'
            ]"
          >
            <Icon :name="showInactive ? 'EyeIcon' : 'EyeSlashIcon'" :size="14" />
            <span>비활성 멤버 포함</span>
          </button>
        </div>
        <MemberList
          orientation="horizontal"
          variant="inline"
          :title="null"
          :selectedMember="selectedMember"
          :showInactive="showInactive"
          @member-click="handleMemberClick"
          @toggle-inactive="showInactive = !showInactive"
        />
        </CardContent>
      </Card>
    </div>

    <!-- 사이드 컬럼 (위젯) -->
    <div class="flex-[1_1_300px] max-w-full flex flex-col gap-4">
      <WarningWidget @select-member="handleMemberClick" />
      <AbsenceWidget />

      <div class="text-[var(--color-label-tertiary)] text-xs leading-relaxed px-1">
        <div class="flex gap-1.5 mb-1.5 items-center">
          <Icon name="InformationCircleIcon" :size="14" />
          <span class="font-semibold text-[var(--color-label-secondary)]">도움말</span>
        </div>
        <ul class="m-0 pl-4 list-disc space-y-1">
          <li>역할 슬롯을 드래그하여 배정을 맞바꿀 수 있습니다.</li>
          <li>팀원을 선택하고 빈 슬롯을 클릭하면 배정됩니다.</li>
        </ul>
      </div>
    </div>
  </div>
</template>
