<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const authStore = useAuthStore()

const password = ref('')
const error = ref('')
const isSubmitting = ref(false)

async function handleSubmit() {
  if (!password.value.trim()) {
    error.value = '비밀번호를 입력하세요'
    return
  }

  isSubmitting.value = true
  error.value = ''

  const result = await authStore.login(password.value)

  if (!result.success) {
    error.value = result.error || '로그인 실패'
    password.value = ''
  }

  isSubmitting.value = false
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
    <div class="w-full max-w-sm p-8 space-y-6">
      <!-- 로고/타이틀 영역 -->
      <div class="text-center space-y-2">
        <div class="w-16 h-16 mx-auto rounded-2xl bg-[var(--color-surface-elevated)] flex items-center justify-center">
          <span class="text-3xl">📸</span>
        </div>
        <h1 class="text-xl font-bold text-[var(--color-label-primary)]">
          포지션 헬퍼
        </h1>
        <p class="text-sm text-[var(--color-label-secondary)]">
          관리자 비밀번호를 입력하세요
        </p>
      </div>

      <!-- 로그인 폼 -->
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div class="space-y-2">
          <Input
            v-model="password"
            type="password"
            placeholder="비밀번호"
            :disabled="isSubmitting"
            class="w-full"
            autocomplete="current-password"
          />
          <p v-if="error" class="text-sm text-destructive">
            {{ error }}
          </p>
        </div>

        <Button
          type="submit"
          class="w-full"
          :disabled="isSubmitting"
        >
          {{ isSubmitting ? '확인 중...' : '로그인' }}
        </Button>
      </form>

      <!-- 안내 문구 -->
      <p class="text-xs text-center text-[var(--color-label-tertiary)]">
        이 앱은 영상팀 관리자 전용입니다
      </p>
    </div>
  </div>
</template>
