import { useMemo } from 'react'
import { useAppStore } from '@/shared/state/store'
import { analyzeDraft } from '@/shared/utils/assignment'
import ActivityFeed from '@/shared/components/common/ActivityFeed'

type Props = {
	onOpenCalendar: () => void
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
	const hasUnassigned = emptySlots.length > 0

	return (
		<div className="panel assignment-summary">
			<div className="assignment-summary__header">
				<div>
					<div className="assignment-summary__title">이번 주 배정 현황</div>
					<div className="assignment-summary__meta muted">{dateLabel}</div>
				</div>
				<div className="assignment-summary__metrics">
					<div className="assignment-summary__metric">
						<span className="assignment-summary__metric-label">배정 완료</span>
						<span className="assignment-summary__metric-value">{assigned}/{total}</span>
					</div>
					<div className="assignment-summary__metric">
						<span className="assignment-summary__metric-label">경고</span>
						<span className={`assignment-summary__metric-value${warnings.length > 0 ? ' danger' : ''}`}>
							{warnings.length}건
						</span>
					</div>
					<div className="assignment-summary__metric">
						<span className="assignment-summary__metric-label">미배정</span>
						<span className={`assignment-summary__metric-value${hasUnassigned ? ' warning' : ''}`}>
							{emptySlots.length}개
						</span>
					</div>
				</div>
			</div>

			<div className="assignment-summary__progress">
				<div className="assignment-summary__progress-bar">
					<div
						className="assignment-summary__progress-fill"
						style={{ width: `${progressPercent}%` }}
						aria-valuenow={progressPercent}
						aria-valuemin={0}
						aria-valuemax={100}
						role="progressbar"
					/>
				</div>
				<div className="assignment-summary__progress-label muted">
					{progressPercent}% 완료
				</div>
			</div>

			<div className="assignment-summary__actions">
				<button type="button" className="btn" onClick={onOpenCalendar}>
					주차 선택
				</button>
			</div>

			<div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--color-border-subtle)' }}>
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
