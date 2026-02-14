<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAssignmentStore } from '@/stores/assignment'
import type { RoleKey, Warning, WarningLevel } from '@/shared/types'
import { Card, CardContent } from '@/components/ui/card'
import Icon from '@/components/ui/Icon.vue'
import clsx from 'clsx'

type PartKey = 'part1' | 'part2'
type FilterType = 'all' | WarningLevel
type IssueLevel = Exclude<WarningLevel, 'info'>
type InspectTarget = { part?: PartKey; role?: RoleKey; name?: string }

const store = useAssignmentStore()

const activeFilter = ref<FilterType>('all')
const collapsedByLevel = ref<Record<IssueLevel, boolean>>({
  error: false,
  warn: true,
})

const emit = defineEmits<{
  'select-member': [name: string]
  'inspect-target': [target: InspectTarget]
  'recommend-assignment': [payload: { name: string; role: RoleKey }]
}>()

const levelPriority: Record<WarningLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
}

const sortedWarnings = computed(() => {
  return [...store.warnings].sort((a, b) => {
    const levelDiff = levelPriority[a.level] - levelPriority[b.level]
    if (levelDiff !== 0) return levelDiff
    return a.message.localeCompare(b.message, 'ko')
  })
})

const errorWarnings = computed(() => sortedWarnings.value.filter((w) => w.level === 'error'))
const warnWarnings = computed(() => sortedWarnings.value.filter((w) => w.level === 'warn'))
const infoInsights = computed(() =>
  sortedWarnings.value.filter((w) => w.level === 'info' && !w.rotationCandidates?.length),
)
const rotationSuggestions = computed(() =>
  sortedWarnings.value.filter((w) => w.level === 'info' && !!w.rotationCandidates?.length),
)

const errorCount = computed(() => errorWarnings.value.length)
const warnCount = computed(() => warnWarnings.value.length)
const infoCount = computed(() => store.warnings.filter((w) => w.level === 'info').length)
const totalIssues = computed(() => errorCount.value + warnCount.value)

const summaryText = computed(() => {
  if (errorCount.value > 0) return '즉시 수정이 필요한 배정이 있습니다.'
  if (warnCount.value > 0) return '확정 전 점검 권장 항목이 있습니다.'
  if (infoCount.value > 0) return '참고용 피드백이 있습니다.'
  return '현재 규칙 기준에서 문제 없습니다.'
})

const filterButtons: { key: FilterType; label: string; icon: string }[] = [
  { key: 'all', label: '전체', icon: 'Bars3Icon' },
  { key: 'error', label: '긴급', icon: 'SolidExclamationCircleIcon' },
  { key: 'warn', label: '주의', icon: 'ExclamationTriangleIcon' },
  { key: 'info', label: '정보', icon: 'LightBulbIcon' },
]

function getLevelConfig(level: WarningLevel) {
  const configs = {
    error: {
      icon: 'SolidExclamationCircleIcon',
      borderClass: 'border-l-[var(--color-danger)]',
      badgeClass: 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]',
      label: '긴급',
    },
    warn: {
      icon: 'ExclamationTriangleIcon',
      borderClass: 'border-l-[var(--color-warning)]',
      badgeClass: 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]',
      label: '주의',
    },
    info: {
      icon: 'LightBulbIcon',
      borderClass: 'border-l-[var(--color-accent)]',
      badgeClass: 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]',
      label: '정보',
    },
  }
  return configs[level]
}

function shouldShowLevel(level: IssueLevel): boolean {
  if (activeFilter.value === 'all') return true
  return activeFilter.value === level
}

function getIssueWarnings(level: IssueLevel): Warning[] {
  return level === 'error' ? errorWarnings.value : warnWarnings.value
}

function toggleCollapse(level: IssueLevel) {
  collapsedByLevel.value[level] = !collapsedByLevel.value[level]
}

function formatTarget(warning: Warning): string | null {
  const target = warning.target
  if (!target) return null
  const partLabel = target.part ? (target.part === 'part1' ? '1부' : '2부') : ''
  const roleLabel = target.role ?? ''
  const nameLabel = target.name ?? ''
  const left = [partLabel, roleLabel].filter(Boolean).join(' ')
  const all = [left, nameLabel].filter(Boolean)
  return all.length > 0 ? all.join(' | ') : null
}

function handleWarningClick(warning: Warning) {
  const target = warning.target
  if (!target) return

  if (target.name) {
    emit('select-member', target.name)
  }

  emit('inspect-target', {
    part: target.part,
    role: target.role,
    name: target.name,
  })
}

