<script setup lang="ts">
/**
 * Modal.vue - shadcn Dialog + @vueuse/motion 기반 모달
 * 
 * 기존 인터페이스를 유지하면서 shadcn Dialog로 마이그레이션
 */
import { computed, watch, onUnmounted } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { X } from 'lucide-vue-next'

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'

interface Props {
  open: boolean
  title?: string
  size?: ModalSize
}

const props = withDefaults(defineProps<Props>(), {
  open: false,
  size: 'md'
})

const emit = defineEmits<{
  close: []
}>()

// Size mapping to Tailwind classes
const sizeClasses = computed(() => {
  const sizes: Record<ModalSize, string> = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
    full: 'sm:max-w-[calc(100vw-2rem)] h-[calc(100vh-2rem)]',
  }
  return sizes[props.size]
})

function handleOpenChange(value: boolean) {
  if (!value) {
    emit('close')
  }
}

// Handle body scroll lock
watch(() => props.open, (newVal) => {
  if (newVal) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = 'unset'
  }
}, { immediate: true })

onUnmounted(() => {
  document.body.style.overflow = 'unset'
})
</script>

<template>
  <Dialog :open="open" @update:open="handleOpenChange">
    <DialogContent
      v-motion
      :initial="{ opacity: 0, scale: 0.95, y: 20 }"
      :enter="{ 
        opacity: 1, 
        scale: 1, 
        y: 0, 
        transition: { type: 'spring', stiffness: 300, damping: 25 } 
      }"
      :class="[
        'bg-[var(--color-surface-elevated)] border-[var(--color-border-subtle)]',
        'rounded-[var(--radius-lg)] p-0 gap-0',
        sizeClasses
      ]"
      :show-close-button="false"
    >
      <!-- Header -->
      <DialogHeader 
        v-if="title"
        class="flex flex-row items-center justify-between px-5 py-4 border-b border-[var(--color-border-subtle)] space-y-0"
      >
        <DialogTitle class="text-lg font-semibold text-[var(--color-label-primary)]">
          {{ title }}
        </DialogTitle>
        <button
          type="button"
          @click="emit('close')"
          class="p-1 rounded-[var(--radius-sm)] text-[var(--color-label-tertiary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-label-secondary)] transition-colors"
        >
          <X class="w-5 h-5" />
        </button>
      </DialogHeader>

      <!-- Body -->
      <div class="p-5 overflow-y-auto max-h-[70vh]">
        <slot />
      </div>

      <!-- Footer -->
      <DialogFooter
        v-if="$slots.footer"
        class="flex items-center justify-end gap-2 px-5 py-4 bg-[var(--color-surface)]/50 border-t border-[var(--color-border-subtle)] rounded-b-[var(--radius-lg)]"
      >
        <slot name="footer" />
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
