<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import Icon from '@/components/ui/Icon.vue'
import clsx from 'clsx'

const router = useRouter()
const authStore = useAuthStore()
const themeStore = useThemeStore()

const isDarkMode = computed(() => themeStore.effectiveTheme === 'dark')
const animationsEnabled = computed(() => themeStore.effectiveMotion === 'allow')
const appVersion = computed(() => import.meta.env.VITE_APP_VERSION || '0.2.0')

const themeLabel = computed(() => (isDarkMode.value ? 'Dark' : 'Light'))
const motionLabel = computed(() => (animationsEnabled.value ? 'On' : 'Reduced'))

function toggleTheme() {
  themeStore.setTheme(isDarkMode.value ? 'light' : 'dark')
}

function toggleAnimations() {
  themeStore.setMotionPreference(animationsEnabled.value ? 'reduce' : 'allow')
}

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}

function openDataSettings() {
  router.push('/settings/data')
}

function activateWithKeyboard(event: KeyboardEvent, action: () => void) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    action()
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-6xl space-y-5">
    <div class="relative space-y-5">
      <div class="pointer-events-none absolute inset-0 -z-10 opacity-60">
        <div class="absolute -top-10 left-1/3 h-44 w-44 rounded-full bg-primary/6 blur-3xl" />
        <div class="absolute top-24 right-10 h-36 w-36 rounded-full bg-foreground/6 blur-3xl" />
      </div>

      <div class="surface-panel px-5 py-5 sm:px-6 sm:py-6">
        <p class="section-eyebrow">Workspace</p>
        <h1 class="section-title mt-1.5">설정</h1>
        <p class="section-description mt-2 max-w-3xl">
          앱 동작 방식과 운영 환경을 조정합니다. 테마, 모션, 데이터 관리가 한 화면에 정리되어 있습니다.
        </p>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-12 md:auto-rows-[minmax(150px,auto)]">
        <section
          role="button"
          tabindex="0"
          aria-label="화면 테마 전환"
          @click="toggleTheme"
          @keydown="(event) => activateWithKeyboard(event, toggleTheme)"
          :class="clsx(
            'group relative overflow-hidden surface-panel surface-panel-interactive p-6 md:col-span-8 md:row-span-2',
          )"
        >
          <div class="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-primary/10 blur-2xl transition-opacity group-hover:opacity-80" />
          <div class="relative z-10 flex h-full flex-col justify-between gap-6">
            <div class="flex items-start justify-between">
              <div class="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-border/70 bg-muted/40">
                <Icon :name="isDarkMode ? 'MoonIcon' : 'SunIcon'" :size="22" class="text-foreground" />
              </div>
              <span class="rounded-full border border-border/70 bg-background px-3 py-1 text-sm font-medium text-foreground/80">
                {{ themeLabel }}
              </span>
            </div>

            <div class="space-y-2">
              <h2 class="text-xl font-semibold text-foreground">화면 테마</h2>
              <p class="max-w-xl text-sm leading-relaxed text-muted-foreground">
                라이트/다크 모드를 전환합니다. 시스템 설정을 포함한 전체 화면 대비에 맞춰 자동 적용됩니다.
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <span class="rounded-md border border-border/70 bg-background px-2.5 py-1 text-sm font-medium text-muted-foreground">Current: {{ themeLabel }}</span>
              <span class="rounded-md border border-border/70 bg-background px-2.5 py-1 text-sm font-medium text-muted-foreground">Click to toggle</span>
            </div>
          </div>
        </section>

        <section class="surface-panel p-5 md:col-span-4">
          <div class="flex h-full flex-col justify-between gap-5">
            <div class="flex items-start justify-between">
              <div class="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border/70 bg-muted/40">
                <Icon name="UserIcon" :size="18" class="text-foreground" />
              </div>
              <button
                type="button"
                @click="handleLogout"
                class="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                로그아웃
              </button>
            </div>
            <div>
              <p class="text-sm text-muted-foreground">세션</p>
              <h3 class="mt-1 text-lg font-semibold text-foreground">관리자 계정</h3>
              <p class="mt-1 text-sm text-muted-foreground">현재 로그인 상태입니다.</p>
            </div>
          </div>
        </section>

        <section
          role="button"
          tabindex="0"
          aria-label="애니메이션 설정 전환"
          @click="toggleAnimations"
          @keydown="(event) => activateWithKeyboard(event, toggleAnimations)"
          class="group surface-panel surface-panel-interactive p-5 md:col-span-4"
        >
          <div class="flex h-full flex-col justify-between gap-5">
            <div class="flex items-start justify-between">
              <div class="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border/70 bg-muted/40">
                <Icon name="SparklesIcon" :size="18" class="text-foreground" />
              </div>
              <div :class="[
                'relative h-6 w-10 rounded-full border transition-colors',
                animationsEnabled ? 'border-transparent bg-foreground' : 'border-border bg-muted',
              ]">
                <span :class="[
                  'absolute left-1 top-1 h-4 w-4 rounded-full bg-background transition-transform',
                  animationsEnabled ? 'translate-x-4' : 'translate-x-0',
                ]" />
              </div>
            </div>
            <div>
              <p class="text-sm text-muted-foreground">모션</p>
              <h3 class="mt-1 text-lg font-semibold text-foreground">{{ motionLabel }}</h3>
              <p class="mt-1 text-sm text-muted-foreground">화면 전환과 인터랙션 애니메이션 강도를 조정합니다.</p>
            </div>
          </div>
        </section>

        <section
          role="button"
          tabindex="0"
          aria-label="데이터 관리 화면으로 이동"
          @click="openDataSettings"
          @keydown="(event) => activateWithKeyboard(event, openDataSettings)"
          class="group relative overflow-hidden surface-panel surface-panel-interactive p-6 md:col-span-8"
        >
          <div class="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-primary/8 to-transparent opacity-80" />
          <div class="relative z-10 flex h-full items-center gap-5">
            <div class="inline-flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border border-border/70 bg-muted/40">
              <Icon name="CloudArrowDownIcon" :size="24" class="text-foreground" />
            </div>
            <div class="min-w-0 flex-1">
              <h3 class="text-lg font-semibold text-foreground">데이터 관리</h3>
              <p class="mt-1 text-sm leading-relaxed text-muted-foreground">
                백업/복원, JSON 입출력, 데이터 점검을 위한 관리 화면으로 이동합니다.
              </p>
            </div>
            <Icon name="ArrowRightIcon" :size="20" class="text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
          </div>
        </section>

        <section class="surface-panel bg-muted/20 p-5 md:col-span-4">
          <div class="flex h-full flex-col justify-between">
            <div>
              <p class="text-sm text-muted-foreground">앱 버전</p>
              <p class="mt-1 text-2xl font-semibold tracking-tight text-foreground/85">v{{ appVersion }}</p>
            </div>
            <div class="mt-6">
              <p class="text-sm font-medium text-foreground">Position Helper</p>
              <p class="mt-1 text-sm text-muted-foreground">Operational Console</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

