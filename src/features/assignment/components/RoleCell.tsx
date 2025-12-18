import { useDroppable, useDraggable } from '@dnd-kit/core'
import { useMemo } from 'react'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { useAppStore } from '@/shared/state/store'
import type { RoleKey } from '@/shared/types'

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

	const hasValue = !!value
	const bg = isOver && !hasValue ? 'var(--color-accent-soft)' : 'var(--color-surface-1)'
	const outerStyle = hasValue
		? { background: 'transparent', border: 'none', padding: 0, minHeight: 0, gap: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }
		: { background: bg, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-border-subtle)', minHeight: 48, gap: 8 }

	return (
		<div ref={setNodeRef} className="role-cell" style={outerStyle}>
			<div
				className="role-slot"
				onClick={() => onSlotClick?.(part, role, index)}
				role="button"
				tabIndex={0}
				style={{
					flex: hasValue ? '0 1 auto' : 1,
					minWidth: 0,
					cursor: 'pointer',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center'
				}}
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
					style={{ padding: 0, width: 24, height: 24, minWidth: 24 }}
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
	
	const isBlank = name === '__blank__'
	const displayName = isBlank ? '-' : name

	const hasWarning = useMemo(() => {
		if (isBlank) return false // 공란은 경고 대상 제외
		return warnings.some((w) => {
			const t = w.target
			if (!t?.name || t.name !== name) return false
			if (t.role && t.role !== role) return false
			if (t.part && t.part !== part) return false
			return true
		})
	}, [warnings, name, role, part, isBlank])
	
	return (
		<div
			ref={setNodeRef}
			style={style}
			{...attributes}
			{...listeners}
		>
			<Badge
				variant={hasWarning ? 'critical' : 'accent'}
				style={{ cursor: 'grab', fontSize: '0.875rem', padding: '4px 10px', maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
			>
				{displayName}
			</Badge>
		</div>
	)
}
