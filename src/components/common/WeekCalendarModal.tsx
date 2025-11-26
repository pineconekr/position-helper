import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import { useMemo, useState } from 'react'
import { useAppStore } from '../../state/store'
import { formatDateISO, isSunday } from '../../utils/date'
import Modal from './Modal'

const calendarStyles = String.raw`
	.week-calendar-shell {
		width: 100%;
		min-height: 520px;
		padding: 16px;
		border-radius: 20px;
		border: 1px solid var(--color-border-subtle);
		background: var(--color-surface-1);
		box-shadow: var(--shadow-surface);
		user-select: none;
	}
	.week-calendar-shell:focus {
		outline: none;
	}

	.fc {
		--fc-border-color: var(--color-border-subtle);
		--fc-today-bg-color: transparent;
		--fc-neutral-bg-color: transparent;
		--fc-page-bg-color: transparent;
		font-family: inherit;
		height: 100%;
		user-select: none;
		caret-color: transparent;
	}
	.fc * {
		caret-color: transparent;
	}

	.fc-header-toolbar {
		margin-bottom: 12px !important;
	}
	.fc-toolbar-title {
		font-size: 16px !important;
		font-weight: 600;
		color: var(--color-text-primary);
	}
	.fc-button {
		background: var(--color-surface-2) !important;
		border: 1px solid var(--color-border-subtle) !important;
		color: var(--color-text-primary) !important;
		font-weight: 500;
		padding: 6px 12px !important;
		box-shadow: none !important;
		opacity: 1 !important;
		transition: background-color var(--motion-duration-fast) var(--motion-ease-default), color var(--motion-duration-fast) var(--motion-ease-default), border-color var(--motion-duration-fast) var(--motion-ease-default) !important;
	}
	.fc-button:hover {
		background: var(--color-surface-1) !important;
	}
	.fc-button-active,
	.fc-button:active {
		background: var(--color-accent-soft) !important;
		border-color: var(--color-accent) !important;
		color: var(--color-accent) !important;
	}

	.fc-col-header-cell {
		padding: 8px 0;
		background: var(--layer-translucent-1);
	}
	.fc-col-header-cell-cushion {
		color: var(--color-text-muted);
		font-weight: 500;
		font-size: 13px;
		text-decoration: none !important;
	}
	.fc-day-sun .fc-col-header-cell-cushion {
		color: var(--color-critical);
	}

	.fc-daygrid-day-frame {
		padding: 6px;
		min-height: 90px;
	}
	.fc-daygrid-day-top {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: flex-start;
		gap: 4px;
		margin-bottom: 4px;
	}
	.fc-daygrid-day-number {
		font-size: 14px;
		color: var(--color-text-primary);
		text-decoration: none !important;
		width: auto;
		height: auto;
		display: inline-flex;
		align-items: center;
		justify-content: flex-start;
		border-radius: 0;
		padding: 0;
		transition: color 0.2s ease;
	}
	.fc-day-sun .fc-daygrid-day-number {
		color: var(--color-critical);
		font-weight: 600;
	}
	/* 요일 표시 숨김 (한국어 로케일에서는 보통 표시되지 않지만 확실히) */
	.fc-daygrid-day-weekday {
		display: none !important;
	}

	.fc-daygrid-day:not(.fc-day-disabled) {
		cursor: pointer;
		transition: background-color 0.2s ease, transform 0.2s ease;
	}
	.fc-daygrid-day:not(.fc-day-disabled):hover {
		background-color: var(--layer-translucent-2) !important;
		transform: scale(0.98);
		border-radius: 8px;
		z-index: 1;
	}
	.fc-day-sun:not(.fc-day-disabled):hover .fc-daygrid-day-number {
		background-color: var(--color-critical-soft);
	}

	.fc-day-today {
		background: transparent !important;
	}

	.fc-daygrid-day:not(.fc-day-sun):not(.fc-day-disabled) {
		opacity: 0.5;
		cursor: default;
	}
	/* 일요일이 아닌 날짜도 호버 효과는 주되 커서는 기본 */
	.fc-daygrid-day:not(.fc-day-sun):not(.fc-day-disabled):hover {
		cursor: default;
		transform: none;
		background-color: var(--layer-translucent-1) !important;
	}

	.fc-daygrid-event,
	.fc-h-event {
		margin: 2px 2px !important;
		padding: 0 !important;
		background: transparent !important;
		border: none !important;
	}

	@media (max-width: 640px) {
		.week-calendar-shell {
			min-height: 420px;
			padding: 10px;
		}
		.fc-daygrid-day-frame {
			min-height: 74px;
		}
		.fc-toolbar-title {
			font-size: 14px !important;
		}
	}
`

type Props = {
	open: boolean
	onClose: () => void
	mode?: 'select' | 'load'
	onDateSelect: (date: string) => void
}

