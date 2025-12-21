import { useRef } from 'react'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Panel } from '@/shared/components/ui/Panel'
import { Textarea } from '@/shared/components/ui/Textarea'
import Modal from '@/shared/components/common/Modal'
import { useAbsenceManager } from '../hooks/useAbsenceManager'

export default function AbsenceWidget() {
	const {
		currentWeekDate,
		members,
		currentAbsences,
		absenceForm,
		setAbsenceForm,
		editingAbsence,
		setEditingAbsence,
		addAbsence,
		removeAbsence,
		openEditAbsence,
		saveAbsenceReason
	} = useAbsenceManager()

	const absenceSectionRef = useRef<HTMLDivElement | null>(null)

	return (
		<>
			<Panel ref={absenceSectionRef} style={{ padding: 16 }}>
				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
					<div style={{ fontWeight: 600 }}>불참자 관리</div>
				</div>
				<div className="col" style={{ gap: 12 }}>
					<div className="col" style={{ gap: 8 }}>
						<label style={{ fontSize: '0.875rem' }}>팀원</label>
						<select
							value={absenceForm.name}
							onChange={(e) => setAbsenceForm((f) => ({ ...f, name: e.target.value }))}
							style={{ padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-subtle)', background: 'var(--color-surface-1)', color: 'var(--color-text-primary)', width: '100%' }}
						>
							<option value="">선택</option>
							{members.map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}
						</select>
					</div>
					<div className="col" style={{ gap: 8 }}>
						<label style={{ fontSize: '0.875rem' }}>이유(선택)</label>
						<Input
							value={absenceForm.reason}
							onChange={(e) => setAbsenceForm((f) => ({ ...f, reason: e.target.value }))}
							placeholder="예: 시험"
						/>
					</div>
					<div style={{ display: 'flex', justifyContent: 'flex-end' }}>
						<Button variant="primary" onClick={addAbsence} disabled={!currentWeekDate || !absenceForm.name} style={{ width: '100%' }}>
							추가/업데이트
						</Button>
					</div>
				</div>
				{currentAbsences.length > 0 && (
					<div style={{ marginTop: 16 }}>
						<div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 8, color: 'var(--color-text-muted)' }}>목록 ({currentAbsences.length})</div>
						<div className="col" style={{ gap: 8 }}>
							{currentAbsences.map((a) => (
								<div key={a.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)' }}>
									<div className="col" style={{ gap: 2 }}>
										<div style={{ fontWeight: 500 }}>{a.name}</div>
										<div className="muted" style={{ fontSize: '0.8125rem' }}>{a.reason || '-'}</div>
									</div>
									<div style={{ display: 'flex', gap: 4 }}>
										<Button
											variant="ghost"
											size="sm"
											icon="edit_note"
											onClick={() => openEditAbsence(a.name)}
											title="수정"
											style={{ padding: 4, width: 28, height: 28 }}
										/>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => removeAbsence(a.name)}
											title="삭제"
											icon="close"
											style={{ padding: 4, width: 28, height: 28, color: 'var(--color-critical)' }}
										/>
									</div>
								</div>
							))}
						</div>
					</div>
				)}
				{!currentWeekDate && <div className="muted" style={{ marginTop: 8, fontSize: '0.875rem' }}>날짜를 먼저 선택하세요.</div>}
			</Panel>

			<Modal
				title={editingAbsence ? `사유 수정 - ${editingAbsence.name}` : '사유 수정'}
				open={editingAbsence !== null}
				onClose={() => setEditingAbsence(null)}
				footer={
					<>
						<Button onClick={() => setEditingAbsence(null)}>취소</Button>
						<Button variant="primary" onClick={saveAbsenceReason}>저장</Button>
					</>
				}
			>
				<div className="col">
					<label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: 4 }}>이유</label>
					<Textarea
						value={editingAbsence?.reason ?? ''}
						onChange={(e) => setEditingAbsence((prev) => prev ? { ...prev, reason: e.target.value } : prev)}
						placeholder="예: 시험, 여행 등"
					/>
				</div>
			</Modal>
		</>
	)
}
