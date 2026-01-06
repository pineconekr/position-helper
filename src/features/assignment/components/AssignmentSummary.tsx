'use client'

import { useMemo } from 'react'
import { useAppStore } from '@/shared/state/store'
import { analyzeDraft } from '@/shared/utils/assignment'
import ActivityFeed from '@/shared/components/common/ActivityFeed'
import Icon from '@/shared/components/ui/Icon'
import { Panel } from '@/shared/components/ui/Panel'
import clsx from 'clsx'

type StatusCardProps = {
	icon: string
	label: string
	value: number
	total?: number
	unit?: string
	variant: 'success' | 'warning' | 'default'
	emphasis?: boolean
}

const variantStyles: Record<StatusCardProps['variant'], { iconBg: string; iconText: string; border: string }> = {
	success: {
		iconBg: 'bg-[var(--color-success)]/10',
		iconText: 'text-[var(--color-success)]',
		border: 'border-[var(--color-success)]/20',
	},
	warning: {
		iconBg: 'bg-[var(--color-warning)]/10',
		iconText: 'text-[var(--color-warning)]',
		border: 'border-[var(--color-warning)]/20',
	},
	default: {
		iconBg: 'bg-[var(--color-surface-elevated)]',
		iconText: 'text-[var(--color-label-secondary)]',
		border: 'border-[var(--color-border-default)]',
	},
}

function StatusCard({ icon, label, value, total, unit, variant, emphasis }: StatusCardProps) {
	const styles = variantStyles[variant]

	return (
		<div
			className={clsx(
				'flex items-center gap-3 p-3 rounded-[var(--radius-md)] border transition-colors',
				styles.border,
				emphasis ? 'bg-[var(--color-surface-elevated)]' : 'bg-[var(--color-surface)]'
			)}
		>
			<div className={clsx('w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0', styles.iconBg)}>
				<Icon name={icon} size={18} className={styles.iconText} />
			</div>
			<div className="flex flex-col min-w-0">
				<span className="text-xs font-medium text-[var(--color-label-secondary)] uppercase tracking-wider">
					{label}
				</span>
				<div className="flex items-baseline gap-0.5">
					<span className="text-lg font-bold text-[var(--color-label-primary)] leading-tight">
						{value}
					</span>
					{typeof total === 'number' && (
						<span className="text-xs text-[var(--color-label-tertiary)]">/{total}</span>
					)}
				</div>
			</div>
		</div>
	)
}

function ProgressBar({ value, label = '진행률' }: { value: number; label?: string }) {
	const clamped = Math.max(0, Math.min(100, Math.round(value)))

	return (
		<div className="mb-4">
			<div className="flex justify-between items-center mb-1.5">
				<span className="text-xs font-semibold text-[var(--color-label-secondary)] uppercase tracking-wide">
					{label}
				</span>
				<span className="text-xs font-bold text-[var(--color-accent)]">{clamped}%</span>
			</div>
			<div className="relative bg-[var(--color-surface-elevated)] h-1.5 rounded-full overflow-hidden">
				<div
					className="absolute left-0 top-0 h-full bg-[var(--color-accent)] rounded-full transition-all duration-500 ease-out"
					style={{ width: `${clamped}%` }}
				/>
			</div>
		</div>
	)
}

export default function AssignmentSummary() {
	const currentWeekDate = useAppStore((s) => s.currentWeekDate)
	const draft = useAppStore((s) => s.currentDraft)
	const warnings = useAppStore((s) => s.warnings)
	const app = useAppStore((s) => s.app)

	const dateLabel = useMemo(() => {
		if (!currentWeekDate) return '주차 미지정'
		const date = new Date(currentWeekDate)
		return date.toLocaleDateString('ko-KR', {
			month: 'long',
			day: 'numeric',
			weekday: 'short'
		})
	}, [currentWeekDate])

	const { total, assigned, emptySlots } = useMemo(() => analyzeDraft(draft), [draft])
	const progressPercent = total === 0 ? 0 : Math.round((assigned / total) * 100)

	// 실제 참석 대상 (전체 멤버 - 불참자)
	const totalActive = app.members.filter(m => m.active !== false).length - (app.weeks[currentWeekDate]?.absences?.length || 0)

	return (
		<Panel className="p-5">
			{/* Header */}
			<div className="flex items-baseline justify-between mb-4">
				<div className="flex items-baseline gap-2">
					<h2 className="text-lg font-bold text-[var(--color-label-primary)] m-0">
						배정 현황
					</h2>
					<span className="text-xs font-medium text-[var(--color-label-tertiary)]">
						{dateLabel}
					</span>
				</div>
			</div>

			{/* Stats Grid */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
				<StatusCard
					icon="check_circle"
					label="배정 완료"
					value={assigned}
					total={total}
					variant="success"
					emphasis={assigned === total && total > 0}
				/>

				<StatusCard
					icon="groups"
					label="참석 가능"
					value={totalActive}
					unit="명"
					variant="default"
				/>

				<StatusCard
					icon="warning"
					label="이슈"
					value={warnings.length}
					variant="warning"
					emphasis={warnings.length > 0}
				/>

				<StatusCard
					icon="person_off"
					label="미배정 슬롯"
					value={emptySlots.length}
					variant="default"
					emphasis={emptySlots.length > 0}
				/>
			</div>

			{/* Progress Bar */}
			<ProgressBar value={progressPercent} />

			{/* Activity Feed */}
			<div className="pt-4 border-t border-[var(--color-border-subtle)]">
				<ActivityFeed
					title="최근 활동"
					filter={['assignment', 'absence', 'finalize']}
					collapsible={true}
					defaultCollapsed={true}
					maxItems={3}
					emptyMessage="아직 변경 기록이 없습니다."
					showUndo={true}
				/>
			</div>
		</Panel>
	)
}