export default function WeekCalendarModal({ open, onClose, mode: initialMode = 'select', onDateSelect }: Props) {
	const app = useAppStore((s) => s.app)
	const setWeekDate = useAppStore((s) => s.setWeekDate)
	const loadWeekToDraft = useAppStore((s) => s.loadWeekToDraft)
	const [mode, setMode] = useState<'select' | 'load'>(initialMode)

	const calendarEvents = useMemo(() => {
		const entries = Object.entries(app.weeks).sort(([a], [b]) => a.localeCompare(b))
		// 타입 정의: absence는 이제 리스트를 가짐
		const out: Array<{ 
			title: string; 
			start: string; 
			type: 'history' | 'absence'; 
			absences?: string[] 
		}> = []

		Object.keys(app.weeks).forEach((d) => {
			out.push({ title: '', start: d, type: 'history' })
		})

		for (const [date, week] of entries) {
			if (week.absences.length > 0) {
				const names = week.absences.map((a) => a.name.replace(/^\d+\s*/, '').trim())
				out.push({ 
					title: `불참 ${names.length}`, 
					start: date, 
					type: 'absence', 
					absences: names 
				})
			}
		}

		return out
	}, [app.weeks])

	const title = '주차 선택 (일요일만 가능)'
	const description = mode === 'load'
		? '배정 이력이 있는 일요일 날짜를 선택하면 저장된 배정을 불러옵니다.'
		: '날짜를 클릭하면 해당 주차로 변경됩니다. 이력이 있으면 자동으로 불러옵니다.'

	function handleDateClick(arg: any) {
		const d = new Date(arg.dateStr)
		if (!isSunday(d)) return
		const iso = formatDateISO(d)

		if (mode === 'load') {
			if (!(iso in app.weeks)) return
			loadWeekToDraft(iso)
		} else {
			setWeekDate(iso)
			loadWeekToDraft(iso)
		}

		onDateSelect(iso)
		onClose()
	}

	function handleEventClick(arg: any) {
		const d = new Date(arg.event.start)
		if (!isSunday(d)) return
		const iso = formatDateISO(d)

		if (mode === 'load') {
			if (!(iso in app.weeks)) return
			loadWeekToDraft(iso)
		} else {
			setWeekDate(iso)
			loadWeekToDraft(iso)
		}

		onDateSelect(iso)
		onClose()
	}

	function renderEventContent(eventInfo: any) {
		const eventType = eventInfo.event.extendedProps?.type
		
		// 이력: 간결한 점으로 표시
		if (eventType === 'history') {
			return (
				<div
					title="배정 이력 있음"
					style={{
						display: 'flex',
						justifyContent: 'center',
						marginTop: 2
					}}
				>
					<div 
						style={{
							width: 6,
							height: 6,
							borderRadius: '50%',
							background: 'var(--color-accent)',
							opacity: 0.8
						}}
					/>
				</div>
			)
		}

		// 불참: 축약 표시 + 호버 시 전체 목록
		if (eventType === 'absence') {
			const names = eventInfo.event.extendedProps?.absences || []
			const count = names.length
			if (count === 0) return null

			// 2명까지는 이름 표시, 그 이상은 "A, B 외 N명"
			let label = ''
			if (count <= 2) {
				label = names.join(', ')
			} else {
				label = `${names[0]}, ${names[1]} 외 ${count - 2}명`
			}

			return (
				<div
					title={`불참자: ${names.join(', ')}`}
					style={{
						fontSize: 11,
						color: 'var(--color-text-subtle)', // 강조 수준 낮춤
						background: 'var(--layer-translucent-1)',
						padding: '2px 6px',
						borderRadius: 4,
						marginTop: 2,
						whiteSpace: 'nowrap',
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						textAlign: 'center'
					}}
				>
					{label}
				</div>
			)
		}

		return <div>{eventInfo.event.title}</div>
	}

	return (
		<Modal
			title={title}
			open={open}
			onClose={onClose}
			footer={<button className="btn" onClick={onClose}>닫기</button>}
		>
			<div className="col" style={{ overflowX: 'hidden' }}>
				<div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap', minWidth: 0 }}>
					<div className="muted" style={{ flex: 1, minWidth: 220 }}>{description}</div>
					<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', minWidth: 0 }}>
						<button
							className={mode === 'select' ? 'btn primary' : 'btn'}
							onClick={() => setMode('select')}
							style={{ fontSize: 13, padding: '6px 12px', flexShrink: 0 }}
						>
							주차 선택
						</button>
						<button
							className={mode === 'load' ? 'btn primary' : 'btn'}
							onClick={() => setMode('load')}
							style={{ fontSize: 13, padding: '6px 12px', flexShrink: 0 }}
						>
							이력 불러오기
						</button>
					</div>
				</div>
				<style dangerouslySetInnerHTML={{ __html: calendarStyles }} />
				<div className="week-calendar-shell" tabIndex={-1}>
					<FullCalendar
						plugins={[dayGridPlugin, interactionPlugin]}
						initialView="dayGridMonth"
						locale="ko"
						height="auto"
						headerToolbar={{
							left: 'prev',
							center: 'title',
							right: 'next'
						}}
						events={calendarEvents}
						dateClick={handleDateClick}
						eventClick={handleEventClick}
						eventContent={renderEventContent}
						fixedWeekCount={false}
						showNonCurrentDates={false}
					/>
				</div>
			</div>
		</Modal>
	)
}
