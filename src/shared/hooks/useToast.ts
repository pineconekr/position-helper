import { useCallback } from 'react'
import { useFeedbackStore, type ToastOptions } from '@/shared/state/feedback'

export function useToast() {
	const push = useFeedbackStore((s) => s.push)

	const toast = useCallback(
		(payload: ToastOptions) => {
			push(payload)
		},
		[push]
	)

	return { toast }
}
