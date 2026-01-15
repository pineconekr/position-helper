<script setup lang="ts">
/**
 * EmptyState.vue - 빈 상태 컴포넌트
 * 
 * 데이터가 없을 때 표시되는 상태 컴포넌트
 */

interface Action {
  label: string
  onClick: () => void
}

interface Props {
  icon?: 'block' | 'search' | 'users' | 'calendar' | 'chart'
  title: string
  description?: string
  action?: Action
  className?: string
}

withDefaults(defineProps<Props>(), {
  icon: 'block',
  className: ''
})
</script>

<template>
  <div
    :class="[
      'flex flex-col items-center justify-center py-12 px-6 text-center',
      className
    ]"
    role="status"
    :aria-label="title"
  >
    <!-- Icon Container -->
    <div class="w-16 h-16 rounded-full bg-[var(--color-surface)] flex items-center justify-center mb-4 border border-[var(--color-border-subtle)]">
      <!-- block icon -->
      <svg v-if="icon === 'block'" class="w-7 h-7 text-[var(--color-label-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" stroke-width="1.5" />
        <path d="m4.93 4.93 14.14 14.14" stroke-width="1.5" />
      </svg>
      <!-- search icon -->
      <svg v-else-if="icon === 'search'" class="w-7 h-7 text-[var(--color-label-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="8" stroke-width="1.5" />
        <path d="m21 21-4.35-4.35" stroke-width="1.5" />
      </svg>
      <!-- users icon -->
      <svg v-else-if="icon === 'users'" class="w-7 h-7 text-[var(--color-label-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke-width="1.5" />
        <circle cx="9" cy="7" r="4" stroke-width="1.5" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke-width="1.5" />
      </svg>
      <!-- calendar icon -->
      <svg v-else-if="icon === 'calendar'" class="w-7 h-7 text-[var(--color-label-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <rect x="3" y="4" width="18" height="18" rx="2" stroke-width="1.5" />
        <path d="M16 2v4M8 2v4M3 10h18" stroke-width="1.5" />
      </svg>
      <!-- chart icon -->
      <svg v-else-if="icon === 'chart'" class="w-7 h-7 text-[var(--color-label-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M18 20V10M12 20V4M6 20v-6" stroke-width="1.5" stroke-linecap="round" />
      </svg>
    </div>

    <!-- Title -->
    <h3 class="text-base font-semibold text-[var(--color-label-primary)] mb-1">
      {{ title }}
    </h3>

    <!-- Description -->
    <p v-if="description" class="text-sm text-[var(--color-label-secondary)] max-w-xs mb-4">
      {{ description }}
    </p>

    <!-- Action Button -->
    <button
      v-if="action"
      @click="action.onClick"
      class="btn-interactive inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--color-accent)] bg-[var(--color-accent)]/10 rounded-[var(--radius-sm)]"
    >
      {{ action.label }}
    </button>
  </div>
</template>
