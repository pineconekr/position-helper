import { useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useFeedbackStore } from '../../state/feedback'
import { motionDur, motionEase, useShouldReduceMotion } from '../../utils/motion'

const kindIcon: Record<string, string> = {
	success: 'check_circle',
	info: 'info',
	warning: 'warning',
	error: 'block'
}

export default function ToastCenter() {
	const toasts = useFeedbackStore((s) => s.toasts)
	const dismiss = useFeedbackStore((s) => s.dismiss)
	const prefersReducedMotion = useShouldReduceMotion()

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
						initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={
							prefersReducedMotion
								? { opacity: 1, y: 0 }
								: { opacity: 0, y: -10, transition: { duration: motionDur.quick, ease: motionEase.in } }
						}
						transition={prefersReducedMotion ? { duration: 0 } : { duration: motionDur.medium, ease: motionEase.out }}
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


