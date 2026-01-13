'use client'

import { useState, useMemo } from 'react'
import Icon from '@/shared/components/ui/Icon'
import { useAppStore } from '@/shared/state/store'
import type { Warning } from '@/shared/types'
import { AnimatedCollapse } from '@/shared/components/common/AnimatedCollapse'
import { stripCohort } from '@/shared/utils/assignment'
import clsx from 'clsx'

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const levelStyles = {
	error: {
		wrapper: 'bg-[var(--color-danger)]/5 border-[var(--color-danger)]/20',
		icon: 'text-[var(--color-danger)]',
		text: 'text-[var(--color-danger)]',
		subText: 'text-[var(--color-danger)]/80',
	},
	warn: {
		wrapper: 'bg-[var(--color-warning)]/5 border-[var(--color-warning)]/20',
		icon: 'text-[var(--color-warning)]',
		text: 'text-[var(--color-warning)]', // Darker text for readability if needed, or use warning color
		subText: 'text-[var(--color-warning)]/80',
	},
	info: {
		wrapper: 'bg-[var(--color-surface)] border-[var(--color-border-subtle)]',
		icon: 'text-[var(--color-accent)]',
		text: 'text-[var(--color-label-primary)]',
		subText: 'text-[var(--color-label-secondary)]',
	},
}

function FilterChip({
	label,
	count,
	active,
	onClick,
	variant = 'info'
}: {
	label: string
	count: number
	active: boolean
	onClick: () => void
	variant?: 'error' | 'warn' | 'info'
}) {
	const activeClass = variant === 'error' ? 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] ring-1 ring-[var(--color-danger)]/20'
		: variant === 'warn' ? 'bg-[var(--color-warning)]/10 text-[var(--color-warning)] ring-1 ring-[var(--color-warning)]/20'
			: 'bg-[var(--color-surface-elevated)] text-[var(--color-label-primary)] ring-1 ring-[var(--color-border-default)] shadow-sm'

	const inactiveClass = 'bg-transparent text-[var(--color-label-secondary)] border border-[var(--color-border-subtle)] hover:bg-[var(--color-surface)]'

	return (
		<button
			type="button"
			onClick={onClick}
			aria-pressed={active}
			className={clsx(
				'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200',
				active ? activeClass : inactiveClass
			)}
		>
			<span>{label}</span>
			{count > 0 && (
				<span className={clsx(
					'px-1.5 py-0.5 rounded-full text-xs',
					active ? 'bg-white/50 backdrop-blur-sm' : 'bg-[var(--color-surface-elevated)]'
				)}>
					{count}
				</span>
			)}
		</button>
	)
}

function WarningItem({ warning }: { warning: Warning }) {
	const styles = levelStyles[warning.level]
	const partLabel = warning.target?.part === 'part1' ? '1부' : warning.target?.part === 'part2' ? '2부' : null

	const iconName = warning.level === 'error' ? 'error'
		: warning.level === 'warn' ? 'warning'
			: 'info'

	const timeMatch = warning.message.match(/\(([^)]+)\)$/)
	const timeContext = timeMatch ? timeMatch[1] : null
	const cleanMessage = timeContext
		? warning.message.replace(/\s*\([^)]+\)$/, '').trim()
		: warning.message

	return (
		<div className={clsx(
			'group relative flex gap-3 p-3 rounded-[var(--radius-md)] border transition-all duration-200 hover:shadow-sm',
			styles.wrapper
		)}>
			{/* Status Icon */}
			<div className={clsx('mt-0.5 shrink-0', styles.icon)}>
				<Icon name={iconName} size={18} />
			</div>

			<div className="flex-1 min-w-0 flex flex-col gap-1.5">
				{/* Top Row: Message & Time */}
				<div className="flex items-start justify-between gap-2">
					<span className={clsx('text-sm font-bold leading-snug', styles.text)}>
						{cleanMessage}
					</span>
					{timeContext && (
						<span className={clsx(
							'shrink-0 text-xs font-bold px-1.5 py-0.5 rounded-[4px] border',
							warning.level === 'error'
								? 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] border-[var(--color-danger)]/20'
								: 'bg-[var(--color-warning)]/10 text-[var(--color-warning)] border-[var(--color-warning)]/20'
						)}>
							{timeContext}
						</span>
					)}
				</div>

				{/* Bottom Row: Context Breadcrumbs */}
				<div className="flex items-center flex-wrap gap-1.5 text-xs text-[var(--color-label-secondary)]">
					{(partLabel || warning.target?.role || warning.target?.name) ? (
						<div className="flex items-center gap-1 bg-[var(--color-surface-elevated)] px-1.5 py-0.5 rounded-[4px] border border-[var(--color-border-subtle)]">
							{partLabel && (
								<span className="font-medium text-[var(--color-label-primary)]">{partLabel}</span>
							)}
							{partLabel && warning.target?.role && (
								<Icon name="chevron_right" size={12} className="opacity-50" />
							)}

							{warning.target?.role && (
								<span className="font-medium text-[var(--color-label-primary)]">{warning.target.role}</span>
							)}
							{warning.target?.role && warning.target?.name && (
								<Icon name="chevron_right" size={12} className="opacity-50" />
							)}

							{warning.target?.name && (
								<span className="font-bold text-[var(--color-label-primary)]">
									{stripCohort(warning.target.name)}
								</span>
							)}
						</div>
					) : (
						/* 타겟 정보가 없는 경우 (General Warning) */
						<span className="text-[var(--color-label-tertiary)]">일반 알림</span>
					)}
				</div>
			</div>
		</div>
	)
}

