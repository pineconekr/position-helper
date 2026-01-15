/**
 * useToast.ts - Toast 알림 Composable
 * 
 * Vue 3 Composition API를 사용한 전역 Toast 알림 시스템 (Sonner 기반)
 */
import { toast as sonnerToast } from 'vue-sonner'

interface ToastOptions {
    title: string
    description?: string
    kind?: 'success' | 'warning' | 'error' | 'info'
    duration?: number
}

function toast(options: ToastOptions) {
    const { title, description, kind = 'info', duration = 3000 } = options

    const toastFn = {
        success: sonnerToast.success,
        warning: sonnerToast.warning,
        error: sonnerToast.error,
        info: sonnerToast.info
    }[kind]

    toastFn(title, {
        description,
        duration
    })
}

export function useToast() {
    return {
        toast
    }
}
