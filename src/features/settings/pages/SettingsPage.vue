<script setup lang="ts">
/**
 * SettingsPage.vue - 설정 페이지
 */
import { computed } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Icon from '@/components/ui/Icon.vue'
import type { ThemePreference, MotionPreference } from '@/shared/types'
import clsx from 'clsx'

const themeStore = useThemeStore()
const { confirm } = useConfirmDialog()

const theme = computed(() => themeStore.theme)
const motionPreference = computed(() => themeStore.motionPreference || 'system')

const themeOptions: Array<{ value: ThemePreference; title: string; description: string; icon: string }> = [
  { value: 'system', icon: 'ComputerDesktopIcon', title: '시스템 설정', description: '운영체제에 따라 자동 변경' },
  { value: 'light', icon: 'SunIcon', title: '라이트 모드', description: '밝은 환경에 적합' },
  { value: 'dark', icon: 'MoonIcon', title: '다크 모드', description: '눈의 피로 감소' }
]

const motionOptions: Array<{ value: MotionPreference; title: string; description: string; icon: string }> = [
  { value: 'system', icon: 'ComputerDesktopIcon', title: '시스템 설정', description: '운영체제 설정에 따라 자동으로 조절' },
  { value: 'allow', icon: 'SparklesIcon', title: '애니메이션 켜기', description: '부드러운 전환 효과 활성화' },
  { value: 'reduce', icon: 'BoltSlashIcon', title: '애니메이션 끄기', description: '빠른 반응 속도 우선' }
]

async function handleResetData() {
  const confirmed = await confirm({
    title: '데이터 초기화',
    description: '정말 모든 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
    confirmText: '초기화',
    cancelText: '취소',
    variant: 'destructive'
  })
  
  if (confirmed) {
    localStorage.clear()
    window.location.reload()
  }
}
</script>

