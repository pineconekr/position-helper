import { useDroppable, useDraggable } from '@dnd-kit/core'
import { useMemo } from 'react'
import type { RoleKey } from '../../types'
import { useAppStore } from '../../state/store'

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

	const bg = isOver ? 'rgba(94,234,212,0.08)' : 'transparent'

	return (
		<div ref={setNodeRef} className="role-cell" style={{ background: bg }}>
			<div
				className="role-slot"
				onClick={() => onSlotClick?.(part, role, index)}
				role="button"
				tabIndex={0}
				onKeyDown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault()
						onSlotClick?.(part, role, index)
					}
				}}
			>
				{value ? (
					<AssignedPill part={part} role={role} index={index} name={value} />
				) : <span className="muted">드롭/선택</span>}
			</div>
			{value && (
				<button 
					className="btn-remove" 
					onClick={() => clearRole(part, role as any, index as any)}
					title="지우기"
					aria-label="지우기"
				>
					<span className="material-symbol">close</span>
				</button>
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
			style={{
				...style,
				backgroundColor: hasWarning ? 'rgba(239, 68, 68, 0.15)' : undefined
			} as any} 
			className="assigned-pill" 
			{...attributes} 
			{...listeners}
		>
			{name}
		</div>
	)
}


