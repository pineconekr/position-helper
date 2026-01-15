<script setup lang="ts">
/**
 * DbSyncProvider.vue - 비동기 DB 동기화 (논블로킹)
 * 
 * LCP 최적화: 초기화 중에도 children을 렌더링하여 페이지 표시를 차단하지 않음
 * 초기화 중에는 오버레이 로딩 인디케이터만 표시
 */
import { ref, onMounted } from 'vue'
import { useAssignmentStore } from '@/stores/assignment'
import { initSchema } from '@/api/db'

const assignmentStore = useAssignmentStore()
const isInitialized = ref(false)

onMounted(async () => {
  try {
    // 1. Schema 초기화 (테이블이 없으면 생성)
    await initSchema()

    // 2. 데이터 불러오기
    await assignmentStore.loadFromDb()
  } catch (error) {
    console.error('Failed to initialize DB sync:', error)
    // 에러가 나도 우선 로컬 데이터로 작동하게 함
  } finally {
    isInitialized.value = true
  }
})
</script>

<template>
  <!-- 항상 children 렌더링 (LCP 차단 방지) -->
  <slot />

  <!-- 초기화 중일 때만 오버레이 표시 -->
  <Teleport to="body">
    <div
      v-if="!isInitialized"
      class="fixed inset-0 bg-[var(--color-canvas)]/80 backdrop-blur-sm flex items-center justify-center z-[9999] transition-opacity"
      style="pointer-events: none"
    >
      <div class="flex flex-col items-center gap-4 bg-[var(--color-surface-elevated)] rounded-xl p-6 shadow-lg border border-[var(--color-border-subtle)]">
        <div class="w-8 h-8 border-3 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
        <p class="text-sm font-medium text-[var(--color-label-secondary)]">데이터 동기화 중...</p>
      </div>
    </div>
  </Teleport>
</template>
