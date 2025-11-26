import { useMemo } from 'react'
import { useAppStore } from '../../state/store'

type Props = {
	orientation?: 'vertical' | 'horizontal'
	selectedMember?: string | null
	onMemberClick?: (name: string) => void
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

export default function MemberList({ orientation = 'vertical', selectedMember, onMemberClick }: Props) {
	const members = useAppStore((s) => s.app.members)
	const items = useMemo(() => members.map((m) => ({ id: `member:${m.name}`, name: m.name })), [members])
	return (
		<div className="panel" style={{ padding: 12 }}>
			<div style={{ fontWeight: 600, marginBottom: 8 }}>팀원 목록</div>
			<div className={orientation === 'horizontal' ? 'member-list horizontal' : 'member-list'}>
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


