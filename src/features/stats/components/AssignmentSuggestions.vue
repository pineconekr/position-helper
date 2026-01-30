<script setup lang="ts">
/**
 * AssignmentSuggestions.vue - 배정 제안 컴포넌트
 * 
 * UX/UI 개선:
 * 1. 스크롤바: 전역 스타일 적용
 * 2. 마스크 그라데이션: 상하단 리스트 흐림 효과
 * 3. 점수 정렬: text-right 및 font-mono로 숫자 정렬
 * 4. 여백: 스크롤바와 콘텐츠 사이 숨 쉴 공간 확보
 */
import { ref, computed } from 'vue'
import Icon from '@/components/ui/Icon.vue'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { useAssignmentStore } from '@/stores/assignment'
import { generateAssignmentPlan, getSlotCandidates, type SlotRecommendation } from '../utils/assignmentSuggestionEngine'
import type { RoleKey } from '@/shared/types'

// Store
const assignmentStore = useAssignmentStore()

// Constants
const ROLE_LABELS: Record<RoleKey, string> = {
  SW: 'SW',
  자막: '자막',
  고정: '고정',
  사이드: '사이드',
  스케치: '스케치',
}

// State
const selectedSlot = ref<SlotRecommendation | null>(null)

// Computed
const app = computed(() => assignmentStore.app)

const absentees = computed(() => {
  // 현재 주차의 불참자 목록
  return []
})

const plan = computed(() => generateAssignmentPlan(app.value, absentees.value))

const allCandidatesForSlot = computed(() => {
  if (!selectedSlot.value) return []
  return getSlotCandidates(app.value, selectedSlot.value.slot, absentees.value, [])
})

const part1Slots = computed(() => plan.value.slots.filter(s => s.slot.part === 'part1'))
const part2Slots = computed(() => plan.value.slots.filter(s => s.slot.part === 'part2'))

const hasWarnings = computed(() => plan.value.summary.warnings.length > 0)
const totalIssues = computed(() => plan.value.slots.filter(s => !s.recommended).length)

// Helpers
function getScoreClass(score: number): string {
  if (score >= 130) return 'score-excellent'
  if (score >= 100) return 'score-good'
  if (score >= 70) return 'score-fair'
  return 'score-poor'
}

function getRoleLabel(slot: SlotRecommendation['slot']): string {
  return ROLE_LABELS[slot.role] + (slot.index !== undefined ? ` #${slot.index + 1}` : '')
}

function getPartLabel(part: 'part1' | 'part2'): string {
  return part === 'part1' ? '1부' : '2부'
}

function getIssueCounts(slots: SlotRecommendation[]): number {
  return slots.filter(s => !s.recommended).length
}

function handleSlotClick(rec: SlotRecommendation) {
  selectedSlot.value = rec
}

function closeModal() {
  selectedSlot.value = null
}
</script>

