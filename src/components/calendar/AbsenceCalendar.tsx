import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import { useState, useMemo } from 'react'
import { isSunday, formatDateISO } from '../../utils/date'
import Modal from '../common/Modal'
import { useAppStore } from '../../state/store'

export default function AbsenceCalendar() {
	const [selectedDate, setSelectedDate] = useState<string>('')
	const [open, setOpen] = useState(false)
	const members = useAppStore((s) => s.app.members)
	const weeks = useAppStore((s) => s.app.weeks)
	const updateAbsences = useAppStore((s) => s.updateAbsences)

	const events = useMemo(() => {
		const entries = Object.entries(weeks).sort(([a], [b]) => a.localeCompare(b))
		const out: { title: string; start: string }[] = []
		for (const [date, week] of entries) {
			week.absences.forEach((a) => out.push({ title: `불참: ${a.name}${a.reason ? `(${a.reason})` : ''}`, start: date }))
		}
		return out
	}, [weeks])

	const [form, setForm] = useState<{ name: string; reason: string }>({ name: '', reason: '' })

	function addAbsence() {
		if (!selectedDate) return
		const wk = weeks[selectedDate] ?? { part1: { SW: '', 자막: '', 고정: '', 사이드: ['', ''], 스케치: '' }, part2: { SW: '', 자막: '', 고정: '', 사이드: ['', ''], 스케치: '' }, absences: [] }
		const next = [...wk.absences, { name: form.name, reason: form.reason || undefined }]
		updateAbsences(selectedDate, next)
		setForm({ name: '', reason: '' })
		setOpen(false)
	}

	function onDateClick(arg: any) {
		const d = new Date(arg.dateStr)
		if (!isSunday(d)) return
		const iso = formatDateISO(d)
		setSelectedDate(iso)
		setOpen(true)
	}

	return (
		<div className="panel" style={{ padding: 12 }}>
			<div className="muted" style={{ marginBottom: 8 }}>일요일만 선택 가능합니다. 선택한 날짜에 불참자를 추가하세요.</div>
			<FullCalendar plugins={[dayGridPlugin, interactionPlugin]} initialView="dayGridMonth" locale="ko" events={events} dateClick={onDateClick as any} />
			<Modal title={`불참자 추가 - ${selectedDate}`} open={open} onClose={() => setOpen(false)} footer={
				<>
					<button className="btn" onClick={() => setOpen(false)}>취소</button>
					<button className="btn primary" onClick={addAbsence}>추가</button>
				</>
			}>
				<div className="col">
					<label>팀원</label>
					<select value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}>
						<option value="">선택</option>
						{members.map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}
					</select>
					<label>이유(선택)</label>
					<input value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} placeholder="예: 시험" />
				</div>
			</Modal>
		</div>
	)
}