<template>
  <div class="space-y-8">
    <!-- Page Header -->
    <div>
      <h1 class="text-2xl font-bold text-[var(--color-label-primary)]">설정</h1>
      <p class="mt-1 text-sm text-[var(--color-label-secondary)]">
        앱의 테마, 화면 효과, 그리고 데이터를 관리합니다.
      </p>
    </div>

    <!-- Theme Section -->
    <Card>
      <CardContent class="p-4">
      <div class="flex items-center gap-3 mb-6">
        <div class="w-10 h-10 rounded-lg bg-[var(--color-accent)]/10 flex items-center justify-center">
          <Icon name="SwatchIcon" :size="20" class="text-[var(--color-accent)]" />
        </div>
        <div>
          <h2 class="text-base font-semibold text-[var(--color-label-primary)]">테마</h2>
          <p class="text-sm text-[var(--color-label-secondary)]">화면의 색상 모드를 선택하세요</p>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          v-for="option in themeOptions"
          :key="option.value"
          @click="themeStore.setTheme(option.value)"
          :class="clsx(
            'card-hover relative flex flex-col gap-3 p-4 rounded-xl border-2 text-left transition-all duration-200',
            theme === option.value
              ? 'border-[var(--color-accent)] bg-gradient-to-br from-[var(--color-accent)]/10 to-[var(--color-accent)]/5 glow-accent'
              : 'border-[var(--color-border-subtle)] hover:border-[var(--color-border-default)]'
          )"
        >
          <div v-if="theme === option.value" class="absolute top-3 right-3 animate-in zoom-in duration-200">
            <Icon name="SolidCheckCircleIcon" :size="20" class="text-[var(--color-accent)]" />
          </div>
          <div :class="clsx(
            'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200',
            theme === option.value
              ? 'bg-[var(--color-accent)] shadow-lg shadow-[var(--color-accent)]/30'
              : 'bg-[var(--color-surface-elevated)]'
          )">
            <Icon :name="option.icon" :size="20" :class="theme === option.value ? 'text-white' : 'text-[var(--color-label-secondary)]'" />
          </div>
          <div>
            <div :class="clsx('font-semibold', theme === option.value ? 'text-[var(--color-accent)]' : 'text-[var(--color-label-primary)]')">{{ option.title }}</div>
            <div class="text-sm text-[var(--color-label-secondary)] mt-0.5">{{ option.description }}</div>
          </div>
        </button>
      </div>
      </CardContent>
    </Card>

    <!-- Motion Section -->
    <Card>
      <CardContent class="p-4">
      <div class="flex items-center gap-3 mb-6">
        <div class="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
          <Icon name="SparklesIcon" :size="20" class="text-purple-500" />
        </div>
        <div>
          <h2 class="text-base font-semibold text-[var(--color-label-primary)]">화면 효과</h2>
          <p class="text-sm text-[var(--color-label-secondary)]">애니메이션 및 전환 효과를 설정하세요</p>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          v-for="option in motionOptions"
          :key="option.value"
          @click="themeStore.setMotionPreference(option.value)"
          :class="clsx(
            'card-hover relative flex flex-col gap-3 p-4 rounded-xl border-2 text-left transition-all duration-200',
            motionPreference === option.value
              ? 'border-purple-500 bg-gradient-to-br from-purple-500/10 to-purple-500/5 shadow-[0_0_20px_rgba(139,92,246,0.2)]'
              : 'border-[var(--color-border-subtle)] hover:border-[var(--color-border-default)]'
          )"
        >
          <div v-if="motionPreference === option.value" class="absolute top-3 right-3 animate-in zoom-in duration-200">
            <Icon name="SolidCheckCircleIcon" :size="20" class="text-purple-500" />
          </div>
          <div :class="clsx(
            'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200',
            motionPreference === option.value
              ? 'bg-purple-500 shadow-lg shadow-purple-500/30'
              : 'bg-[var(--color-surface-elevated)]'
          )">
            <Icon :name="option.icon" :size="20" :class="motionPreference === option.value ? 'text-white' : 'text-[var(--color-label-secondary)]'" />
          </div>
          <div>
            <div :class="clsx('font-semibold', motionPreference === option.value ? 'text-purple-500' : 'text-[var(--color-label-primary)]')">{{ option.title }}</div>
            <div class="text-sm text-[var(--color-label-secondary)] mt-0.5">{{ option.description }}</div>
          </div>
        </button>
      </div>
    </CardContent>
    </Card>


    <!-- Data Management Section -->
    <Card>
      <CardContent class="p-4">
        <div class="flex items-center gap-3 mb-6">
          <div class="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
            <Icon name="CircleStackIcon" :size="20" class="text-green-600" />
          </div>
          <div>
            <h2 class="text-base font-semibold text-[var(--color-label-primary)]">데이터 관리</h2>
            <p class="text-sm text-[var(--color-label-secondary)]">데이터 조회, 수정, 백업 및 복구를 수행합니다</p>
          </div>
        </div>

        <div class="p-4 bg-muted/30 rounded-xl border border-border flex items-center justify-between">
          <div>
             <div class="font-medium text-foreground">고급 데이터 관리자</div>
             <div class="text-sm text-muted-foreground mt-0.5">
               로우 데이터 조회, 기간별 내보내기, 병합 가져오기 등
             </div>
          </div>
          <Button variant="outline" @click="$router.push('/settings/data')">
            <Icon name="WrenchScrewdriverIcon" :size="16" class="mr-2" />
            관리 도구 열기
          </Button>
        </div>
      </CardContent>
    </Card>

    <!-- Danger Zone -->
    <Card class="border-[var(--color-danger)]/20">
      <CardContent class="p-4">
      <!-- Danger Header -->
      <div class="flex items-center gap-3 mb-6">
        <div class="w-10 h-10 rounded-lg bg-[var(--color-danger)]/10 flex items-center justify-center">
          <Icon name="ExclamationTriangleIcon" :size="20" class="text-[var(--color-danger)]" />
        </div>
        <div>
          <h2 class="text-base font-semibold text-[var(--color-label-primary)]">위험 영역</h2>
          <p class="text-sm text-[var(--color-label-secondary)]">되돌릴 수 없는 작업입니다</p>
        </div>
      </div>

      <!-- Danger Action -->
      <div class="flex flex-wrap items-center justify-between gap-4 p-4 bg-[var(--color-danger)]/5 rounded-xl border border-[var(--color-danger)]/20">
        <div>
          <div class="font-medium text-[var(--color-label-primary)]">데이터 초기화</div>
          <div class="text-sm text-[var(--color-label-secondary)] mt-0.5">
            모든 설정, 팀원 목록, 활동 기록을 영구 삭제합니다
          </div>
        </div>
        <Button variant="destructive" size="lg" @click="handleResetData">
          <Icon name="TrashIcon" class="mr-2" :size="18" />
          모든 데이터 삭제
        </Button>
      </div>
    </CardContent>
    </Card>

    <!-- Footer -->
    <div class="text-center pt-4 pb-8">
      <p class="text-sm text-[var(--color-label-tertiary)]">
        Position Helper v1.0.0
      </p>
    </div>
  </div>
</template>
