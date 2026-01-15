/**
 * useConfirmDialog - 확인 다이얼로그 composable
 * 
 * window.confirm을 대체하는 Promise 기반 확인 다이얼로그
 * 
 * @example
 * const { confirm } = useConfirmDialog()
 * 
 * const result = await confirm({
 *   title: '삭제 확인',
 *   description: '정말 삭제하시겠습니까?',
 *   variant: 'destructive'
 * })
 * 
 * if (result) {
 *   // 확인됨
 * }
 */
import { reactive } from 'vue'

export type ConfirmVariant = 'default' | 'destructive' | 'warning'

export interface ConfirmOptions {
    title: string
    description?: string
    confirmText?: string
    cancelText?: string
    variant?: ConfirmVariant
}

interface ConfirmState {
    open: boolean
    title: string
    description: string
    confirmText: string
    cancelText: string
    variant: ConfirmVariant
    resolve: ((value: boolean) => void) | null
}

// 싱글톤 상태 (앱 전역에서 하나의 다이얼로그만 사용)
const state = reactive<ConfirmState>({
    open: false,
    title: '',
    description: '',
    confirmText: '확인',
    cancelText: '취소',
    variant: 'default',
    resolve: null
})

export function useConfirmDialog() {
    /**
     * 확인 다이얼로그를 표시하고 사용자 응답을 Promise로 반환
     */
    async function confirm(options: ConfirmOptions): Promise<boolean> {
        return new Promise((resolve) => {
            state.title = options.title
            state.description = options.description || ''
            state.confirmText = options.confirmText || '확인'
            state.cancelText = options.cancelText || '취소'
            state.variant = options.variant || 'default'
            state.resolve = resolve
            state.open = true
        })
    }

    function handleConfirm() {
        if (state.resolve) {
            state.resolve(true)
            state.resolve = null
        }
        state.open = false
    }

    function handleCancel() {
        if (state.resolve) {
            state.resolve(false)
            state.resolve = null
        }
        state.open = false
    }

    function handleOpenChange(value: boolean) {
        if (!value && state.resolve) {
            state.resolve(false)
            state.resolve = null
        }
        state.open = value
    }

    return {
        // 상태
        state,
        // 메서드
        confirm,
        handleConfirm,
        handleCancel,
        handleOpenChange
    }
}