export default function WarningWidget() {
	const warnings = useAppStore((s) => s.warnings || [])
	const [isExpanded, setIsExpanded] = useState(true)
	const [filter, setFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all')

	const counts = useMemo(() => ({
		all: warnings.filter(w => w.level !== 'info').length,
		error: warnings.filter(w => w.level === 'error').length,
		warn: warnings.filter(w => w.level === 'warn').length,
	}), [warnings])

	const visibleWarnings = useMemo(() => {
		let filtered = warnings.filter(w => w.level !== 'info')
		if (filter !== 'all') {
			filtered = filtered.filter(w => w.level === filter)
		}
		const levelRank = { error: 0, warn: 1, info: 2 }
		return [...filtered].sort((a, b) => levelRank[a.level] - levelRank[b.level])
	}, [warnings, filter])

	if (warnings.length === 0) return null

	const hasErrors = counts.error > 0

	return (
		<div className="rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border-subtle)] shadow-sm overflow-hidden transition-all duration-300">
			{/* Header */}
			<div className={clsx(
				'flex items-center justify-between px-4 py-3 border-b transition-colors cursor-pointer',
				hasErrors
					? 'bg-[var(--color-danger)]/5 border-[var(--color-danger)]/10'
					: 'bg-[var(--color-surface-elevated)] border-[var(--color-border-subtle)]'
			)} onClick={() => setIsExpanded(!isExpanded)}>
				<div className="flex items-center gap-2.5">
					<div className={clsx(
						'relative flex items-center justify-center w-7 h-7 rounded-[var(--radius-sm)]',
						hasErrors
							? 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]'
							: 'bg-[var(--color-surface)] text-[var(--color-label-secondary)] border border-[var(--color-border-subtle)]'
					)}>
						<Icon name={hasErrors ? 'error' : 'notifications'} size={16} />
						{hasErrors && (
							<span className="absolute -top-0.5 -right-0.5 block w-2 h-2 bg-[var(--color-danger)] rounded-full ring-2 ring-white dark:ring-black animate-pulse" />
						)}
					</div>
					<div>
						<h3 className="text-sm font-bold text-[var(--color-label-primary)] leading-none">
							배정 피드백
						</h3>
						<p className="text-xs text-[var(--color-label-secondary)] mt-0.5">
							{counts.all}개의 항목이 있습니다
						</p>
					</div>
				</div>

				<Icon
					name="expand_more"
					size={18}
					className={clsx(
						'text-[var(--color-label-tertiary)] transition-transform duration-200',
						isExpanded && 'rotate-180'
					)}
				/>
			</div>

			{/* Expandable Content */}
			<AnimatedCollapse isOpen={isExpanded}>
				<div className="p-3 bg-[var(--color-canvas)]">
					{/* Filter Chips */}
					<div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
						<FilterChip label="전체" count={counts.all} active={filter === 'all'} onClick={() => setFilter('all')} variant="info" />
						{counts.error > 0 && (
							<FilterChip label="긴급" count={counts.error} active={filter === 'error'} onClick={() => setFilter('error')} variant="error" />
						)}
						{counts.warn > 0 && (
							<FilterChip label="주의" count={counts.warn} active={filter === 'warn'} onClick={() => setFilter('warn')} variant="warn" />
						)}

					</div>

					{/* Warning List */}
					<div className="space-y-2">
						{visibleWarnings.length > 0 ? (
							visibleWarnings.map((w) => <WarningItem key={w.id} warning={w} />)
						) : (
							<div className="py-6 text-center text-xs text-[var(--color-label-tertiary)] bg-[var(--color-surface)] rounded-[var(--radius-md)] border border-dashed border-[var(--color-border-subtle)]">
								해당하는 항목이 없습니다
							</div>
						)}
					</div>
				</div>
			</AnimatedCollapse>
		</div>
	)
}
