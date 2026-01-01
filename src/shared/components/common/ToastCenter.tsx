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

const kindColors: Record<string, string> = {
	success: 'text-emerald-500',
	info: 'text-blue-500',
	warning: 'text-amber-500',
	error: 'text-red-500'
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
		<div
			className="fixed top-4 right-4 flex flex-col gap-2.5 z-[999] max-w-80 w-[calc(100%-2rem)]"
			aria-live="polite"
			role="status"
		>
			<AnimatePresence initial={false}>
				{toasts.map((toast) => (
					<motion.div
						key={toast.id}
						className="flex items-start gap-2.5 px-3.5 py-3 bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] rounded-xl shadow-md"
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
						<div className={`text-lg leading-none ${kindColors[toast.kind] || 'text-blue-500'}`} aria-hidden="true">
							<span className="material-symbol">{kindIcon[toast.kind] ?? 'info'}</span>
						</div>
						<div className="flex-1 min-w-0">
							<div className="font-medium text-[var(--color-text-primary)]">{toast.title}</div>
							{toast.description && (
								<div className="text-sm text-[var(--color-text-muted)] mt-0.5">{toast.description}</div>
							)}
						</div>
						<button
							type="button"
							className="p-0 bg-transparent border-none text-[var(--color-text-muted)] cursor-pointer hover:text-[var(--color-text-primary)] transition-colors"
							onClick={() => handleDismiss(toast.id)}
							aria-label="알림 닫기"
						>
							<span className="material-symbol text-lg">close</span>
						</button>
					</motion.div>
				))}
			</AnimatePresence>
		</div>
	)
}
