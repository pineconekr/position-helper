import { useCallback } from 'react'
import { useFeedbackStore } from '../../state/feedback'

const kindIcon: Record<string, string> = {
	success: '✅',
	info: 'ℹ️',
	warning: '⚠️',
	error: '⛔'
}

export default function ToastCenter() {
	const toasts = useFeedbackStore((s) => s.toasts)
	const dismiss = useFeedbackStore((s) => s.dismiss)

	const handleDismiss = useCallback(
		(id: string) => {
			dismiss(id)
		},
		[dismiss]
	)

	if (toasts.length === 0) return null

	return (
		<div className="toast-center" aria-live="polite" role="status">
			{toasts.map((toast) => (
				<div
					key={toast.id}
					className={`toast toast--${toast.kind}`}
					role={toast.kind === 'error' ? 'alert' : 'status'}
				>
					<div className="toast__icon" aria-hidden="true">
						{kindIcon[toast.kind] ?? 'ℹ️'}
					</div>
					<div className="toast__body">
						<div className="toast__title">{toast.title}</div>
						{toast.description && <div className="toast__description">{toast.description}</div>}
					</div>
					<button
						type="button"
						className="toast__close"
						onClick={() => handleDismiss(toast.id)}
						aria-label="알림 닫기"
					>
						×
					</button>
				</div>
			))}
		</div>
	)
}