function handleCandidateClick(suggestion: Warning, candidateName: string) {
  const role = suggestion.target?.role
  if (!role) {
    emit('select-member', candidateName)
    return
  }
  emit('recommend-assignment', { name: candidateName, role })
}

const isInfoEmpty = computed(() => infoInsights.value.length === 0 && rotationSuggestions.value.length === 0)
const isIssuesEmpty = computed(() => {
  if (activeFilter.value === 'error') return errorWarnings.value.length === 0
  if (activeFilter.value === 'warn') return warnWarnings.value.length === 0
  return totalIssues.value === 0
})
</script>

<template>
  <Card>
    <CardContent class="space-y-4 p-4">
      <div class="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-3">
        <div class="flex items-center gap-2">
          <Icon name="BellIcon" :size="16" class="text-[var(--color-label-tertiary)]" />
          <div>
            <p class="text-sm font-semibold text-[var(--color-label-primary)]">배정 피드백</p>
            <p class="text-xs text-[var(--color-label-tertiary)]">{{ summaryText }}</p>
          </div>
        </div>

        <div class="flex items-center gap-1.5">
          <span v-if="errorCount > 0" class="animate-pulse rounded-[4px] bg-[var(--color-danger)]/10 px-1.5 py-0.5 text-xs font-semibold text-[var(--color-danger)]">
            {{ errorCount }} 긴급
          </span>
          <span v-if="warnCount > 0" class="rounded-[4px] bg-[var(--color-warning)]/10 px-1.5 py-0.5 text-xs font-semibold text-[var(--color-warning)]">
            {{ warnCount }} 주의
          </span>
          <span v-if="infoCount > 0" class="rounded-[4px] bg-[var(--color-accent)]/10 px-1.5 py-0.5 text-xs font-semibold text-[var(--color-accent)]">
            {{ infoCount }} 정보
          </span>
        </div>
      </div>

      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="filter in filterButtons"
          :key="filter.key"
          @click="activeFilter = filter.key"
          :class="clsx(
            'flex cursor-pointer select-none items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-150',
            activeFilter === filter.key
              ? 'bg-[var(--color-accent)] text-white'
              : 'bg-[var(--color-surface)] text-[var(--color-label-secondary)] hover:bg-[var(--color-surface-elevated)] active:scale-95',
          )"
        >
          <Icon :name="filter.icon" :size="12" />
          {{ filter.label }}
          <span v-if="filter.key === 'error' && errorCount > 0" class="ml-0.5 text-[10px] opacity-80">({{ errorCount }})</span>
          <span v-else-if="filter.key === 'warn' && warnCount > 0" class="ml-0.5 text-[10px] opacity-80">({{ warnCount }})</span>
          <span v-else-if="filter.key === 'info' && infoCount > 0" class="ml-0.5 text-[10px] opacity-80">({{ infoCount }})</span>
        </button>
      </div>

      <div v-if="activeFilter !== 'info'" class="space-y-2">
        <div v-for="level in (['error', 'warn'] as IssueLevel[])" :key="level" v-show="shouldShowLevel(level)">
          <template v-if="getIssueWarnings(level).length > 0">
            <button
              type="button"
              class="flex w-full items-center justify-between rounded-[var(--radius-sm)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-2.5 py-2 text-left"
              @click="toggleCollapse(level)"
            >
              <div class="flex items-center gap-2">
                <Icon :name="getLevelConfig(level).icon" :size="14" />
                <span class="text-xs font-semibold text-[var(--color-label-secondary)]">
                  {{ getLevelConfig(level).label }} {{ getIssueWarnings(level).length }}건
                </span>
              </div>
              <Icon :name="collapsedByLevel[level] ? 'ChevronDownIcon' : 'ChevronUpIcon'" :size="14" class="text-[var(--color-label-tertiary)]" />
            </button>

            <div v-if="!collapsedByLevel[level]" class="mt-2 space-y-2 max-h-[260px] overflow-y-auto scroll-mask-y">
              <div
                v-for="warning in getIssueWarnings(level)"
                :key="warning.id"
                @click="handleWarningClick(warning)"
                :class="clsx(
                  'relative flex cursor-pointer items-start gap-3 rounded-[var(--radius-sm)] border-l-[3px] bg-[var(--color-surface)] p-3 transition-all duration-150 hover:bg-[var(--color-surface-elevated)] active:scale-[0.98]',
                  getLevelConfig(warning.level).borderClass,
                )"
              >
                <div
                  :class="clsx(
                    'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full',
                    warning.level === 'error'
                      ? 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]'
                      : 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]',
                  )"
                >
                  <Icon :name="getLevelConfig(warning.level).icon" :size="14" :class="warning.level === 'error' ? 'animate-pulse' : ''" />
                </div>

                <div class="min-w-0 flex-1">
                  <div class="mb-0.5 flex items-center gap-2">
                    <span :class="clsx('rounded-[3px] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide', getLevelConfig(warning.level).badgeClass)">
                      {{ getLevelConfig(warning.level).label }}
                    </span>
                    <span v-if="formatTarget(warning)" class="rounded-[3px] bg-[var(--color-surface-elevated)] px-1.5 py-0.5 text-xs font-medium text-[var(--color-label-primary)]">
                      {{ formatTarget(warning) }}
                    </span>
                  </div>
                  <p class="text-sm leading-relaxed text-[var(--color-label-secondary)]">{{ warning.message }}</p>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>

      <div v-if="activeFilter === 'info'" class="space-y-3">
        <div v-if="infoInsights.length > 0" class="space-y-2">
          <p class="px-1 text-xs font-semibold text-[var(--color-label-tertiary)]">관찰 정보</p>
          <div class="space-y-2 max-h-[180px] overflow-y-auto scroll-mask-y">
            <div
              v-for="insight in infoInsights"
              :key="insight.id"
              class="cursor-pointer rounded-[var(--radius-sm)] border-l-[3px] border-l-[var(--color-accent)] bg-[var(--color-surface)] p-3 transition-colors hover:bg-[var(--color-surface-elevated)]"
              @click="handleWarningClick(insight)"
            >
              <div class="flex items-start gap-2">
                <div class="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                  <Icon name="InformationCircleIcon" :size="12" />
                </div>
                <div class="min-w-0">
                  <p class="text-sm leading-relaxed text-[var(--color-label-secondary)]">{{ insight.message }}</p>
                  <p v-if="formatTarget(insight)" class="mt-1 text-xs text-[var(--color-label-tertiary)]">{{ formatTarget(insight) }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="rotationSuggestions.length > 0" class="space-y-2">
          <p class="px-1 text-xs font-semibold text-[var(--color-label-tertiary)]">로테이션 추천</p>
          <div class="space-y-3 max-h-[260px] overflow-y-auto scroll-mask-y">
            <div
              v-for="suggestion in rotationSuggestions"
              :key="suggestion.id"
              class="rounded-[var(--radius-sm)] border-l-[3px] border-l-[var(--color-accent)] bg-[var(--color-surface)] p-3"
            >
              <div class="mb-2 flex items-center gap-2">
                <div class="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                  <Icon name="LightBulbIcon" :size="12" />
                </div>
                <span class="text-sm font-semibold text-[var(--color-label-primary)]">{{ suggestion.message }}</span>
              </div>

              <div v-if="suggestion.rotationCandidates" class="mt-2 flex flex-wrap gap-1.5">
                <button
                  v-for="(candidate, index) in suggestion.rotationCandidates"
                  :key="candidate.name"
                  type="button"
                  @click="handleCandidateClick(suggestion, candidate.name)"
                  :class="clsx(
                    'inline-flex cursor-pointer items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors active:scale-95',
                    'border-[var(--color-border-subtle)] hover:border-[var(--color-accent)]',
                    index === 0
                      ? 'border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 font-medium text-[var(--color-accent)]'
                      : 'bg-[var(--color-surface-elevated)] text-[var(--color-label-secondary)]',
                  )"
                >
                  {{ candidate.name }}
                  <span class="text-[10px] opacity-70">
                    {{ candidate.weeksSince === Infinity ? '미배정' : `${candidate.weeksSince}주↑` }}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="(activeFilter !== 'info' && isIssuesEmpty) || (activeFilter === 'info' && isInfoEmpty)" class="py-8 text-center">
        <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-surface)]">
          <Icon :name="activeFilter === 'info' ? 'LightBulbIcon' : 'SolidCheckCircleIcon'" :size="24" class="text-[var(--color-success)]" />
        </div>
        <p class="text-sm text-[var(--color-label-secondary)]">
          {{ activeFilter === 'info' ? '현재 추천 사항이 없습니다.' : '모든 배정이 적절합니다!' }}
        </p>
        <p v-if="activeFilter !== 'info'" class="mt-1 text-xs text-[var(--color-label-tertiary)]">
          연속 배정 경고가 없습니다
        </p>
      </div>

      <div
        v-if="totalIssues === 0 && activeFilter === 'all'"
        class="flex items-center justify-center gap-1 border-t border-[var(--color-border-subtle)] pt-2 text-center text-xs text-[var(--color-label-tertiary)]"
      >
        <Icon name="LightBulbIcon" :size="12" class="text-[var(--color-accent)]" />
        '정보' 탭에서 로테이션 제안을 확인하세요
      </div>
    </CardContent>
  </Card>
</template>
