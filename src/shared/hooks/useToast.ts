import { useCallback } from 'react'
import { useFeedbackStore, type ToastOptions } from '@/shared/state/feedback'

export function useToast() {
	const push = useFeedbackStore((s) => s.push)
	const dismiss = useFeedbackStore((s) => s.dismiss)
	const toasts = useFeedbackStore((s) => s.toasts)

	const toast = useCallback(
		(payload: ToastOptions) => {
			push(payload)
		},
		[push]
	)

	return { toast, toasts, remove: dismiss }
}
