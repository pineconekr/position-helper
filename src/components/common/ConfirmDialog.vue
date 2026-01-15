<script setup lang="ts">
/**
 * ConfirmDialog.vue - 커스텀 확인 다이얼로그
 * 
 * 브라우저 기본 window.confirm을 대체하는 다크 모드 호환 다이얼로그
 */
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import Icon from '@/components/ui/Icon.vue'

export type ConfirmVariant = 'default' | 'destructive' | 'warning'

interface Props {
  open: boolean
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: ConfirmVariant
}

const props = withDefaults(defineProps<Props>(), {
  confirmText: '확인',
  cancelText: '취소',
  variant: 'default'
})

const emit = defineEmits<{
  confirm: []
  cancel: []
  'update:open': [value: boolean]
}>()

function handleConfirm() {
  emit('confirm')
  emit('update:open', false)
}

function handleCancel() {
  emit('cancel')
  emit('update:open', false)
}

function getVariantStyles() {
  switch (props.variant) {
    case 'destructive':
      return {
        iconName: 'warning',
        iconClass: 'text-[var(--color-danger)]',
        iconBgClass: 'bg-[var(--color-danger)]/10',
        buttonVariant: 'destructive' as const
      }
    case 'warning':
      return {
        iconName: 'warning',
        iconClass: 'text-[var(--color-warning)]',
        iconBgClass: 'bg-[var(--color-warning)]/10',
        buttonVariant: 'default' as const
      }
    default:
      return {
        iconName: 'help',
        iconClass: 'text-[var(--color-accent)]',
        iconBgClass: 'bg-[var(--color-accent)]/10',
        buttonVariant: 'default' as const
      }
  }
}

const variantStyles = getVariantStyles()
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent 
      class="sm:max-w-md bg-[var(--color-surface-elevated)] border-[var(--color-border-default)]"
      :showCloseButton="false"
    >
      <DialogHeader class="flex-row items-start gap-4">
        <!-- Icon -->
        <div 
          :class="[
            'w-12 h-12 rounded-full flex items-center justify-center shrink-0',
            variantStyles.iconBgClass
          ]"
        >
          <Icon 
            :name="variantStyles.iconName" 
            :size="24" 
            :class="variantStyles.iconClass" 
          />
        </div>
        
        <div class="flex-1 text-left">
          <DialogTitle class="text-lg font-semibold text-[var(--color-label-primary)]">
            {{ title }}
          </DialogTitle>
          <DialogDescription 
            v-if="description" 
            class="mt-2 text-sm text-[var(--color-label-secondary)]"
          >
            {{ description }}
          </DialogDescription>
        </div>
      </DialogHeader>

      <DialogFooter class="mt-6 flex-row gap-3 sm:justify-end">
        <Button 
          variant="ghost" 
          @click="handleCancel"
          class="flex-1 sm:flex-none"
        >
          {{ cancelText }}
        </Button>
        <Button 
          :variant="variantStyles.buttonVariant"
          @click="handleConfirm"
          class="flex-1 sm:flex-none"
        >
          {{ confirmText }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
