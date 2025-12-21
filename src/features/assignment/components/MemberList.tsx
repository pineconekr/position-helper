import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { useAppStore } from '@/shared/state/store'
import { BLANK_ROLE_VALUE } from '@/shared/utils/assignment'
import { encodeMemberId } from '@/shared/utils/dndIds'

type Props = {
	orientation?: 'vertical' | 'horizontal'
	selectedMember?: string | null
	onMemberClick?: (name: string) => void
	variant?: 'panel' | 'inline'
	title?: string | null
}

type MemberItemProps = {
	label: string
	value: string
	selected?: boolean
	onClick?: () => void
}

function MemberItem({ label, value, selected, onClick }: MemberItemProps) {
	const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
		id: encodeMemberId(value === '' ? BLANK_ROLE_VALUE : value)
	})
	const style = {
		cursor: 'grab',
		userSelect: 'none' as const,
		transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
		opacity: isDragging ? 0.7 : 1
	}

	return (
		<div
			ref={setNodeRef}
			className={`member-item${selected ? ' member-item--selected' : ''}`}
			onClick={onClick}
			style={style}
			{...attributes}
			{...listeners}
		>
			{label}
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
	const items = useMemo(() => {
		const byCohort = [...members].sort((a, b) => {
			const parse = (name: string) => {
				const m = name.match(/^(\d{2})\s/)
				return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER
			}
			const aGen = parse(a.name)
			const bGen = parse(b.name)
			if (aGen !== bGen) return aGen - bGen
			return a.name.localeCompare(b.name, 'ko')
		})
		const mapped = byCohort.map((m) => ({ id: encodeMemberId(m.name), label: m.name, value: m.name }))
		const blank = { id: encodeMemberId(BLANK_ROLE_VALUE), label: '-', value: '' }
		return [...mapped, blank]
	}, [members])

	const isInline = variant === 'inline'
	const containerStyle: CSSProperties = isInline
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
						label={i.label}
						value={i.value}
						selected={selectedMember === i.value}
						onClick={i.value === '' ? undefined : () => onMemberClick?.(i.value)}
					/>
				))}
				{items.length === 0 && <div className="muted">팀원을 먼저 추가하세요</div>}
			</div>
		</div>
	)
}


