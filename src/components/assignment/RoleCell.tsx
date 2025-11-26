import { useDroppable, useDraggable } from '@dnd-kit/core'
import { useMemo } from 'react'
import type { RoleKey } from '../../types'
import { useAppStore } from '../../state/store'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'

type Props = {
	part: 'part1' | 'part2'
	role: RoleKey
	index?: 0 | 1
	onSlotClick?: (part: 'part1' | 'part2', role: RoleKey, index?: 0 | 1) => void
}

export default function RoleCell({ part, role, index, onSlotClick }: Props) {
	const id = `drop:${part}:${role}:${index ?? 'single'}`
	const { isOver, setNodeRef } = useDroppable({ id })
	const assignRole = useAppStore((s) => s.assignRole)
	const clearRole = useAppStore((s) => s.clearRole)
	const draft = useAppStore((s) => s.currentDraft)
	const value = role === '사이드'
		? draft[part]['사이드'][index ?? 0]
		: (draft[part] as any)[role] as string

	const bg = isOver ? 'var(--color-accent-soft)' : 'var(--color-surface-1)'

	return (
		<div ref={setNodeRef} className="role-cell" style={{ background: bg, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-border-subtle)', minHeight: 48, gap: 8 }}>
			<div
				className="role-slot"
				onClick={() => onSlotClick?.(part, role, index)}
				role="button"
				tabIndex={0}
				style={{ flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
				onKeyDown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault()
						onSlotClick?.(part, role, index)
					}
				}}
			>
				{value ? (
					<AssignedPill part={part} role={role} index={index} name={value} />
				) : <span className="muted" style={{ fontSize: '0.8125rem' }}>드롭/선택</span>}
			</div>
			{value && (
				<Button 
					variant="ghost" 
					size="sm"
					onClick={() => clearRole(part, role as any, index as any)}
					title="지우기"
					aria-label="지우기"
					icon="close"
					style={{ padding: 0, width: 28, height: 28 }}
				/>
			)}
		</div>
	)
}

function AssignedPill({ part, role, index, name }: { part: 'part1' | 'part2'; role: RoleKey; index?: 0 | 1; name: string }) {
	const id = `assigned:${part}:${role}:${index ?? 'single'}:${name}`
	const { attributes, listeners, setNodeRef, transform } = useDraggable({ id })
	const warnings = useAppStore((s) => s.warnings)
	const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined
	
	const hasWarning = useMemo(() => {
		return warnings.some((w) => {
			const t = w.target
			if (!t?.name || t.name !== name) return false
			if (t.role && t.role !== role) return false
			if (t.part && t.part !== part) return false
			return true
		})
	}, [warnings, name, role, part])
	
	return (
		<div
			ref={setNodeRef}
			style={style}
			{...attributes}
			{...listeners}
		>
			<Badge 
				variant={hasWarning ? 'critical' : 'accent'}
				style={{ cursor: 'grab', fontSize: '0.875rem', padding: '4px 10px' }}
			>
				{name}
			</Badge>
		</div>
	)
}
