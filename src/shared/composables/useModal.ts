import { ref, shallowRef, markRaw, type Component } from 'vue'

// --- Modal Types ---

export type ModalType = 'alert' | 'confirm' | 'custom'

export interface AlertOptions {
    title?: string
    message: string
    confirmText?: string
    variant?: 'default' | 'destructive' | 'warning' | 'success'
}

export interface ConfirmOptions extends AlertOptions {
    cancelText?: string
    onConfirm?: () => void | Promise<void>
    onCancel?: () => void
}

export interface CustomModalOptions {
    component: Component
    props?: Record<string, unknown>
    onClose?: () => void
}

interface ModalState {
    isOpen: boolean
    type: ModalType
    options: AlertOptions | ConfirmOptions | CustomModalOptions | null
    resolve: ((value: boolean) => void) | null
}

// --- Singleton State ---

const state = ref<ModalState>({
    isOpen: false,
    type: 'alert',
    options: null,
    resolve: null
})

const MODAL_ANIMATION_DURATION = 300

// 커스텀 컴포넌트용 (shallowRef로 reactivity 최적화)
const customComponent = shallowRef<Component | null>(null)
const customProps = ref<Record<string, unknown>>({})

// --- Public API ---

/**
 * 기본 alert 모달 표시
 * @example
 * await modal.alert('저장되었습니다.')
 * await modal.alert({ title: '오류', message: '실패했습니다.', variant: 'destructive' })
 */
function alert(messageOrOptions: string | AlertOptions): Promise<void> {
    const options: AlertOptions = typeof messageOrOptions === 'string'
        ? { message: messageOrOptions }
        : messageOrOptions

    return new Promise((resolve) => {
        state.value = {
            isOpen: true,
            type: 'alert',
            options,
            resolve: () => resolve()
        }
    })
}

/**
 * 확인/취소 모달 표시
 * @returns true if confirmed, false if cancelled
 * @example
 * const confirmed = await modal.confirm('정말 삭제하시겠습니까?')
 * if (confirmed) { ... }
 */
function confirm(messageOrOptions: string | ConfirmOptions): Promise<boolean> {
    const options: ConfirmOptions = typeof messageOrOptions === 'string'
        ? { message: messageOrOptions }
        : messageOrOptions

    return new Promise((resolve) => {
        state.value = {
            isOpen: true,
            type: 'confirm',
            options,
            resolve
        }
    })
}

/**
 * 커스텀 컴포넌트를 모달로 표시
 * @example
 * modal.open(MyFormModal, { userId: 123 })
 */
function open(component: Component, props: Record<string, unknown> = {}): Promise<boolean> {
    customComponent.value = markRaw(component)
    customProps.value = props

    return new Promise((resolve) => {
        state.value = {
            isOpen: true,
            type: 'custom',
            options: { component, props } as CustomModalOptions,
            resolve
        }
    })
}

/**
 * 현재 열린 모달 닫기
 */
function close(result: boolean = false) {
    if (state.value.resolve) {
        state.value.resolve(result)
        // resolve는 한 번만 호출되도록 null 처리 (선택) 하거나 유지
        state.value.resolve = null
    }

    // 1. 모달 닫기 (애니메이션 시작)
    state.value.isOpen = false

    // 2. 애니메이션 종료 후 상태 초기화
    setTimeout(() => {
        state.value.type = 'alert'
        state.value.options = null
        customComponent.value = null
        customProps.value = {}
    }, MODAL_ANIMATION_DURATION)
}

// --- Composable Export ---

export function useModal() {
    return {
        // State (읽기 전용)
        state,
        customComponent,
        customProps,

        // Actions
        alert,
        confirm,
        open,
        close
    }
}

// 편의를 위한 직접 export
export const modal = {
    alert,
    confirm,
    open,
    close
}
