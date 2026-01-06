import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { useAppStore } from '@/shared/state/store'
import { BLANK_ROLE_VALUE } from '@/shared/utils/assignment'
import { encodeMemberId } from '@/shared/utils/dndIds'
import Icon from '@/shared/components/ui/Icon'
import { Panel } from '@/shared/components/ui/Panel'
import clsx from 'clsx'

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
	assigned?: boolean
	onClick?: () => void
}

function MemberItem({ label, value, selected, assigned, onClick }: MemberItemProps) {
	const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
		id: encodeMemberId(value === '' ? BLANK_ROLE_VALUE : value)
	})

	const style: CSSProperties = {
		cursor: 'grab',
		userSelect: 'none',
		transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
		opacity: isDragging ? 0.5 : (assigned ? 0.6 : 1),
		zIndex: isDragging ? 100 : undefined,
	}

	return (
		<div
			ref={setNodeRef}
			className={clsx(
				'px-3 py-1.5 rounded-full border transition-all duration-150',
				'flex items-center gap-1.5 min-h-[32px]',
				'text-sm font-medium',
				selected
					? 'bg-[var(--color-accent)] text-white border-transparent shadow-sm'
					: 'bg-[var(--color-surface)] border-[var(--color-border-subtle)] text-[var(--color-label-primary)] hover:border-[var(--color-border-default)] hover:shadow-sm',
				assigned && 'bg-[var(--color-surface-elevated)] text-[var(--color-label-secondary)] border-transparent'
			)}
			onClick={onClick}
			style={style}
			{...attributes}
			{...listeners}
		>
			{assigned && <Icon name="check" size={12} className={selected ? 'text-white' : 'text-[var(--color-accent)]'} />}
			<span>{label}</span>
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
	const members = useAppStore((s) => s.app?.members || [])
	const draft = useAppStore((s) => s.currentDraft)

	const assignedNames = useMemo(() => {
		const names = new Set<string>()
		if (!draft) return names

		const parts = [draft.part1, draft.part2]

		parts.forEach(p => {
			if (p.SW) names.add(p.SW)
			if (p['자막']) names.add(p['자막'])
			if (p['고정']) names.add(p['고정'])
			if (p['스케치']) names.add(p['스케치'])
			p['사이드'].forEach(n => {
				if (n) names.add(n)
			})
		})
		return names
	}, [draft])

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
		const blank = { id: encodeMemberId(BLANK_ROLE_VALUE), label: '공란', value: '' }
		return [...mapped, blank]
	}, [members])

	const isInline = variant === 'inline'

	const content = (
		<>
			{title && (
				<div className="text-sm font-semibold mb-2 flex items-center gap-2 text-[var(--color-label-secondary)]">
					<span>{title}</span>
				</div>
			)}
			<div
				className={`flex gap-2 ${orientation === 'horizontal' ? 'flex-row flex-wrap' : 'flex-col'}`}
			>
				{items.map((i) => (
					<MemberItem
						key={i.id}
						label={i.label}
						value={i.value}
						selected={selectedMember === i.value}
						assigned={i.value !== '' && assignedNames.has(i.value)}
						onClick={i.value === '' ? undefined : () => onMemberClick?.(i.value)}
					/>
				))}
				{items.length === 0 && (
					<div className="text-xs text-[var(--color-label-tertiary)] py-2">
						팀원을 먼저 추가하세요
					</div>
				)}
			</div>
		</>
	)

	if (isInline) {
		return <div className="flex flex-col gap-2">{content}</div>
	}

	return (
		<Panel className="p-3">
			{content}
		</Panel>
	)
}