<template>
  <div class="flex flex-col h-full font-sans">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-5 flex-shrink-0">
      <div>
        <h2 class="text-lg font-bold text-[var(--color-label-primary)] tracking-tight">
          배정 제안
        </h2>
        <p class="text-xs text-[var(--color-label-tertiary)] mt-1 flex items-center gap-2">
          <Badge variant="outline" class="font-medium tabular-nums bg-[var(--color-surface-elevated)] font-mono">
            {{ plan.summary.filledCount }}/{{ plan.summary.totalSlots }}
          </Badge>
          <span>슬롯 배정됨</span>
          <span v-if="totalIssues > 0" class="text-[var(--color-warning)] font-semibold flex items-center gap-1">
            — {{ totalIssues }}개 미배정
          </span>
        </p>
      </div>
    </div>

    <!-- Warning Banner -->
    <Alert v-if="hasWarnings" variant="warning" class="mb-4 flex-shrink-0">
      <Icon name="ExclamationTriangleIcon" :size="18" />
      <AlertTitle class="ml-2 font-semibold text-xs">
        {{ plan.summary.warnings.length }}개 슬롯에 적합한 후보가 없습니다. 확인이 필요합니다.
      </AlertTitle>
    </Alert>

    <!-- Part Cards -->
    <div class="flex-1 space-y-4 sm:space-y-5 overflow-y-auto pb-4 pr-1">
      <!-- Part 1 -->
      <Card class="overflow-hidden bg-[var(--color-surface)] border-[var(--color-border-subtle)]/50 shadow-sm">
        <div class="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b border-[var(--color-border-subtle)]/50 bg-[var(--color-surface-elevated)]/50">
          <span class="text-sm font-semibold text-[var(--color-label-primary)]">1부</span>
          <span v-if="getIssueCounts(part1Slots) > 0" class="text-xs text-[var(--color-warning)] font-medium flex items-center gap-1">
            {{ getIssueCounts(part1Slots) }}개 미배정
          </span>
        </div>
        <div>
          <button
            v-for="(rec, idx) in part1Slots"
            :key="`part1-${rec.slot.role}-${rec.slot.index ?? 0}-${idx}`"
            type="button"
            @click="handleSlotClick(rec)"
            class="w-full flex items-center gap-2 sm:gap-4 py-3 sm:py-3.5 px-3 sm:px-4 transition-all duration-200 text-left hover:bg-[var(--color-surface-elevated)] active:bg-[var(--color-surface)] border-b border-[var(--color-border-subtle)]/50 last:border-b-0 group cursor-pointer"
          >
            <!-- 역할명 -->
            <span class="w-16 sm:w-20 text-xs sm:text-sm font-medium text-[var(--color-label-tertiary)] group-hover:text-[var(--color-label-secondary)] transition-colors">
              {{ getRoleLabel(rec.slot) }}
            </span>
            <!-- 추천 멤버 -->
            <div class="flex-1 min-w-0">
              <span v-if="rec.recommended" class="text-sm font-semibold text-[var(--color-label-primary)] block truncate group-hover:text-[var(--color-label-primary)] transition-colors">
                {{ rec.recommended.displayName }}
              </span>
              <span v-else class="text-sm font-medium text-[var(--color-warning)] flex items-center gap-1.5">
                <Icon name="ExclamationTriangleIcon" :size="14" />
                후보 없음
              </span>
            </div>
            <!-- 점수 -->
            <span
              v-if="rec.recommended"
              :class="['text-sm font-medium tabular-nums tracking-tight text-right w-8 font-mono', getScoreClass(rec.recommended.score)]"
            >
              {{ rec.recommended.score }}
            </span>
            <!-- Chevron -->
            <Icon
              name="ChevronRightIcon"
              :size="14"
              class="text-[var(--color-label-tertiary)] group-hover:text-[var(--color-label-primary)] transition-colors flex-shrink-0 opacity-50 group-hover:opacity-100 ml-1"
            />
          </button>
        </div>
      </Card>

      <!-- Part 2 -->
      <Card class="overflow-hidden bg-[var(--color-surface)] border-[var(--color-border-subtle)]/50 shadow-sm">
        <div class="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b border-[var(--color-border-subtle)]/50 bg-[var(--color-surface-elevated)]/50">
          <span class="text-sm font-semibold text-[var(--color-label-primary)]">2부</span>
          <span v-if="getIssueCounts(part2Slots) > 0" class="text-xs text-[var(--color-warning)] font-medium flex items-center gap-1">
            {{ getIssueCounts(part2Slots) }}개 미배정
          </span>
        </div>
        <div>
          <button
            v-for="(rec, idx) in part2Slots"
            :key="`part2-${rec.slot.role}-${rec.slot.index ?? 0}-${idx}`"
            type="button"
            @click="handleSlotClick(rec)"
            class="w-full flex items-center gap-2 sm:gap-4 py-3 sm:py-3.5 px-3 sm:px-4 transition-all duration-200 text-left hover:bg-[var(--color-surface-elevated)] active:bg-[var(--color-surface)] border-b border-[var(--color-border-subtle)]/50 last:border-b-0 group cursor-pointer"
          >
            <span class="w-16 sm:w-20 text-xs sm:text-sm font-medium text-[var(--color-label-tertiary)] group-hover:text-[var(--color-label-secondary)] transition-colors">
              {{ getRoleLabel(rec.slot) }}
            </span>
            <div class="flex-1 min-w-0">
              <span v-if="rec.recommended" class="text-sm font-semibold text-[var(--color-label-primary)] block truncate group-hover:text-[var(--color-label-primary)] transition-colors">
                {{ rec.recommended.displayName }}
              </span>
              <span v-else class="text-sm font-medium text-[var(--color-warning)] flex items-center gap-1.5">
                <Icon name="ExclamationTriangleIcon" :size="14" />
                후보 없음
              </span>
            </div>
            <span
              v-if="rec.recommended"
              :class="['text-sm font-medium tabular-nums tracking-tight text-right w-8 font-mono', getScoreClass(rec.recommended.score)]"
            >
              {{ rec.recommended.score }}
            </span>
            <Icon
              name="ChevronRightIcon"
              :size="14"
              class="text-[var(--color-label-tertiary)] group-hover:text-[var(--color-label-primary)] transition-colors flex-shrink-0 opacity-50 group-hover:opacity-100 ml-1"
            />
          </button>
        </div>
      </Card>
    </div>

    <!-- Candidates Modal -->
    <Teleport to="body">
      <div
        v-if="selectedSlot"
        class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm transition-all"
        @click="closeModal"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="'modal-title-' + selectedSlot.slot.role"
      >
        <div
          class="bg-[var(--color-surface-elevated)] rounded-xl border border-[var(--color-border-default)] w-full max-w-md overflow-hidden shadow-2xl ring-1 ring-white/10 flex flex-col max-h-[85vh]"
          @click.stop
        >
          <!-- Modal Header -->
          <div class="px-4 py-3 border-b border-[var(--color-border-subtle)]/50 flex items-center justify-between flex-shrink-0">
            <div class="flex items-center gap-2">
              <span class="text-xs font-medium text-[var(--color-label-tertiary)] uppercase">
                {{ getPartLabel(selectedSlot.slot.part) }}
              </span>
              <span class="text-base font-bold text-[var(--color-label-primary)]">
                {{ getRoleLabel(selectedSlot.slot) }}
              </span>
              <span
                v-if="!selectedSlot.recommended"
                class="px-1.5 py-0.5 rounded text-xs font-bold bg-[var(--color-warning)]/20 text-[var(--color-warning)]"
              >
                강제 배정
              </span>
            </div>
            <button
              @click="closeModal"
              class="icon-btn"
              aria-label="닫기"
            >
              <Icon name="XMarkIcon" :size="20" />
            </button>
          </div>

          <!-- Candidates List -->
          <div class="flex-1 relative overflow-hidden">
            <div
              class="max-h-[50vh] sm:max-h-[55vh] overflow-y-auto pr-2 pl-2 py-2 scroll-mask-y"
            >
              <!-- Empty State -->
              <div v-if="(selectedSlot.recommended ? [selectedSlot.recommended, ...selectedSlot.alternatives] : allCandidatesForSlot).length === 0" class="py-12 text-center">
                <Icon name="UserMinusIcon" :size="36" class="text-[var(--color-label-tertiary)]/50 mx-auto mb-3" />
                <p class="text-sm text-[var(--color-label-secondary)]">
                  배정 가능한 팀원이 없습니다
                </p>
              </div>

              <!-- Candidate List -->
              <div v-else class="space-y-1">
                <button
                  v-for="(candidate, idx) in (selectedSlot.recommended ? [selectedSlot.recommended, ...selectedSlot.alternatives] : allCandidatesForSlot)"
                  :key="candidate.name"
                  :class="[
                    'w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200',
                    'hover:bg-[var(--color-surface)] active:scale-[0.98]',
                    idx === 0 && selectedSlot.recommended ? 'bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20' : 'border border-transparent'
                  ]"
                >
                  <!-- 순위 -->
                  <span
                    :class="[
                      'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold leading-none flex-shrink-0',
                      idx === 0 && selectedSlot.recommended
                        ? 'bg-[var(--color-accent)] text-white shadow-sm'
                        : 'bg-[var(--color-surface)] text-[var(--color-label-tertiary)]'
                    ]"
                  >
                    {{ idx + 1 }}
                  </span>

                  <!-- 이름 및 사유 -->
                  <div class="flex-1 min-w-0 text-left">
                    <p :class="['text-sm font-semibold truncate', idx === 0 && selectedSlot.recommended ? 'text-[var(--color-accent)]' : 'text-[var(--color-label-primary)]']">
                      {{ candidate.displayName }}
                    </p>
                    <p v-if="candidate.reasons.length > 0" class="text-xs text-[var(--color-label-tertiary)] mt-0.5 truncate">
                      {{ candidate.reasons.join(' · ') }}
                    </p>
                  </div>

                  <!-- 점수 -->
                  <span
                    :class="['text-sm font-bold tabular-nums text-right w-10 font-mono', getScoreClass(candidate.score)]"
                  >
                    {{ candidate.score }}
                  </span>
                </button>
              </div>
            </div>
          </div>

          <!-- Footer - Score Legend -->
          <div class="px-4 py-3.5 border-t border-[var(--color-border-subtle)]/50 bg-[var(--color-surface)]/50 backdrop-blur-sm flex-shrink-0">
            <div class="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-[var(--color-label-secondary)] font-medium">
              <span class="flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full ring-2 ring-[var(--color-success)]/20 dot-success" />
                130+ 최적
              </span>
              <span class="text-[var(--color-border-default)]">|</span>
              <span class="flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full ring-2 ring-[var(--color-label-secondary)]/20 dot-secondary" />
                100+ 적합
              </span>
              <span class="text-[var(--color-border-default)]">|</span>
              <span class="flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full ring-2 ring-[var(--color-warning)]/20 dot-warning" />
                70+ 주의
              </span>
              <span class="text-[var(--color-border-default)]">|</span>
              <span class="flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full ring-2 ring-[var(--color-danger)]/20 dot-danger" />
                70- 비추천
              </span>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
