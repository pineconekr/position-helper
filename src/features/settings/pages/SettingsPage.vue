<script setup lang="ts">
/**
 * SettingsPage.vue
 * Bento Grid Style - Visual & Interactive
 */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import Icon from '@/components/ui/Icon.vue'
import clsx from 'clsx'

const router = useRouter()
const authStore = useAuthStore()
const themeStore = useThemeStore()

// 테마 토글
const isDarkMode = computed(() => themeStore.effectiveTheme === 'dark')

function toggleTheme() {
  themeStore.setTheme(isDarkMode.value ? 'light' : 'dark')
}

// 애니메이션 (themeStore 사용)
const animationsEnabled = computed(() => themeStore.effectiveMotion === 'allow')

function toggleAnimations() {
  const newValue = animationsEnabled.value ? 'reduce' : 'allow'
  themeStore.setMotionPreference(newValue)
}

// 로그아웃
async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}

// 앱 정보
const appVersion = computed(() => import.meta.env.VITE_APP_VERSION || '0.2.0')
</script>

<template>
  <div class="w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold tracking-tight text-foreground">설정</h1>
      <p class="text-muted-foreground mt-2 text-lg">작업 환경을 커스터마이징하세요.</p>
    </div>

    <!-- Bento Grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[minmax(180px,auto)]">
      
      <!-- 1. Theme Card (Large, Interactive) -->
      <div 
        @click="toggleTheme"
        :class="clsx(
          'md:col-span-2 relative overflow-hidden rounded-3xl p-6 cursor-pointer transition-all duration-300 group',
          'bg-gradient-to-br from-background to-muted border border-border/50 hover:shadow-lg hover:border-primary/50'
        )"
      >
        <div class="relative z-10 h-full flex flex-col justify-between">
          <div class="flex justify-between items-start">
            <div class="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Icon :name="isDarkMode ? 'MoonIcon' : 'SunIcon'" :size="24" class="text-primary" />
            </div>
            <span class="px-3 py-1 rounded-full bg-background/50 backdrop-blur text-xs font-semibold border border-border/50">
              {{ isDarkMode ? '다크 모드' : '라이트 모드' }}
            </span>
          </div>
          <div>
            <h3 class="text-xl font-bold text-foreground mb-1">화면 테마</h3>
            <p class="text-sm text-muted-foreground">눈이 편안한 모드로 전환하려면 클릭하세요.</p>
          </div>
        </div>
        <!-- Decorative Background Circle -->
        <div class="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-primary/5 group-hover:bg-primary/10 transition-colors blur-3xl" />
      </div>

      <!-- 2. Account Card -->
      <div class="relative overflow-hidden rounded-3xl p-6 bg-background border border-border/50 flex flex-col justify-between">
        <div class="flex justify-between items-start">
          <div class="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
            <Icon name="UserIcon" :size="24" class="text-blue-500" />
          </div>
          <button 
            @click="handleLogout"
            class="text-xs font-medium text-muted-foreground hover:text-red-500 transition-colors"
          >
            로그아웃
          </button>
        </div>
        <div>
          <h3 class="text-lg font-bold text-foreground mb-1">관리자</h3>
          <p class="text-xs text-muted-foreground">현재 로그인됨</p>
        </div>
      </div>

      <!-- 3. Animation Toggle -->
      <div 
        @click="toggleAnimations"
        class="relative overflow-hidden rounded-3xl p-6 bg-background border border-border/50 cursor-pointer hover:border-purple-500/50 transition-colors group"
      >
        <div class="flex justify-between items-start mb-auto">
          <div class="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
            <Icon name="SparklesIcon" :size="24" class="text-purple-500" />
          </div>
          <div :class="[
            'w-10 h-6 rounded-full transition-colors duration-200 relative',
            animationsEnabled ? 'bg-purple-500' : 'bg-muted'
          ]">
            <span :class="[
              'absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200',
              animationsEnabled ? 'translate-x-4' : 'translate-x-0'
            ]" />
          </div>
        </div>
        <div class="mt-8">
          <h3 class="text-lg font-bold text-foreground mb-1">애니메이션</h3>
          <p class="text-xs text-muted-foreground">부드러운 화면 전환 효과</p>
        </div>
      </div>

      <!-- 4. Data Management (Wide) -->
      <div 
        @click="router.push('/settings/data')"
        class="md:col-span-2 relative overflow-hidden rounded-3xl p-6 bg-background border border-border/50 cursor-pointer hover:border-emerald-500/50 transition-colors group"
      >
        <div class="flex items-center gap-6 h-full">
          <div class="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <Icon name="CloudArrowDownIcon" :size="32" class="text-emerald-500" />
          </div>
          <div class="flex-1">
            <h3 class="text-xl font-bold text-foreground mb-2">데이터 관리</h3>
            <p class="text-sm text-muted-foreground line-clamp-2">
              데이터를 JSON 파일로 백업하거나, 기존 백업 파일을 불러와 복원할 수 있습니다.
            </p>
          </div>
          <Icon name="ArrowRightIcon" :size="24" class="text-muted-foreground/30 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
        </div>
      </div>

      <!-- 5. App Info -->
      <div class="relative overflow-hidden rounded-3xl p-6 bg-muted/30 border border-border/50 flex flex-col justify-center items-center text-center">
        <div class="mb-3">
          <span class="text-2xl font-black text-foreground/20">v{{ appVersion }}</span>
        </div>
        <p class="text-xs font-medium text-foreground">Position Helper</p>
        <p class="text-[10px] text-muted-foreground mt-1">Made by Pinecone</p>
      </div>

    </div>
  </div>
</template>
