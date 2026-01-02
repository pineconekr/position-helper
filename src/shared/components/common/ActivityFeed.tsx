import { AnimatePresence, m, LazyMotion, domAnimation } from 'framer-motion'
import { useCallback, useMemo, useState } from 'react'
import { Button } from '@/shared/components/ui/Button'
import Icon from '@/shared/components/ui/Icon'
import { useAppStore } from '@/shared/state/store'
import type { ActivityEntry, ActivityType } from '@/shared/types'
import { useShouldReduceMotion } from '@/shared/utils/motion'
import Modal from './Modal'

type StatusTone = 'success' | 'warning' | 'info' | 'neutral'

type ActivityFeedProps = {
	title?: string
	filter?: ActivityType[]
	maxItems?: number
	emptyMessage?: string
	collapsible?: boolean
	defaultCollapsed?: boolean
}

function StatusDot({ tone }: { tone: StatusTone }) {
	return <span className="status-dot" data-tone={tone} aria-hidden="true" />
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
	let tone: StatusTone = 'info'

	// 배정 해제/변경 확인
	if (entry.type === 'assignment') {
		const before = entry.meta?.before as string | undefined
		const after = entry.meta?.after as string | undefined

		// after가 비어있으면 해제
		if (before && !after) {
			icon = 'person_remove'
			styleClass = 'activity-feed__icon-wrapper--assignment-remove'
			label = '해제'
			tone = 'warning'
		}
		// before가 있고 after도 있으면 변경
		else if (before && after && before !== after) {
			icon = 'sync_alt'
			label = '변경'
			tone = 'info'
		} else {
			tone = 'info'
		}
	}

	// 불참 제거 확인
	if (entry.type === 'absence') {
		const action = entry.meta?.action as string | undefined
		if (action === 'remove') {
			icon = 'event_available'
			styleClass = 'activity-feed__icon-wrapper--absence-remove'
			label = '제거'
			tone = 'info'
		} else if (action === 'update') {
			icon = 'edit_calendar'
			label = '변경'
			tone = 'info'
		} else {
			tone = 'warning'
		}
	}

	// 팀원 삭제/비활성화 확인
	if (entry.type === 'member') {
		const action = entry.meta?.action as string | undefined
		if (action === 'remove') {
			icon = 'person_off'
			styleClass = 'activity-feed__icon-wrapper--member-remove'
			label = '삭제'
			tone = 'warning'
		} else if (action === 'toggle-active') {
			const active = entry.meta?.active as boolean | undefined
			if (active === false) {
				icon = 'visibility_off'
				label = '비활성'
				tone = 'info'
			} else {
				icon = 'visibility'
				label = '활성'
				tone = 'info'
			}
		}
	}

	if (entry.type === 'finalize') {
		tone = 'success'
	}

	if (entry.type === 'system') {
		tone = 'neutral'
	}

	return { icon, styleClass, label, tone }
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
	emptyMessage = '최근 활동이 없습니다.',
	collapsible = true,
	defaultCollapsed = true
}: ActivityFeedProps) {
	const activityLog = useAppStore((s) => s.activityLog)
	const removeActivity = useAppStore((s) => s.removeActivity)
	const shouldReduce = useShouldReduceMotion()
	const [collapsed, setCollapsed] = useState(collapsible && defaultCollapsed)
	const [showModal, setShowModal] = useState(false)

	const handleRemove = useCallback(
		(id: string) => {
			removeActivity(id)
		},
		[removeActivity]
	)

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
			<div className="panel activity-feed" style={{ padding: 12 }}>
				<div className="activity-feed__header" style={{ marginBottom: 0 }}>
					<div className="activity-feed__title" style={{ fontSize: 15 }}>{title}</div>
					<span className="muted" style={{ fontSize: 13 }}>{emptyMessage}</span>
				</div>
			</div>
		)
	}

	return (
		<>
			<div className="panel activity-feed" style={{ padding: 12 }}>
				<div
					className="activity-feed__header"
					style={{
						marginBottom: collapsed ? 0 : 12,
						cursor: collapsible ? 'pointer' : 'default',
						userSelect: 'none'
					}}
					onClick={() => collapsible && setCollapsed(!collapsed)}
				>
					<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
						<div className="activity-feed__title" style={{ fontSize: 15 }}>{title}</div>
						{collapsed && newCount > 0 && (
							<span className="badge" style={{ fontSize: 11, padding: '2px 6px', background: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}>
								{newCount}개의 추가 활동
							</span>
						)}
					</div>
					{collapsible && (
						<Icon
							name="expand_more"
							size={20}
							className="muted"
							style={{
								transition: 'transform 0.2s',
								transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)'
							}}
						/>
					)}
				</div>

				{/* 애니메이션 비활성화 시 정적 렌더링 */}
				{shouldReduce ? (
					!collapsed && (
						<div style={{ overflow: 'hidden' }}>
							<ul className="activity-feed__list" style={{ gap: 8 }}>
								{displayEntries.map((entry) => {
									const { icon, styleClass, label, tone } = getEntryStyle(entry)
									return (
										<li
											key={entry.id}
											className="activity-feed__item"
											style={{ padding: '8px 12px', alignItems: 'center', fontSize: 13 }}
										>
											<div
												className={`activity-feed__icon-wrapper ${styleClass}`}
												data-tone={tone}
												style={{ width: 28, height: 28, fontSize: 16, borderRadius: 8 }}
											>
												<Icon name={icon} size={16} />
											</div>
											<div className="activity-feed__content" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
												<StatusDot tone={tone} />
												<span style={{ fontWeight: 600 }}>{label}</span>
												<span className="muted" style={{ fontSize: 12 }}>|</span>
												<span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
													{entry.description || entry.title}
												</span>
												<time className="muted" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
													{formatTime(entry.timestamp)}
												</time>
											</div>
										</li>
									)
								})}
							</ul>
							<div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
								<Button
									size="sm"
									variant="ghost"
									onClick={(e) => {
										e.stopPropagation()
										setShowModal(true)
									}}
									style={{ fontSize: 13 }}
								>
									전체 기록 보기
								</Button>
							</div>
						</div>
					)
				) : (
					<LazyMotion features={domAnimation} strict>
						<AnimatePresence initial={false} mode="wait">
							{!collapsed && (
								<m.div
									key="activity-content"
									initial={{ height: 0, opacity: 0 }}
									animate={{ height: 'auto', opacity: 1 }}
									exit={{ height: 0, opacity: 0 }}
									transition={{ type: 'spring', stiffness: 400, damping: 35 }}
									style={{ overflow: 'hidden' }}
								>
									<ul className="activity-feed__list" style={{ gap: 8 }}>
										{displayEntries.map((entry) => {
											const { icon, styleClass, label, tone } = getEntryStyle(entry)
											return (
												<m.li
													key={entry.id}
													layout
													className="activity-feed__item"
													style={{ padding: '8px 12px', alignItems: 'center', fontSize: 13 }}
												>
													<div
														className={`activity-feed__icon-wrapper ${styleClass}`}
														data-tone={tone}
														style={{ width: 28, height: 28, fontSize: 16, borderRadius: 8 }}
													>
														<Icon name={icon} size={16} />
													</div>
													<div className="activity-feed__content" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
														<StatusDot tone={tone} />
														<span style={{ fontWeight: 600 }}>{label}</span>
														<span className="muted" style={{ fontSize: 12 }}>|</span>
														<span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
															{entry.description || entry.title}
														</span>
														<time className="muted" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
															{formatTime(entry.timestamp)}
														</time>
													</div>
												</m.li>
											)
										})}
									</ul>
									<div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
										<Button
											size="sm"
											variant="ghost"
											onClick={(e) => {
												e.stopPropagation()
												setShowModal(true)
											}}
											style={{ fontSize: 13 }}
										>
											전체 기록 보기
										</Button>
									</div>
								</m.div>
							)}
						</AnimatePresence>
					</LazyMotion>
				)}
			</div>

			<Modal
				title="활동 기록 전체"
				open={showModal}
				onClose={() => setShowModal(false)}
			>
				<ul className="activity-feed__list">
					{filteredEntries.map((entry) => {
						const { icon, styleClass, label, tone } = getEntryStyle(entry)
						return (
							<li key={entry.id} className="activity-feed__item">
								<div className={`activity-feed__icon-wrapper ${styleClass}`} data-tone={tone}>
									<Icon name={icon} size={18} />
								</div>
								<div className="activity-feed__content">
									<div className="activity-feed__content-header">
										<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
											<StatusDot tone={tone} />
											<span className="activity-feed__type-label">{label}</span>
											<time className="activity-feed__time">{formatTime(entry.timestamp)}</time>
										</div>
										<button
											type="button"
											className="activity-feed__remove"
											onClick={() => handleRemove(entry.id)}
											title="삭제"
										>
											<Icon name="close" size={16} />
										</button>
									</div>
									<div className="activity-feed__item-title">{entry.title}</div>
									{entry.description && (
										<div className="activity-feed__description">{entry.description}</div>
									)}
								</div>
							</li>
						)
					})}
				</ul>
				{filteredEntries.length === 0 && (
					<div className="muted" style={{ textAlign: 'center', padding: 40 }}>
						기록이 없습니다.
					</div>
				)}
			</Modal>
		</>
	)
}