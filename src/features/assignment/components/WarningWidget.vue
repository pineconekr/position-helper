<script setup lang="ts">
/**
 * WarningWidget.vue - 배정 경고 위젯
 * 
 * 연속 배정 경고 및 로테이션 추천을 표시합니다.
 * ASSIGNMENT_RULES.md 기반:
 * - Error: 1주 전 동일 역할 수행 (2주 연속 - 즉시 수정 필요)
 * - Warn: 2주 전 동일 역할 수행 (최근 3주 내 2회 - 주의 필요)
 * - Info: 로테이션 추천 (참고용)
 */
import { computed, ref } from 'vue'
import { useAssignmentStore } from '@/stores/assignment'
import type { Warning, WarningLevel } from '@/shared/types'
import { Card, CardContent } from '@/components/ui/card'
import Icon from '@/components/ui/Icon.vue'
import clsx from 'clsx'

const store = useAssignmentStore()

// 필터 상태: 'all' | 'error' | 'warn' | 'info'
type FilterType = 'all' | WarningLevel
const activeFilter = ref<FilterType>('all')

// 경고 필터링 (Info 레벨은 기본적으로 숨김 처리 가능)
const filteredWarnings = computed(() => {
  const warnings = store.warnings
  
  if (activeFilter.value === 'all') {
    // 'all' 필터에서는 error, warn만 표시 (info는 별도 섹션)
    return warnings.filter(w => w.level === 'error' || w.level === 'warn')
  }
  
  return warnings.filter(w => w.level === activeFilter.value)
})

// 경고 카운트
const errorCount = computed(() => store.warnings.filter(w => w.level === 'error').length)
const warnCount = computed(() => store.warnings.filter(w => w.level === 'warn').length)
const infoCount = computed(() => store.warnings.filter(w => w.level === 'info').length)
const totalWarnings = computed(() => errorCount.value + warnCount.value)

// 로테이션 추천 (Info 레벨)
const rotationSuggestions = computed(() => 
  store.warnings.filter(w => w.level === 'info' && w.rotationCandidates)
)

// 레벨별 아이콘 및 색상 설정
const getLevelConfig = (level: WarningLevel) => {
  const configs = {
    error: {
      icon: 'error',
      accentColor: 'var(--color-danger)',
      bgColor: 'var(--color-danger)',
      label: '긴급'
    },
    warn: {
      icon: 'warning',
      accentColor: 'var(--color-warning)',
      bgColor: 'var(--color-warning)',
      label: '주의'
    },
    info: {
      icon: 'lightbulb',
      accentColor: 'var(--color-accent)',
      bgColor: 'var(--color-accent)',
      label: '추천'
    }
  }
  return configs[level]
}

// 필터 버튼 설정
const filterButtons: { key: FilterType; label: string; icon: string }[] = [
  { key: 'all', label: '전체', icon: 'list' },
  { key: 'error', label: '긴급', icon: 'error' },
  { key: 'warn', label: '주의', icon: 'warning' },
  { key: 'info', label: '추천', icon: 'lightbulb' }
]

const emit = defineEmits<{
  'select-member': [name: string]
}>()

function handleWarningClick(warning: Warning) {
  if (warning.target?.name) {
    emit('select-member', warning.target.name)
  }
}
</script>

