<script setup lang="ts">
/**
 * SkeletonText.vue - 텍스트 라인 스켈레톤
 */
import Skeleton from './Skeleton.vue'

interface Props {
  lines?: number
  className?: string
  lastLineWidth?: string
}

withDefaults(defineProps<Props>(), {
  lines: 1,
  className: '',
  lastLineWidth: '60%'
})
</script>

<template>
  <div :class="['space-y-2', className]" aria-hidden="true">
    <Skeleton
      v-for="i in lines"
      :key="i"
      class="h-4"
      :style="{
        width: i === lines && lines > 1 ? lastLineWidth : '100%'
      }"
    />
  </div>
</template>
