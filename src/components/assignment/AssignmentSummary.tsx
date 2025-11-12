import { useMemo } from 'react'
import { useAppStore } from '../../state/store'
import { analyzeDraft, slotToLabel } from '../../utils/assignment'

type Props = {
	onOpenCalendar: () => void
	onOpenHistory: () => void
	onFocusAbsence: () => void
}

export default function AssignmentSummary({ onOpenCalendar, onOpenHistory, onFocusAbsence }: Props) {
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

	const nextActions = [
		hasUnassigned
			? `미배정 ${emptySlots.length}개 채우기`
			: '모든 역할이 채워졌습니다',
		warnings.length > 0
			? `경고 ${warnings.length}건 검토`
			: '경고 없음',
		'최종 확정 전에 JSON 백업'
	]

	const topEmptySlots = emptySlots.slice(0, 3)

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

			<div className="assignment-summary__body">
				<div className="assignment-summary__section">
					<div className="assignment-summary__section-title">다음 작업</div>
					<ul className="assignment-summary__checklist">
						{nextActions.map((action, idx) => (
							<li key={idx}>{action}</li>
						))}
					</ul>
				</div>
				<div className="assignment-summary__section">
					<div className="assignment-summary__section-title">미배정 상위 목록</div>
					{topEmptySlots.length > 0 ? (
						<ul className="assignment-summary__empties">
							{topEmptySlots.map((slot) => (
								<li key={`${slot.part}-${slot.role}-${slot.index ?? 'single'}`}>
									{slotToLabel(slot)}
								</li>
							))}
							{emptySlots.length > topEmptySlots.length && (
								<li className="muted">외 {emptySlots.length - topEmptySlots.length}건</li>
							)}
						</ul>
					) : (
						<div className="muted">모든 역할이 배정되었습니다.</div>
					)}
				</div>
			</div>

			<div className="assignment-summary__actions">
				<button type="button" className="btn" onClick={onOpenCalendar}>
					주차 달력
				</button>
				<button type="button" className="btn" onClick={onOpenHistory}>
					이력 불러오기
				</button>
				<button type="button" className="btn" onClick={onFocusAbsence}>
					불참자 관리로 이동
				</button>
			</div>
		</div>
	)
}


