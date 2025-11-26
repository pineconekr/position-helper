import { ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useMotionConfig } from '../../utils/motion'

type Props = {
	title: string
	open: boolean
	onClose: () => void
	children: ReactNode
	footer?: ReactNode
}

export default function Modal({ title, open, onClose, children, footer }: Props) {
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
					style={{
						position: 'fixed',
						inset: 0,
						background: 'var(--color-overlay)',
						backdropFilter: 'blur(6px)',
						display: 'grid',
						placeItems: 'center',
						zIndex: 1000
					}}
					initial={shouldReduce ? { opacity: 1 } : { opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={shouldReduce ? { opacity: 1 } : { opacity: 0, transition: { duration: duration.fast, ease: ease.in } }}
					transition={{ duration: duration.normal, ease: ease.out }}
					role="presentation"
				>
					<motion.div
						className="panel modal-panel"
						role="dialog"
						aria-modal="true"
						initial={shouldReduce ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 16, scale: 0.98 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={
							shouldReduce
								? { opacity: 1, y: 0, scale: 1 }
								: { opacity: 0, y: 12, scale: 0.98, transition: { duration: duration.fast, ease: ease.in } }
						}
						transition={{ duration: duration.normal, ease: ease.out }}
					>
						<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
							<h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{title}</h3>
							<button
								onClick={onClose}
								title="닫기"
								style={{
									background: 'var(--color-surface-2)',
									border: '1px solid var(--color-border-subtle)',
									cursor: 'pointer',
									width: 32,
									height: 32,
									borderRadius: '50%',
									display: 'grid',
									placeItems: 'center',
									color: 'var(--color-text-muted)',
									transition: 'all var(--motion-duration-fast) var(--motion-ease-default)'
								}}
								onMouseOver={(e) => {
									e.currentTarget.style.background = 'var(--color-surface-1)'
									e.currentTarget.style.color = 'var(--color-text-primary)'
									e.currentTarget.style.borderColor = 'var(--color-border-strong)'
								}}
								onMouseOut={(e) => {
									e.currentTarget.style.background = 'var(--color-surface-2)'
									e.currentTarget.style.color = 'var(--color-text-muted)'
									e.currentTarget.style.borderColor = 'var(--color-border-subtle)'
								}}
								aria-label="닫기"
							>
								<span className="material-symbol" style={{ fontSize: 20, lineHeight: 1 }}>close</span>
							</button>
						</div>
						<div style={{ flex: 1, overflow: 'auto', overflowX: 'hidden', minHeight: 0, marginBottom: footer ? 20 : 0 }}>{children}</div>
						{footer && <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 20, borderTop: '1px solid var(--color-border-subtle)' }}>{footer}</div>}
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>,
		document.body
	)
}


