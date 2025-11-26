import { useMemo, useCallback } from 'react'
import { useAppStore } from '../../state/store'
import type { ActivityType, ActivityEntry } from '../../types'
import { motion, AnimatePresence } from 'framer-motion'
import { useMotionConfig } from '../../utils/motion'

type ActivityFeedProps = {
	title?: string
	filter?: ActivityType[]
	maxItems?: number
	emptyMessage?: string
}

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

// 스타일과 아이콘을 동적으로 결정하는 헬퍼 함수
function getEntryStyle(entry: ActivityEntry) {
	let icon = typeIcons[entry.type]
	let styleClass = `activity-feed__icon-wrapper--${entry.type}`
	let label = typeLabels[entry.type]

	// 배정 해제/변경 확인
	if (entry.type === 'assignment') {
		const before = entry.meta?.before as string | undefined
		const after = entry.meta?.after as string | undefined
		
		// after가 비어있으면 해제
		if (before && !after) {
			icon = 'person_remove'
			styleClass = 'activity-feed__icon-wrapper--assignment-remove'
			label = '해제'
		}
		// before가 있고 after도 있으면 변경
		else if (before && after && before !== after) {
			icon = 'sync_alt'
			label = '변경'
		}
	}
	
	// 불참 제거 확인
	if (entry.type === 'absence') {
		const action = entry.meta?.action as string | undefined
		if (action === 'remove') {
			icon = 'event_available'
			styleClass = 'activity-feed__icon-wrapper--absence-remove'
			label = '제거'
		} else if (action === 'update') {
			icon = 'edit_calendar'
			label = '변경'
		}
	}
	
	// 팀원 삭제/비활성화 확인
	if (entry.type === 'member') {
		const action = entry.meta?.action as string | undefined
		if (action === 'remove') {
			icon = 'person_off'
			styleClass = 'activity-feed__icon-wrapper--member-remove'
			label = '삭제'
		} else if (action === 'toggle-active') {
			const active = entry.meta?.active as boolean | undefined
			if (active === false) {
				icon = 'visibility_off'
				label = '비활성'
			} else {
				icon = 'visibility'
				label = '활성'
			}
		}
	}

	return { icon, styleClass, label }
}

function formatTime(timestamp: string): string {
	try {
		const date = new Date(timestamp)
		// 오늘 날짜인지 확인
		const now = new Date()
		const isToday = date.getDate() === now.getDate() && 
						date.getMonth() === now.getMonth() && 
						date.getFullYear() === now.getFullYear()
		
		if (isToday) {
			return date.toLocaleString('ko-KR', {
				hour: '2-digit',
				minute: '2-digit'
			})
		}
		
		return date.toLocaleString('ko-KR', {
			month: 'numeric',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		})
	} catch {
		return timestamp
	}
}

export default function ActivityFeed({
	title = '최근 활동',
	filter,
	maxItems = 16,
	emptyMessage = '최근 활동이 없습니다.'
}: ActivityFeedProps) {
	const activityLog = useAppStore((s) => s.activityLog)
	const removeActivity = useAppStore((s) => s.removeActivity)
	const { duration, ease, shouldReduce } = useMotionConfig()

	const handleRemove = useCallback(
		(id: string) => {
			removeActivity(id)
		},
		[removeActivity]
	)

	const displayEntries = useMemo(() => {
		const base = filter && filter.length > 0
			? activityLog.filter((entry) => filter.includes(entry.type))
			: activityLog
		return base.slice(0, maxItems)
	}, [activityLog, filter, maxItems])

	if (displayEntries.length === 0) {
		return (
			<div className="panel activity-feed">
				<div className="activity-feed__header">
					<div className="activity-feed__title">{title}</div>
				</div>
				<div className="activity-feed__empty muted">{emptyMessage}</div>
			</div>
		)
	}

	return (
		<div className="panel activity-feed">
			<div className="activity-feed__header">
				<div className="activity-feed__title">{title}</div>
			</div>
			<ul className="activity-feed__list">
				<AnimatePresence initial={false} mode="popLayout">
					{displayEntries.map((entry) => {
						const { icon, styleClass, label } = getEntryStyle(entry)
						return (
							<motion.li
								key={entry.id}
								layout
								initial={shouldReduce ? { opacity: 0, scale: 1 } : { opacity: 0, scale: 0.95, y: -8 }}
								animate={{ opacity: 1, scale: 1, y: 0 }}
								exit={shouldReduce ? { opacity: 0 } : { opacity: 0, scale: 0.95, transition: { duration: duration.fast } }}
								transition={{ duration: duration.normal, ease: ease.out }}
								className="activity-feed__item"
							>
								<div className={`activity-feed__icon-wrapper ${styleClass}`}>
									<span className="material-symbol">{icon}</span>
								</div>
								<div className="activity-feed__content">
									<div className="activity-feed__content-header">
										<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
											<span className="activity-feed__type-label">
												{label}
											</span>
											<time className="activity-feed__time" dateTime={entry.timestamp}>
												{formatTime(entry.timestamp)}
											</time>
										</div>
										<button
											type="button"
											className="activity-feed__remove"
											onClick={() => handleRemove(entry.id)}
											aria-label="삭제"
											title="삭제"
										>
											<span className="material-symbol">close</span>
										</button>
									</div>
									<div className="activity-feed__item-title">{entry.title}</div>
									{entry.description && (
										<div className="activity-feed__description">{entry.description}</div>
									)}
								</div>
							</motion.li>
						)
					})}
				</AnimatePresence>
			</ul>
		</div>
	)
}


