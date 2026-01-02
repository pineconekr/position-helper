import { AnimatePresence, m, LazyMotion, domAnimation } from 'framer-motion'
import { ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useShouldReduceMotion } from '@/shared/utils/motion'
import Icon from '@/shared/components/ui/Icon'

type Props = {
	title: string
	open: boolean
	onClose: () => void
	children: ReactNode
	footer?: ReactNode
	width?: string | number
}

function ModalContent({ title, onClose, children, footer, width }: Omit<Props, 'open'>) {
	return (
		<div
			className="w-[680px] max-w-[95vw] max-h-[90vh] flex flex-col p-6 rounded-2xl shadow-lg bg-[var(--color-surface-1)]"
			role="dialog"
			aria-modal="true"
			style={width ? { width } : undefined}
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
		</div>
	)
}

export default function Modal({ title, open, onClose, children, footer, width }: Props) {
	const shouldReduce = useShouldReduceMotion()

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

	// 애니메이션 비활성화 시 정적 렌더링
	if (shouldReduce) {
		if (!open) return null
		return createPortal(
			<div
				className="fixed inset-0 bg-black/40 backdrop-blur-sm grid place-items-center z-[1000]"
				role="presentation"
				onClick={onClose}
			>
				<ModalContent title={title} onClose={onClose} footer={footer} width={width}>
					{children}
				</ModalContent>
			</div>,
			document.body
		)
	}

	return createPortal(
		<LazyMotion features={domAnimation} strict>
			<AnimatePresence mode="wait">
				{open && (
					<m.div
						key="modal-overlay"
						className="fixed inset-0 bg-black/40 backdrop-blur-sm grid place-items-center z-[1000]"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ type: 'spring', stiffness: 400, damping: 30 }}
						role="presentation"
						onClick={onClose}
					>
						<m.div
							className="w-[680px] max-w-[95vw] max-h-[90vh] flex flex-col p-6 rounded-2xl shadow-lg bg-[var(--color-surface-1)]"
							role="dialog"
							aria-modal="true"
							style={width ? { width } : undefined}
							initial={{ opacity: 0, y: 16, scale: 0.98 }}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							exit={{ opacity: 0, y: 12, scale: 0.98 }}
							transition={{ type: 'spring', stiffness: 400, damping: 30 }}
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
						</m.div>
					</m.div>
				)}
			</AnimatePresence>
		</LazyMotion>,
		document.body
	)
}
