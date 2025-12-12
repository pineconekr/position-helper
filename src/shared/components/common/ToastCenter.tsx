import { AnimatePresence, motion } from 'framer-motion'
import { useCallback } from 'react'
import { useFeedbackStore } from '@/shared/state/feedback'
import { useMotionConfig } from '@/shared/utils/motion'

const kindIcon: Record<string, string> = {
	success: 'check_circle',
	info: 'info',
	warning: 'warning',
	error: 'block'
}

export default function ToastCenter() {
	const toasts = useFeedbackStore((s) => s.toasts)
	const dismiss = useFeedbackStore((s) => s.dismiss)
	const { duration, ease, shouldReduce } = useMotionConfig()

	const handleDismiss = useCallback(
		(id: string) => {
			dismiss(id)
		},
		[dismiss]
	)

	if (toasts.length === 0) return null

	return (
		<div className="toast-center" aria-live="polite" role="status">
			<AnimatePresence initial={false}>
				{toasts.map((toast) => (
					<motion.div
						key={toast.id}
						className={`toast toast--${toast.kind}`}
						role={toast.kind === 'error' ? 'alert' : 'status'}
						layout
						initial={shouldReduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={
							shouldReduce
								? { opacity: 1, y: 0 }
								: { opacity: 0, y: -10, transition: { duration: duration.fast, ease: ease.in } }
						}
						transition={{ duration: duration.normal, ease: ease.out }}
					>
						<div className="toast__icon" aria-hidden="true">
							<span className="material-symbol">{kindIcon[toast.kind] ?? 'info'}</span>
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
							<span className="material-symbol">close</span>
						</button>
					</motion.div>
				))}
			</AnimatePresence>
		</div>
	)
}


