import { AnimatePresence, motion } from 'framer-motion'
import { ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useMotionConfig } from '@/shared/utils/motion'
import Icon from '@/shared/components/ui/Icon'

type Props = {
	title: string
	open: boolean
	onClose: () => void
	children: ReactNode
	footer?: ReactNode
	width?: string | number
}

export default function Modal({ title, open, onClose, children, footer, width }: Props) {
	const { duration, ease, shouldReduce } = useMotionConfig()

	useEffect(() => {
		if (!open) return

		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === 'Escape') {
				onClose()
			}
		}

		document.addEventListener('keydown', handleKeyDown)
		return () => {
			document.removeEventListener('keydown', handleKeyDown)
		}
	}, [open, onClose])

	if (typeof document === 'undefined') return null

	return createPortal(
		<AnimatePresence mode="wait">
			{open && (
				<motion.div
					key="modal-overlay"
					className="fixed inset-0 bg-black/40 backdrop-blur-sm grid place-items-center z-[1000]"
					initial={shouldReduce ? { opacity: 1 } : { opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={shouldReduce ? { opacity: 1 } : { opacity: 0, transition: { duration: duration.fast, ease: ease.in } }}
					transition={{ duration: duration.normal, ease: ease.out }}
					role="presentation"
					onClick={onClose}
				>
					<motion.div
						className="w-[680px] max-w-[95vw] max-h-[90vh] flex flex-col p-6 rounded-2xl shadow-lg bg-[var(--color-surface-1)]"
						role="dialog"
						aria-modal="true"
						style={width ? { width } : undefined}
						initial={shouldReduce ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 16, scale: 0.98 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={
							shouldReduce
								? { opacity: 1, y: 0, scale: 1 }
								: { opacity: 0, y: 12, scale: 0.98, transition: { duration: duration.fast, ease: ease.in } }
						}
						transition={{ duration: duration.normal, ease: ease.out }}
						onClick={(e) => e.stopPropagation()}
					>
						{/* Header */}
						<div className="flex items-center justify-between mb-5">
							<h3 className="m-0 text-xl font-bold">{title}</h3>
							<button
								onClick={onClose}
								title="닫기"
								className="w-8 h-8 grid place-items-center rounded-full cursor-pointer
									bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)]
									text-[var(--color-text-muted)] transition-all duration-150
									hover:bg-[var(--color-surface-1)] hover:text-[var(--color-text-primary)]
									hover:border-[var(--color-border-strong)]"
								aria-label="닫기"
							>
								<Icon name="close" size={20} />
							</button>
						</div>

						{/* Content */}
						<div className={`flex-1 overflow-auto overflow-x-hidden min-h-0 ${footer ? 'mb-5' : ''}`}>
							{children}
						</div>

						{/* Footer */}
						{footer && (
							<div className="flex justify-end gap-2.5 pt-5 border-t border-[var(--color-border-subtle)]">
								{footer}
							</div>
						)}
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>,
		document.body
	)
}
