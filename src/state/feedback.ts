import { create } from 'zustand'

export type ToastKind = 'info' | 'success' | 'warning' | 'error'

export type ToastEntry = {
	id: string
	kind: ToastKind
	title: string
	description?: string
	duration: number
	createdAt: number
}

export type ToastOptions = {
	id?: string
	kind: ToastKind
	title: string
	description?: string
	duration?: number
}

type FeedbackState = {
	toasts: ToastEntry[]
	push: (toast: ToastOptions) => string
	dismiss: (id: string) => void
	clear: () => void
}

const DEFAULT_DURATION = 4200

const createId = () => `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`

export const useFeedbackStore = create<FeedbackState>()((set, get) => ({
	toasts: [],
	push: (toast) => {
		const id = toast.id ?? createId()
		const entry: ToastEntry = {
			id,
			kind: toast.kind,
			title: toast.title,
			description: toast.description,
			duration: toast.duration ?? DEFAULT_DURATION,
			createdAt: Date.now()
		}
		set((state) => ({ toasts: [...state.toasts, entry] }))

		if (typeof window !== 'undefined' && entry.duration > 0) {
			window.setTimeout(() => {
				get().dismiss(id)
			}, entry.duration)
		}

		return id
	},
	dismiss: (id) => {
		set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }))
	},
	clear: () => set({ toasts: [] })
}))


