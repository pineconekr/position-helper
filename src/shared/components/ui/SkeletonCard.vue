<script setup lang="ts">
/**
 * SkeletonCard.vue - 카드 스켈레톤
 */
import Skeleton from './Skeleton.vue'
import SkeletonText from './SkeletonText.vue'

interface Props {
  className?: string
}

defineProps<Props>()
</script>

<template>
  <div
    :class="[
      'p-4 rounded-[var(--radius-md)] border border-[var(--color-border-subtle)]',
      'bg-[var(--color-surface)]',
      className
    ]"
    aria-hidden="true"
  >
    <div class="flex items-center gap-3 mb-4">
      <Skeleton class="w-10 h-10 rounded-full" />
      <div class="flex-1">
        <Skeleton class="h-4 w-24 mb-2" />
        <Skeleton class="h-3 w-32" />
      </div>
    </div>
    <SkeletonText :lines="2" />
  </div>
</template>
