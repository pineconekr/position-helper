<script setup lang="ts">
import { computed } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useModal, type AlertOptions, type ConfirmOptions } from '@/shared/composables/useModal'

const { state, customComponent, customProps, close } = useModal()

const isOpen = computed(() => state.value.isOpen)
const modalType = computed(() => state.value.type)
const options = computed(() => state.value.options as AlertOptions | ConfirmOptions | null)

// 옵션 기본값
const title = computed(() => options.value?.title || getDefaultTitle())
const message = computed(() => options.value?.message || '')
const confirmText = computed(() => options.value?.confirmText || '확인')
const cancelText = computed(() => (options.value as ConfirmOptions)?.cancelText || '취소')
const variant = computed(() => options.value?.variant || 'default')

function getDefaultTitle() {
  switch (variant.value) {
    case 'destructive': return '오류'
    case 'warning': return '경고'
    case 'success': return '성공'
    default: return '알림'
  }
}



// 확인 버튼 스타일
const confirmButtonVariant = computed(() => {
  if (variant.value === 'destructive') return 'destructive'
  return 'default'
})
const variantColor = computed(() => {
  if (variant.value === 'destructive') return 'var(--color-danger)'
  if (variant.value === 'warning') return 'var(--color-warning)'
  if (variant.value === 'success') return 'var(--color-success)'
  return 'var(--color-accent)'
})

function handleConfirm() {
  const opts = options.value as ConfirmOptions
  opts?.onConfirm?.()
  close(true)
}

function handleCancel() {
  const opts = options.value as ConfirmOptions
  opts?.onCancel?.()
  close(false)
}

function handleOpenChange(open: boolean) {
  if (!open) {
    close(false)
  }
}
</script>

<template>
  <Dialog :open="isOpen" @update:open="handleOpenChange">
    <DialogContent 
      class="sm:max-w-[425px] p-6 gap-0 rounded-2xl"
    >
      <!-- Alert / Confirm Modal -->
      <template v-if="modalType === 'alert' || modalType === 'confirm'">
        <div class="flex flex-col gap-6">
          <DialogHeader class="gap-2 sm:gap-3">
            <div class="flex items-center gap-4">
              <!-- Styled Icon Container -->
              <div
                class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors"
                :style="{
                  color: variantColor,
                  backgroundColor: `color-mix(in srgb, ${variantColor} 16%, transparent)`
                }"
              >
                <svg v-if="variant === 'destructive'" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <svg v-else-if="variant === 'warning'" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <svg v-else-if="variant === 'success'" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              
              <div class="space-y-1 text-left">
                <DialogTitle class="text-xl font-semibold leading-none tracking-tight">
                  {{ title }}
                </DialogTitle>
                <DialogDescription v-if="modalType === 'confirm'" class="text-sm text-muted-foreground line-clamp-1">
                  {{ variant === 'destructive' ? '이 작업은 되돌릴 수 없습니다.' : '내용을 확인해주세요.' }}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div class="px-1">
             <p class="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
               {{ message }}
             </p>
          </div>
          
          <DialogFooter class="gap-2 sm:gap-2 sm:justify-end">
            <!-- Confirm Modal: Cancel + Confirm -->
            <template v-if="modalType === 'confirm'">
              <Button variant="outline" class="flex-1 sm:flex-none" @click="handleCancel">
                {{ cancelText }}
              </Button>
              <Button :variant="confirmButtonVariant" class="flex-1 sm:flex-none min-w-[80px]" @click="handleConfirm">
                {{ confirmText }}
              </Button>
            </template>
            
            <!-- Alert Modal: Confirm only -->
            <template v-else>
              <Button :variant="confirmButtonVariant" @click="handleConfirm" class="w-full sm:w-auto min-w-[80px]">
                {{ confirmText }}
              </Button>
            </template>
          </DialogFooter>
        </div>
      </template>
      
      <!-- Custom Modal -->
      <template v-else-if="modalType === 'custom' && customComponent">
        <component 
          :is="customComponent" 
          v-bind="customProps" 
          @close="close(false)"
          @confirm="close(true)"
        />
      </template>
    </DialogContent>
  </Dialog>
</template>
