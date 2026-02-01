<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const router = useRouter()
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

  if (result.success) {
    // 로그인 성공 → 메인 페이지로 이동
    router.push('/')
  } else {
    error.value = result.error || '로그인 실패'
    password.value = ''
  }

  isSubmitting.value = false
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-[var(--color-canvas)]">
    <div class="w-full max-w-xs">
      <!-- 타이틀 -->
      <div class="mb-8">
        <p class="text-xs uppercase tracking-widest text-[var(--color-label-tertiary)] mb-1">
          Position Helper
        </p>
        <h1 class="text-lg font-medium text-[var(--color-label-primary)]">
          관리자 로그인
        </h1>
      </div>

      <!-- 로그인 폼 -->
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <Input
            v-model="password"
            type="password"
            placeholder="비밀번호"
            :disabled="isSubmitting"
            class="w-full h-11 bg-[var(--color-surface)] border-[var(--color-border-subtle)] focus:border-[var(--color-accent)] transition-colors"
            autocomplete="current-password"
          />
          <p v-if="error" class="mt-2 text-sm text-destructive">
            {{ error }}
          </p>
        </div>

        <Button
          type="submit"
          class="w-full h-11"
          :disabled="isSubmitting"
        >
          {{ isSubmitting ? '확인 중...' : '로그인' }}
        </Button>
      </form>

      <!-- 하단 텍스트 -->
      <p class="mt-6 text-xs text-[var(--color-label-quaternary)]">
        비밀번호는 갠톡으로 문의
      </p>
    </div>
  </div>
</template>
