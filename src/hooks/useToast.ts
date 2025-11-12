import { useCallback } from 'react'
import { useFeedbackStore, type ToastOptions } from '../state/feedback'

export function useToast() {
	const push = useFeedbackStore((s) => s.push)

	return useCallback(
		(payload: ToastOptions) => {
			push(payload)
		},
		[push]
	)
}


