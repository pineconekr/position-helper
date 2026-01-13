import { useMemo, useState } from 'react'
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
	// 비활성 멤버 토글 (외부 제어용)
	showInactive?: boolean
	onToggleInactive?: () => void
}

type MemberItemProps = {
	label: string
	value: string
	selected?: boolean
	assignmentCount?: number
	absent?: boolean
	inactive?: boolean
	onClick?: () => void
}

function MemberItem({ label, value, selected, assignmentCount = 0, absent, inactive, onClick }: MemberItemProps) {
	const isDisabled = absent || inactive
	const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
		id: encodeMemberId(value === '' ? BLANK_ROLE_VALUE : value),
		disabled: isDisabled // 불참자 또는 비활성 멤버는 드래그 불가
	})

	const style: CSSProperties = {
		cursor: isDisabled ? 'not-allowed' : 'grab',
		userSelect: 'none',
		transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
		opacity: isDragging ? 0.5 : (inactive ? 0.4 : (absent ? 0.5 : (assignmentCount > 0 ? 0.7 : 1))),
		zIndex: isDragging ? 100 : undefined,
	}

	return (
		<div
			ref={setNodeRef}
			className={clsx(
				'px-3 py-1.5 rounded-full border transition-all duration-150',
				'flex items-center gap-1.5 min-h-[32px]',
				'text-sm font-medium',
				// 비활성 상태 (최우선)
				inactive && 'border-dashed border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-[var(--color-label-tertiary)]',
				// 불참 상태
				!inactive && absent && 'border-[var(--color-danger)] bg-[var(--color-danger)]/5 text-[var(--color-label-tertiary)]',
				// 선택 상태
				!inactive && !absent && selected && 'bg-[var(--color-accent)] text-white border-transparent shadow-sm',
				// 배정된 상태
				!inactive && !absent && !selected && assignmentCount > 0 && 'bg-[var(--color-surface-elevated)] text-[var(--color-label-secondary)] border-[var(--color-border-subtle)]',
				// 기본 상태
				!inactive && !absent && !selected && assignmentCount === 0 && 'bg-[var(--color-surface)] border-[var(--color-border-subtle)] text-[var(--color-label-primary)] hover:border-[var(--color-border-default)] hover:shadow-sm'
			)}
			onClick={isDisabled ? undefined : onClick}
			style={style}
			{...(isDisabled ? {} : attributes)}
			{...(isDisabled ? {} : listeners)}
		>
			{/* 비활성 아이콘 */}
			{inactive && <Icon name="block" size={12} className="text-[var(--color-label-tertiary)]" />}

			{/* 불참 아이콘 */}
			{!inactive && absent && <Icon name="person_off" size={12} className="text-[var(--color-danger)]" />}

			{/* 배정 횟수 배지 */}
			{!inactive && !absent && assignmentCount > 0 && (
				<span className={clsx(
					'text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1',
					selected
						? 'bg-white/20 text-white'
						: 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
				)}>
					×{assignmentCount}
				</span>
			)}

			{/* 이름 (불참/비활성시 strikethrough) */}
			<span className={inactive || absent ? 'line-through' : undefined}>{label}</span>
		</div>
	)
}

export default function MemberList({
	orientation = 'vertical',
	selectedMember,
	onMemberClick,
	variant = 'panel',
	title = '팀원 목록',
	showInactive: externalShowInactive,
	onToggleInactive
}: Props) {
	const allMembers = useAppStore((s) => s.app?.members || [])
	const draft = useAppStore((s) => s.currentDraft)
	const currentWeekDate = useAppStore((s) => s.currentWeekDate)
	const app = useAppStore((s) => s.app)

	// 비활성 멤버 표시 여부 (외부 제어 또는 내부 상태)
	const [internalShowInactive, setInternalShowInactive] = useState(false)
	const showInactive = externalShowInactive ?? internalShowInactive
	const handleToggleInactive = onToggleInactive ?? (() => setInternalShowInactive(prev => !prev))

	// 비활성 멤버 수
	const inactiveCount = useMemo(() =>
		allMembers.filter(m => m.active === false).length
		, [allMembers])

	// 표시할 멤버 목록 (showInactive에 따라 필터링)
	const members = useMemo(() =>
		showInactive ? allMembers : allMembers.filter(m => m.active !== false)
		, [allMembers, showInactive])

	// 현재 주차 불참자 목록
	const absentNames = useMemo(() => {
		const absences = app.weeks[currentWeekDate]?.absences ?? []
		return new Set(absences.map(a => a.name))
	}, [app.weeks, currentWeekDate])

	// 배정 횟수 맵 (Set → Map으로 변경)
	const assignmentCounts = useMemo(() => {
		const counts = new Map<string, number>()
		if (!draft) return counts

		const parts = [draft.part1, draft.part2]

		parts.forEach(p => {
			const incrementCount = (name: string) => {
				if (name) counts.set(name, (counts.get(name) || 0) + 1)
			}
			incrementCount(p.SW)
			incrementCount(p['자막'])
			incrementCount(p['고정'])
			incrementCount(p['스케치'])
			p['사이드'].forEach(n => incrementCount(n))
		})
		return counts
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
		const mapped = byCohort.map((m) => ({
			id: encodeMemberId(m.name),
			label: m.name,
			value: m.name,
			inactive: m.active === false
		}))
		const blank = { id: encodeMemberId(BLANK_ROLE_VALUE), label: '공란', value: '', inactive: false }
		return [...mapped, blank]
	}, [members])

	const isInline = variant === 'inline'

	const content = (
		<>
			{title && (
				<div className="text-sm font-semibold mb-2 flex items-center justify-between text-[var(--color-label-secondary)]">
					<span>{title}</span>
					<button
						type="button"
						onClick={handleToggleInactive}
						className={clsx(
							'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all',
							showInactive
								? 'bg-[var(--color-accent)] text-white shadow-sm'
								: 'bg-[var(--color-surface-elevated)] text-[var(--color-label-tertiary)] hover:text-[var(--color-label-secondary)] border border-[var(--color-border-subtle)]'
						)}
					>
						<Icon name={showInactive ? 'visibility' : 'visibility_off'} size={14} />
						<span>비활성 멤버 포함 {inactiveCount > 0 && `(${inactiveCount})`}</span>
					</button>
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
						assignmentCount={i.value !== '' ? (assignmentCounts.get(i.value) || 0) : 0}
						absent={i.value !== '' && absentNames.has(i.value)}
						inactive={i.inactive}
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
