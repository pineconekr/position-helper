<script setup lang="ts">
/**
 * Skeleton.vue - 로딩 상태 스켈레톤 컴포넌트
 * 
 * 다양한 UI 요소에 대한 로딩 플레이스홀더를 제공합니다.
 */

interface Props {
  className?: string
  animation?: 'pulse' | 'shimmer' | 'none'
}

withDefaults(defineProps<Props>(), {
  className: '',
  animation: 'pulse'
})

function getAnimationClass(animation: 'pulse' | 'shimmer' | 'none'): string {
  if (animation === 'pulse') return 'animate-pulse'
  if (animation === 'shimmer') return 'skeleton-shimmer'
  return ''
}
</script>

<template>
  <div
    :class="[
      'bg-[var(--color-surface-elevated)] rounded-[var(--radius-sm)]',
      getAnimationClass(animation),
      className
    ]"
    aria-hidden="true"
  />
</template>

<style scoped>
.skeleton-shimmer {
  position: relative;
  overflow: hidden;
}

.skeleton-shimmer::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  transform: translateX(-100%);
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.2),
    transparent
  );
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}
</style>
