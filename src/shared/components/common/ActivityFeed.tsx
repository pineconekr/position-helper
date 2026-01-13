import { AnimatePresence, m, LazyMotion, domAnimation } from 'framer-motion'
import { useCallback, useMemo, useState } from 'react'
import { Button } from '@/shared/components/ui/Button'
import Icon from '@/shared/components/ui/Icon'
import { useAppStore } from '@/shared/state/store'
import type { ActivityEntry, ActivityType } from '@/shared/types'
import { useShouldReduceMotion } from '@/shared/utils/motion'
import Modal from './Modal'
import { AnimatedCollapse } from './AnimatedCollapse'
import clsx from 'clsx'

type StatusTone = 'success' | 'warning' | 'info' | 'neutral'

type ActivityFeedProps = {
	title?: string
	filter?: ActivityType[]
	maxItems?: number
	emptyMessage?: string
	collapsible?: boolean
	defaultCollapsed?: boolean
	showUndo?: boolean
}

type EntryStyle = {
	icon: string
	bgClass: string
	textClass: string
	label: string
	tone: StatusTone
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const typeLabels: Record<ActivityType, string> = {
	assignment: '배정',
	absence: '불참',
	finalize: '확정',
	member: '팀원',
	system: '시스템'
}

const typeIcons: Record<ActivityType, string> = {
	assignment: 'assignment_ind',
	absence: 'event_busy',
	finalize: 'check_circle',
	member: 'person',
	system: 'settings'
}

function getEntryStyle(entry: ActivityEntry): EntryStyle {
	let icon = typeIcons[entry.type]
	let bgClass = ''
	let textClass = ''
	let label = typeLabels[entry.type]
	let tone: StatusTone = 'info'

	// 기본 스타일 설정
	switch (entry.type) {
		case 'assignment':
			bgClass = 'bg-[var(--color-accent)]/10'
			textClass = 'text-[var(--color-accent)]'
			break
		case 'absence':
			bgClass = 'bg-[var(--color-danger)]/10'
			textClass = 'text-[var(--color-danger)]'
			break
		case 'finalize':
			bgClass = 'bg-[var(--color-success)]/10'
			textClass = 'text-[var(--color-success)]'
			tone = 'success'
			break
		case 'member':
			bgClass = 'bg-[var(--color-surface-elevated)]'
			textClass = 'text-[var(--color-label-primary)]'
			break
		case 'system':
			bgClass = 'bg-[var(--color-surface-elevated)]'
			textClass = 'text-[var(--color-label-secondary)]'
			tone = 'neutral'
			break
	}

	// Assignment 세부 상태 확인 (변경/해제)
	if (entry.type === 'assignment') {
		const before = entry.meta?.before as string | undefined
		const after = entry.meta?.after as string | undefined

		if (before && !after) {
			icon = 'person_remove'
			bgClass = 'bg-[var(--color-surface-elevated)]'
			textClass = 'text-[var(--color-label-secondary)]'
			label = '해제'
			tone = 'warning'
		} else if (before && after && before !== after) {
			icon = 'sync_alt'
			label = '변경'
			tone = 'info'
		}
	}

	return { icon, bgClass, textClass, label, tone }
}

function formatTime(timestamp: string): string {
	try {
		const date = new Date(timestamp)
		return date.toLocaleString('ko-KR', {
			hour: '2-digit',
			minute: '2-digit'
		})
	} catch {
		return timestamp
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────────────────

function StatusDot({ tone }: { tone: StatusTone }) {
	const toneClasses = {
		success: 'bg-[var(--color-success)]',
		warning: 'bg-[var(--color-warning)]',
		info: 'bg-[var(--color-accent)]',
		neutral: 'bg-[var(--color-label-tertiary)]'
	}
	return <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 mr-2 ${toneClasses[tone]}`} />
}

function ActivityItemInline({ entry }: { entry: ActivityEntry }) {
	const { icon, bgClass, textClass, label, tone } = getEntryStyle(entry)

	return (
		<li className="flex items-center py-2 px-3 rounded-[var(--radius-sm)] bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-sm">
			<div className={clsx('w-6 h-6 rounded-[4px] flex items-center justify-center shrink-0', bgClass, textClass)}>
				<Icon name={icon} size={14} />
			</div>
			<div className="flex-1 min-w-0 ml-3 flex items-center gap-2">
				<div className="flex items-center shrink-0">
					<StatusDot tone={tone} />
					<span className="font-semibold text-[var(--color-label-primary)]">{label}</span>
				</div>
				<span className="text-[var(--color-label-tertiary)]">|</span>
				<span className="flex-1 truncate text-[var(--color-label-secondary)]">
					{entry.description || entry.title}
				</span>
				<time className="text-xs text-[var(--color-label-tertiary)] whitespace-nowrap ml-auto">
					{formatTime(entry.timestamp)}
				</time>
			</div>
		</li>
	)
}

function ActivityItemFull({ entry, onRemove }: { entry: ActivityEntry; onRemove?: () => void }) {
	const { icon, bgClass, textClass, label, tone } = getEntryStyle(entry)

	return (
		<li className="flex gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--color-canvas)] border border-[var(--color-border-subtle)] group">
			<div className={clsx('w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0', bgClass, textClass)}>
				<Icon name={icon} size={16} />
			</div>
			<div className="flex-1 min-w-0 flex flex-col gap-0.5">
				<div className="flex items-center justify-between mb-0.5">
					<div className="flex items-center gap-2">
						<StatusDot tone={tone} />
						<span className="text-xs font-semibold text-[var(--color-label-secondary)] uppercase">{label}</span>
						<time className="text-xs text-[var(--color-label-tertiary)]">{formatTime(entry.timestamp)}</time>
					</div>
					{onRemove && (
						<button
							type="button"
							className="opacity-0 group-hover:opacity-100 p-1 text-[var(--color-label-tertiary)] hover:text-[var(--color-danger)] transition-opacity"
							onClick={onRemove}
						>
							<Icon name="close" size={14} />
						</button>
					)}
				</div>
				<div className="text-base font-medium text-[var(--color-label-primary)]">{entry.title}</div>
				{entry.description && (
					<div className="text-sm text-[var(--color-label-secondary)]">{entry.description}</div>
				)}
			</div>
		</li>
	)
}

function ActivityList({ entries, onShowModal, withAnimation = false }: { entries: ActivityEntry[]; onShowModal: () => void; withAnimation?: boolean }) {
	return (
		<>
			<ul className="flex flex-col gap-1.5 list-none">
				{entries.map((entry) => (
					<ActivityItemInline key={entry.id} entry={entry} />
				))}
			</ul>
			<div className="flex justify-center mt-2">
				<Button
					size="sm"
					variant="ghost"
					onClick={(e) => {
						e.stopPropagation()
						onShowModal()
					}}
					className="text-xs h-6"
				>
					전체 기록 보기
				</Button>
			</div>
		</>
	)
}

export default function ActivityFeed({
	title = '최근 활동',
	filter,
	maxItems = 16,
	emptyMessage = '최근 활동이 없습니다.',
	collapsible = true,
	defaultCollapsed = true,
	showUndo = false
}: ActivityFeedProps) {
	const activityLog = useAppStore((s) => s.activityLog)
	const removeActivity = useAppStore((s) => s.removeActivity)
	const undoLastAssignment = useAppStore((s) => s.undoLastAssignment)
	const canUndo = useAppStore((s) => s.canUndo)
	const [collapsed, setCollapsed] = useState(collapsible && defaultCollapsed)
	const [showModal, setShowModal] = useState(false)

	const handleRemove = useCallback((id: string) => removeActivity(id), [removeActivity])

	const filteredEntries = useMemo(() => {
		return filter && filter.length > 0
			? activityLog.filter((entry) => filter.includes(entry.type))
			: activityLog
	}, [activityLog, filter])

	const displayEntries = useMemo(() => {
		const maxVisible = collapsed ? 1 : maxItems
		return filteredEntries.slice(0, maxVisible)
	}, [filteredEntries, collapsed, maxItems])

	const newCount = Math.max(0, filteredEntries.length - 1)

	if (filteredEntries.length === 0) {
		return (
			<div className="p-3 rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] flex justify-between items-center">
				<div className="text-sm font-semibold text-[var(--color-label-primary)]">{title}</div>
				<span className="text-sm text-[var(--color-label-tertiary)]">{emptyMessage}</span>
			</div>
		)
	}

	return (
		<>
			<div className="p-3 rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] shadow-sm">
				<div
					className={clsx(
						"flex items-center justify-between select-none",
						collapsed ? 'mb-0' : 'mb-3',
						collapsible ? 'cursor-pointer' : 'cursor-default'
					)}
					onClick={() => collapsible && setCollapsed(!collapsed)}
				>
					<div className="flex items-center gap-2">
						<div className="text-sm font-semibold text-[var(--color-label-primary)]">{title}</div>
						{collapsed && newCount > 0 && (
							<span className="text-xs px-1.5 py-0.5 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-medium">
								+{newCount}
							</span>
						)}
					</div>
					<div className="flex items-center gap-2">
						{showUndo && canUndo && (
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation()
									undoLastAssignment()
								}}
								className="flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium rounded-[4px]
									bg-[var(--color-warning)]/10 text-[var(--color-warning)]
									hover:bg-[var(--color-warning)]/20 transition-colors"
							>
								<Icon name="undo" size={12} />
								<span>실행취소</span>
							</button>
						)}
						{collapsible && (
							<Icon
								name="expand_more"
								size={16}
								className={clsx("text-[var(--color-label-tertiary)] transition-transform", collapsed ? "rotate-0" : "rotate-180")}
							/>
						)}
					</div>
				</div>

				<AnimatedCollapse isOpen={!collapsed}>
					<ActivityList entries={displayEntries} onShowModal={() => setShowModal(true)} />
				</AnimatedCollapse>
			</div >

			<Modal
				title="활동 기록 전체"
				open={showModal}
				onClose={() => setShowModal(false)}
			>
				<ul className="flex flex-col gap-2 list-none">
					{filteredEntries.map((entry) => (
						<ActivityItemFull
							key={entry.id}
							entry={entry}
							onRemove={() => handleRemove(entry.id)}
						/>
					))}
				</ul>
				{filteredEntries.length === 0 && (
					<div className="text-center py-8 text-[var(--color-label-tertiary)] text-sm">
						기록이 없습니다.
					</div>
				)}
			</Modal>
		</>
	)
}