import { ReactNode } from 'react'

type Props = {
	title: string
	open: boolean
	onClose: () => void
	children: ReactNode
	footer?: ReactNode
}

export default function Modal({ title, open, onClose, children, footer }: Props) {
	if (!open) return null
	return (
		<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)', display: 'grid', placeItems: 'center', zIndex: 50 }}>
			<div className="panel" style={{ width: 520, maxWidth: '90vw', padding: 16, borderRadius: 12, boxShadow: '0 12px 32px rgba(0,0,0,0.35)' }}>
				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
					<h3 style={{ margin: 0, fontSize: 18 }}>{title}</h3>
					<button
						onClick={onClose}
						title="닫기"
						style={{
							background: 'transparent',
							border: 'none',
							cursor: 'pointer',
							width: 32,
							height: 32,
							borderRadius: 8,
							display: 'grid',
							placeItems: 'center',
							color: 'var(--text)'
						}}
						aria-label="닫기"
					>
						<span style={{ fontSize: 18, lineHeight: 1 }}>×</span>
					</button>
				</div>
				<div style={{ marginBottom: 12 }}>{children}</div>
				{footer && <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>{footer}</div>}
			</div>
		</div>
	)
}


