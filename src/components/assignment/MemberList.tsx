import { useMemo } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { useAppStore } from '../../state/store'

function DraggableMember({ id, name }: { id: string; name: string }) {
	const { attributes, listeners, setNodeRef, transform } = useDraggable({ id })
	const style = { transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined }
	return (
		<div ref={setNodeRef} style={style as any} className="member-item" {...listeners} {...attributes}>
			{name}
		</div>
	)
}

export default function MemberList({ orientation = 'vertical' }: { orientation?: 'vertical' | 'horizontal' }) {
	const members = useAppStore((s) => s.app.members)
	const items = useMemo(() => members.map((m) => ({ id: `member:${m.name}`, name: m.name })), [members])
	return (
		<div className="panel" style={{ padding: 12 }}>
			<div style={{ fontWeight: 600, marginBottom: 8 }}>팀원</div>
			<div className={orientation === 'horizontal' ? 'member-list horizontal' : undefined}>
				{items.map((i) => <DraggableMember key={i.id} id={i.id} name={i.name} />)}
				{items.length === 0 && <div className="muted">팀원을 먼저 추가하세요</div>}
			</div>
		</div>
	)
}


