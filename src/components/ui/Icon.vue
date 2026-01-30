<script setup lang="ts">
/**
 * Icon.vue - Heroicons wrapper component
 * 
 * Usage: <Icon name="XMarkIcon" :size="16" />
 * 
 * Use Heroicons names directly (PascalCase, with "Icon" suffix)
 * - Outline icons: import from '@heroicons/vue/24/outline'
 * - Solid icons: add "Solid" prefix e.g. "SolidCheckCircleIcon"
 * 
 * @see https://heroicons.com/
 */
import { computed, defineAsyncComponent, type Component } from 'vue'

interface Props {
  name: string
  size?: number | string
  ariaHidden?: boolean
  ariaLabel?: string
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  ariaHidden: true
})

const sizeValue = computed(() => 
  typeof props.size === 'number' ? `${props.size}px` : props.size || '1em'
)

const iconStyle = computed(() => ({
  width: sizeValue.value,
  height: sizeValue.value,
  flexShrink: 0
}))

// Dynamic import based on icon name
const IconComponent = computed<Component | null>(() => {
  if (!props.name) return null
  
  // Check if it's a solid icon (prefixed with "Solid")
  const isSolid = props.name.startsWith('Solid')
  const iconName = isSolid ? props.name.slice(5) : props.name
  
  if (isSolid) {
    return defineAsyncComponent(() => 
      import('@heroicons/vue/24/solid').then(m => m[iconName as keyof typeof m] as Component)
    )
  }
  
  return defineAsyncComponent(() => 
    import('@heroicons/vue/24/outline').then(m => m[iconName as keyof typeof m] as Component)
  )
})
</script>

<template>
  <component
    v-if="IconComponent"
    :is="IconComponent"
    :style="iconStyle"
    :aria-hidden="ariaLabel || title ? false : ariaHidden"
    :aria-label="ariaLabel || title"
  />
  <svg
    v-else
    :style="iconStyle"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" stroke-dasharray="3 3" />
    <text x="12" y="16" text-anchor="middle" font-size="10" fill="currentColor">?</text>
  </svg>
</template>
