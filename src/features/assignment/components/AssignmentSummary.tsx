import { useMemo } from 'react'
import { useAppStore } from '@/shared/state/store'
import { analyzeDraft } from '@/shared/utils/assignment'
import ActivityFeed from '@/shared/components/common/ActivityFeed'
import { Button } from '@/shared/components/ui/Button'

type Props = {
	onOpenCalendar: () => void
}

type StatusCardProps = {
	icon: string
	label: string
	value: number
	total?: number
	unit?: string
	variant: 'success' | 'warning' | 'neutral'
	emphasis?: 'default' | 'strong'
}

type ProgressLabelPlacement = 'inline' | 'inside'

type ProgressProps = {
	value: number
	label?: string
	labelPlacement?: ProgressLabelPlacement
}

function StatusCard({
	icon,
	label,
	value,
	total,
	unit,
	variant,
	emphasis = 'default'
}: StatusCardProps) {
	return (
		<div
			className="assignment-summary__stat-card"
			data-variant={variant}
			data-emphasis={emphasis}
		>
			<div className="stat-icon" data-variant={variant}>
				<span className="material-symbol">{icon}</span>
			</div>
			<div className="stat-content">
				<span className="stat-label">{label}</span>
				<span className="stat-value">
					{value}
					{typeof total === 'number' && <span className="stat-total">/{total}</span>}
					{unit && <span className="stat-unit">{unit}</span>}
				</span>
			</div>
		</div>
	)
}

function ProgressBar({
	value,
	label = '진행률',
	labelPlacement = 'inline'
}: ProgressProps) {
	const clamped = Math.max(0, Math.min(100, Math.round(value)))

	return (
		<div className="assignment-summary__progress-section" data-label-placement={labelPlacement}>
			<div className="progress-header">
				<span className="progress-label">{label}</span>
				{labelPlacement === 'inline' && <span className="progress-percent">{clamped}%</span>}
			</div>
			<div className={`progress-track ${labelPlacement === 'inside' ? 'has-inside-label' : ''}`}>
				<div className="progress-fill" style={{ width: `${clamped}%` }} />
				{labelPlacement === 'inside' && (
					<span className="progress-percent progress-percent--inside">{clamped}%</span>
				)}
			</div>
		</div>
	)
}

export default function AssignmentSummary({ onOpenCalendar }: Props) {
	const currentWeekDate = useAppStore((s) => s.currentWeekDate)
	const draft = useAppStore((s) => s.currentDraft)
	const warnings = useAppStore((s) => s.warnings)

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

	return (
		<div className="panel assignment-summary">
			<div className="assignment-summary__top">
				<div className="assignment-summary__heading">
					<h2 className="assignment-summary__title">이번 주 배정 현황</h2>
					<span className="assignment-summary__date">{dateLabel}</span>
				</div>
				<Button size="sm" onClick={onOpenCalendar}>
					주차 선택
				</Button>
			</div>

			<div className="assignment-summary__stats-grid">
				<StatusCard
					icon="check_circle"
					label="배정 완료"
					value={assigned}
					total={total}
					variant="success"
				/>

				<StatusCard
					icon="warning"
					label="경고"
					value={warnings.length}
					unit="건"
					variant="warning"
					emphasis={warnings.length > 0 ? 'strong' : 'default'}
				/>

				<StatusCard
					icon="person_off"
					label="미배정"
					value={emptySlots.length}
					unit="개"
					variant="neutral"
				/>
			</div>

			<ProgressBar value={progressPercent} labelPlacement="inline" />

			<div className="assignment-summary__feed">
				<ActivityFeed
					title="최근 배정 변경"
					filter={['assignment', 'absence', 'finalize']}
					collapsible={true}
					defaultCollapsed={true}
					maxItems={3}
					emptyMessage="아직 변경 기록이 없습니다."
				/>
			</div>
		</div>
	)
}
