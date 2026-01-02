import { AnimatePresence, m, LazyMotion, domAnimation } from 'framer-motion'
import { useCallback } from 'react'
import { useFeedbackStore } from '@/shared/state/feedback'
import { useShouldReduceMotion } from '@/shared/utils/motion'
import Icon from '@/shared/components/ui/Icon'

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
	const shouldReduce = useShouldReduceMotion()

	const handleDismiss = useCallback(
		(id: string) => {
			dismiss(id)
		},
		[dismiss]
	)

	if (toasts.length === 0) return null

	// 애니메이션 비활성화 시 정적 렌더링
	if (shouldReduce) {
		return (
			<div
				className="fixed top-4 right-4 flex flex-col gap-2.5 z-[999] max-w-80 w-[calc(100%-2rem)]"
				aria-live="polite"
				role="status"
			>
				{toasts.map((toast) => (
					<div
						key={toast.id}
						className="flex items-start gap-2.5 px-3.5 py-3 bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] rounded-xl shadow-md"
						role={toast.kind === 'error' ? 'alert' : 'status'}
					>
						<div className={`text-lg leading-none ${kindColors[toast.kind] || 'text-blue-500'}`} aria-hidden="true">
							<Icon name={kindIcon[toast.kind] ?? 'info'} size={20} />
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
							<Icon name="close" size={18} />
						</button>
					</div>
				))}
			</div>
		)
	}

	return (
		<LazyMotion features={domAnimation} strict>
			<div
				className="fixed top-4 right-4 flex flex-col gap-2.5 z-[999] max-w-80 w-[calc(100%-2rem)]"
				aria-live="polite"
				role="status"
			>
				<AnimatePresence>
					{toasts.map((toast) => (
						<m.div
							key={toast.id}
							className="flex items-start gap-2.5 px-3.5 py-3 bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] rounded-xl shadow-md"
							role={toast.kind === 'error' ? 'alert' : 'status'}
							layout
							initial={{ opacity: 0, y: 20, scale: 0.95 }}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							exit={{ opacity: 0, y: -10, scale: 0.95 }}
							transition={{ type: 'spring', stiffness: 400, damping: 30 }}
						>
							<div className={`text-lg leading-none ${kindColors[toast.kind] || 'text-blue-500'}`} aria-hidden="true">
								<Icon name={kindIcon[toast.kind] ?? 'info'} size={20} />
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
								<Icon name="close" size={18} />
							</button>
						</m.div>
					))}
				</AnimatePresence>
			</div>
		</LazyMotion>
	)
}
