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
  <div class="relative min-h-screen overflow-hidden bg-background px-4 py-10 sm:px-6">
    <div class="pointer-events-none absolute inset-0 -z-10">
      <div class="absolute inset-x-0 top-0 h-[280px] bg-gradient-to-b from-foreground/[0.04] to-transparent dark:from-white/[0.04]" />
      <div class="absolute -left-14 top-24 h-64 w-64 rounded-full bg-foreground/[0.05] blur-3xl dark:bg-white/[0.05]" />
      <div class="absolute -right-16 top-14 h-72 w-72 rounded-full bg-primary/[0.08] blur-3xl" />
    </div>

    <div class="mx-auto flex min-h-[74vh] w-full max-w-md items-center justify-center">
      <div class="w-full rounded-2xl border border-border/75 bg-card/94 p-6 shadow-[0_1px_1px_rgb(0_0_0_/_0.04),0_20px_45px_rgb(0_0_0_/_0.1)] backdrop-blur-sm sm:p-8">
        <div class="mb-7">
          <p class="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Position Helper
          </p>
          <h1 class="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.9rem]">
            관리자 로그인
          </h1>
          <p class="mt-2 text-sm leading-relaxed text-muted-foreground">
            관리자 비밀번호를 입력해 대시보드에 접근하세요.
          </p>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div>
            <label for="admin-password" class="mb-1.5 block text-sm font-medium text-foreground">
              비밀번호
            </label>
            <Input
              id="admin-password"
              v-model="password"
              type="password"
              placeholder="비밀번호를 입력하세요"
              :disabled="isSubmitting"
              class="h-11 w-full bg-background/90 text-base"
              autocomplete="current-password"
            />
            <p v-if="error" class="mt-2 text-sm font-medium text-destructive" role="alert">
              {{ error }}
            </p>
          </div>

          <Button
            type="submit"
            class="h-11 w-full text-sm font-semibold"
            :disabled="isSubmitting"
          >
            {{ isSubmitting ? '확인 중...' : '로그인' }}
          </Button>
        </form>

        <p class="mt-5 text-sm leading-relaxed text-muted-foreground">
          비밀번호는 갠톡으로 문의
        </p>
      </div>
    </div>
  </div>
</template>