<template>
  <Card>
    <CardContent class="p-4 space-y-4">
      <!-- 헤더 -->
      <div class="flex items-center justify-between pb-3 border-b border-[var(--color-border-subtle)]">
        <div class="text-sm font-bold text-[var(--color-label-primary)] flex items-center gap-2">
          <Icon name="notifications" :size="16" class="text-[var(--color-label-tertiary)]" />
          배정 피드백
        </div>
        
        <!-- 경고 카운트 뱃지 -->
        <div class="flex items-center gap-1.5">
          <span 
            v-if="errorCount > 0"
            class="px-1.5 py-0.5 rounded-[4px] bg-[var(--color-danger)]/10 text-[var(--color-danger)] text-xs font-semibold animate-pulse"
          >
            {{ errorCount }} 긴급
          </span>
          <span 
            v-if="warnCount > 0"
            class="px-1.5 py-0.5 rounded-[4px] bg-[var(--color-warning)]/10 text-[var(--color-warning)] text-xs font-semibold"
          >
            {{ warnCount }} 주의
          </span>
        </div>
      </div>

      <!-- 필터 칩 -->
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="filter in filterButtons"
          :key="filter.key"
          @click="activeFilter = filter.key"
          :class="clsx(
            'px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-150',
            'flex items-center gap-1 cursor-pointer select-none',
            activeFilter === filter.key
              ? 'bg-[var(--color-accent)] text-white'
              : 'bg-[var(--color-surface)] text-[var(--color-label-secondary)] hover:bg-[var(--color-surface-elevated)] active:scale-95'
          )"
        >
          <Icon :name="filter.icon" :size="12" />
          {{ filter.label }}
          <span 
            v-if="filter.key === 'error' && errorCount > 0"
            class="ml-0.5 text-[10px] opacity-80"
          >
            ({{ errorCount }})
          </span>
          <span 
            v-else-if="filter.key === 'warn' && warnCount > 0"
            class="ml-0.5 text-[10px] opacity-80"
          >
            ({{ warnCount }})
          </span>
          <span 
            v-else-if="filter.key === 'info' && infoCount > 0"
            class="ml-0.5 text-[10px] opacity-80"
          >
            ({{ infoCount }})
          </span>
        </button>
      </div>

      <!-- 경고 목록 (Error/Warn) -->
      <div 
        v-if="activeFilter !== 'info' && filteredWarnings.length > 0" 
        class="space-y-2 max-h-[280px] overflow-y-auto scroll-mask-y"
      >
        <div
          v-for="warning in filteredWarnings"
          :key="warning.id"
          @click="handleWarningClick(warning)"
          :class="clsx(
            'relative flex items-start gap-3 p-3 rounded-[var(--radius-sm)]',
            'bg-[var(--color-surface)] border-l-[3px]',
            'transition-all duration-150 hover:bg-[var(--color-surface-elevated)] cursor-pointer active:scale-[0.98]',
            warning.level === 'error' 
              ? 'border-l-[var(--color-danger)]' 
              : 'border-l-[var(--color-warning)]'
          )"
        >
          <!-- 아이콘 -->
          <div 
            :class="clsx(
              'flex-shrink-0 w-7 h-7 rounded-full flex-center',
              warning.level === 'error' 
                ? 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]' 
                : 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]'
            )"
          >
            <Icon 
              :name="getLevelConfig(warning.level).icon" 
              :size="14" 
              :class="warning.level === 'error' ? 'animate-pulse' : ''"
            />
          </div>

          <!-- 내용 -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-0.5">
              <span 
                :class="clsx(
                  'text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-[3px]',
                  warning.level === 'error' 
                    ? 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]' 
                    : 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]'
                )"
              >
                {{ getLevelConfig(warning.level).label }}
              </span>
              <span 
                v-if="warning.target?.name"
                class="text-xs font-medium text-[var(--color-label-primary)] px-1.5 py-0.5 bg-[var(--color-surface-elevated)] rounded-[3px]"
              >
                {{ warning.target.name }}
              </span>
            </div>
            <p class="text-sm text-[var(--color-label-secondary)] leading-relaxed">
              {{ warning.message }}
            </p>
          </div>
        </div>
      </div>

      <!-- 로테이션 추천 (Info) -->
      <div 
        v-if="activeFilter === 'info' && rotationSuggestions.length > 0" 
        class="space-y-3 max-h-[280px] overflow-y-auto scroll-mask-y"
      >
        <div
          v-for="suggestion in rotationSuggestions"
          :key="suggestion.id"
          class="p-3 rounded-[var(--radius-sm)] bg-[var(--color-surface)] border-l-[3px] border-l-[var(--color-accent)]"
        >
          <div class="flex items-center gap-2 mb-2">
            <div class="w-6 h-6 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex-center">
              <Icon name="lightbulb" :size="12" />
            </div>
            <span class="text-sm font-semibold text-[var(--color-label-primary)]">
              {{ suggestion.message }}
            </span>
          </div>
          
          <!-- 추천 후보 목록 -->
          <div v-if="suggestion.rotationCandidates" class="flex flex-wrap gap-1.5 mt-2">
            <span
              v-for="(candidate, index) in suggestion.rotationCandidates"
              :key="candidate.name"
              @click="emit('select-member', candidate.name)"
              :class="clsx(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs',
                'border border-[var(--color-border-subtle)] cursor-pointer hover:border-[var(--color-accent)] transition-colors active:scale-95',
                index === 0 
                  ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-medium border-[var(--color-accent)]/30' 
                  : 'bg-[var(--color-surface-elevated)] text-[var(--color-label-secondary)]'
              )"
            >
              {{ candidate.name }}
              <span class="text-[10px] opacity-70">
                {{ candidate.weeksSince === Infinity ? '미배정' : `${candidate.weeksSince}주↑` }}
              </span>
            </span>
          </div>
        </div>
      </div>

      <!-- 빈 상태 -->
      <div 
        v-if="(activeFilter !== 'info' && filteredWarnings.length === 0) || 
              (activeFilter === 'info' && rotationSuggestions.length === 0)"
        class="py-8 text-center"
      >
        <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-[var(--color-surface)] flex-center">
          <Icon 
            :name="activeFilter === 'info' ? 'lightbulb' : 'check_circle'" 
            :size="24" 
            class="text-[var(--color-success)]" 
          />
        </div>
        <p class="text-sm text-[var(--color-label-secondary)]">
          {{ activeFilter === 'info' ? '현재 추천 사항이 없습니다.' : '모든 배정이 적절합니다!' }}
        </p>
        <p v-if="activeFilter !== 'info'" class="text-xs text-[var(--color-label-tertiary)] mt-1">
          연속 배정 경고가 없습니다
        </p>
      </div>

      <!-- 전체 경고 없을 때 요약 -->
      <div 
        v-if="totalWarnings === 0 && activeFilter === 'all'"
        class="text-xs text-[var(--color-label-tertiary)] text-center pt-2 border-t border-[var(--color-border-subtle)]"
      >
        💡 '추천' 탭에서 로테이션 제안을 확인하세요
      </div>
    </CardContent>
  </Card>
</template>
