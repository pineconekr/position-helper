import { useMemo } from 'react'
import { useAppStore } from '@/shared/state/store'

type Props = {
	orientation?: 'vertical' | 'horizontal'
	selectedMember?: string | null
	onMemberClick?: (name: string) => void
	variant?: 'panel' | 'inline'
	title?: string | null
}

function MemberItem({ name, selected, onClick }: { name: string; selected?: boolean; onClick?: () => void }) {
	return (
		<div
			className={`member-item${selected ? ' member-item--selected' : ''}`}
			onClick={onClick}
			style={{ cursor: 'pointer' }}
		>
			{name}
		</div>
	)
}

export default function MemberList({
	orientation = 'vertical',
	selectedMember,
	onMemberClick,
	variant = 'panel',
	title = '팀원 목록'
}: Props) {
	const members = useAppStore((s) => s.app.members)
	const items = useMemo(() => members.map((m) => ({ id: `member:${m.name}`, name: m.name })), [members])

	const isInline = variant === 'inline'
	const containerStyle = isInline
		? {
			padding: '8px 10px',
			border: '1px solid var(--color-border-subtle)',
			borderRadius: 'var(--radius-md)',
			background: 'var(--color-surface-1)',
			overflowX: orientation === 'horizontal' ? 'auto' : undefined,
			display: 'flex',
			flexDirection: 'column',
			gap: 8
		}
		: { padding: 12 }

	return (
		<div className={isInline ? undefined : 'panel'} style={containerStyle}>
			{title !== null && (
				<div style={{ fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
					<span>{title}</span>
				</div>
			)}
			<div
				className={orientation === 'horizontal' ? 'member-list horizontal' : 'member-list'}
				style={isInline ? { gap: 8 } : undefined}
			>
				{items.map((i) => (
					<MemberItem
						key={i.id}
						name={i.name}
						selected={selectedMember === i.name}
						onClick={() => onMemberClick?.(i.name)}
					/>
				))}
				{items.length === 0 && <div className="muted">팀원을 먼저 추가하세요</div>}
			</div>
		</div>
	)
}


