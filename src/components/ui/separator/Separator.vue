<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'

interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical'
  decorative?: boolean
  class?: string
}

const props = withDefaults(defineProps<SeparatorProps>(), {
  orientation: 'horizontal',
  decorative: true,
})

const orientationClass = computed(() => 
  props.orientation === 'vertical' ? 'h-full w-[1px]' : 'h-[1px] w-full'
)
</script>

<template>
  <div
    :class="cn('shrink-0 bg-border', orientationClass, props.class)"
    :role="decorative ? 'none' : 'separator'"
    :aria-orientation="decorative ? undefined : orientation"
  />
</template>
