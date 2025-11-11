import { useMemo } from 'react'
import { useAppStore } from '../../state/store'
import type { ActivityType } from '../../types'

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

function formatTime(timestamp: string): string {
	try {
		const date = new Date(timestamp)
		return date.toLocaleString('ko-KR', {
			month: '2-digit',
			day: '2-digit',
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
				{displayEntries.map((entry) => (
					<li key={entry.id} className="activity-feed__item">
						<div className="activity-feed__meta">
							<span className={`activity-feed__badge activity-feed__badge--${entry.type}`}>
								{typeLabels[entry.type]}
							</span>
							<time className="activity-feed__time" dateTime={entry.timestamp}>
								{formatTime(entry.timestamp)}
							</time>
						</div>
						<div className="activity-feed__item-title">{entry.title}</div>
						{entry.description && (
							<div className="activity-feed__description">{entry.description}</div>
						)}
					</li>
				))}
			</ul>
		</div>
	)
}


