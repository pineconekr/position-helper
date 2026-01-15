<script setup lang="ts">
/**
 * ConfirmDialogProvider.vue - 전역 확인 다이얼로그 프로바이더
 * 
 * App.vue에 추가하여 앱 전체에서 useConfirmDialog()를 통해 사용 가능
 */
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import ConfirmDialog from './ConfirmDialog.vue'

const { state, handleConfirm, handleCancel, handleOpenChange } = useConfirmDialog()
</script>

<template>
  <ConfirmDialog
    :open="state.open"
    :title="state.title"
    :description="state.description"
    :confirmText="state.confirmText"
    :cancelText="state.cancelText"
    :variant="state.variant"
    @confirm="handleConfirm"
    @cancel="handleCancel"
    @update:open="handleOpenChange"
  />
</template>
