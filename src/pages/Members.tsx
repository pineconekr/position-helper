import { useState, useMemo } from 'react'
import { useAppStore } from '../state/store'
import Modal from '../components/common/Modal'
import ActivityFeed from '../components/common/ActivityFeed'

function extractGeneration(name: string): { generation: number | null; displayName: string } {
	const match = name.match(/^(\d+)\s+(.+)$/)
	if (match && match[2]) {
		return { generation: Number(match[1]), displayName: match[2] }
	}
	return { generation: null, displayName: name }
}

export default function Members() {
	const members = useAppStore((s) => s.app.members)
	const setMembers = useAppStore((s) => s.setMembers)
	const toggleActive = useAppStore((s) => s.toggleMemberActive)
	const [name, setName] = useState('')
	const [notes, setNotes] = useState('')
	const [active, setActive] = useState<boolean>(true)
	const [editingMember, setEditingMember] = useState<{ name: string; notes: string } | null>(null)
	const [formError, setFormError] = useState('')
	
	const membersWithGen = useMemo(() => {
		return members.map((m) => ({ ...m, ...extractGeneration(m.name) }))
	}, [members])

	function add() {
		const trimmedName = name.trim()
		const trimmedNotes = notes.trim()
		if (!trimmedName) {
			setFormError('이름을 입력해주세요.')
			return
		}
		if (members.some((m) => m.name === trimmedName)) {
			setFormError('이미 등록된 이름입니다.')
			return
		}
		setMembers([...members, { name: trimmedName, notes: trimmedNotes || undefined, active }])
		setName('')
		setNotes('')
		setActive(true)
		setFormError('')
	}
	function remove(n: string) {
		if (typeof window !== 'undefined') {
			const confirmed = window.confirm(`${n} 팀원을 삭제할까요?`)
			if (!confirmed) return
		}
		setMembers(members.filter((m) => m.name !== n))
	}
	
	function openEditNotes(memberName: string) {
		const member = members.find((m) => m.name === memberName)
		setEditingMember({ name: memberName, notes: member?.notes || '' })
	}
	
	function saveNotes() {
		if (!editingMember) return
		setMembers(members.map((m) => 
			m.name === editingMember.name 
				? { ...m, notes: editingMember.notes.trim() || undefined }
				: m
		))
		setEditingMember(null)
	}
	return (
		<div className="col" style={{ gap: 16 }}>
			<div className="panel" style={{ padding: 18 }}>
				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
					<h3 style={{ margin: 0, fontSize: 20 }}>팀원 관리</h3>
					<div className="muted" style={{ fontSize: 13 }}>팀원 정보를 수정하면 아래 활동 로그에 기록됩니다.</div>
				</div>
				<div className="members-layout">
					<div className="col" style={{ flex: 1, minWidth: '300px' }}>
						<div style={{ border: '1px solid var(--color-border-subtle)', borderRadius: 14, padding: 14, background: 'var(--color-surface-1)' }}>
							<div className="row" style={{ gap: 8 }}>
								<div className="col">
									<label>이름 <span style={{ fontSize: '0.85em', color: 'var(--color-text-subtle)' }}>(예: 20 솔빈)</span></label>
									<input 
										value={name} 
										onChange={(e) => {
											setName(e.target.value)
											if (formError) setFormError('')
										}} 
										placeholder="예: 20 솔빈"
										aria-invalid={!!formError}
									/>
								</div>
								<div className="col">
									<label>메모</label>
									<input 
										value={notes} 
										onChange={(e) => setNotes(e.target.value)} 
										placeholder="선택사항"
									/>
								</div>
							</div>
							{formError && (
								<div style={{ marginTop: 6, color: 'var(--color-critical)', fontSize: 13 }}>
									{formError}
								</div>
							)}
							<div className="row" style={{ alignItems: 'end', marginTop: 8, gap: 8 }}>
								<div className="col" style={{ flex: 1 }}>
									<label>상태</label>
									<div>
										<button
											className={`btn${active ? ' primary' : ''}`}
											onClick={() => setActive((v) => !v)}
											aria-pressed={active}
										>
											{active ? '활성화 상태' : '비활성화 상태'}
										</button>
									</div>
								</div>
								<div>
									<button className="btn primary" onClick={add} style={{ minWidth: 96 }}>추가</button>
								</div>
							</div>
						</div>
					</div>
					<div className="col" style={{ flex: 2 }}>
						<table className="table" style={{ tableLayout: 'fixed', width: '100%' }}>
							<colgroup>
								<col style={{ width: '10%' }} />
								<col style={{ width: '35%' }} />
								<col style={{ width: '25%' }} />
								<col style={{ width: '30%' }} />
							</colgroup>
							<thead>
								<tr>
									<th style={{ textAlign: 'left' }}>기수</th>
									<th style={{ textAlign: 'left' }}>이름</th>
									<th style={{ textAlign: 'center' }}>상태</th>
									<th style={{ textAlign: 'center' }}>삭제</th>
								</tr>
							</thead>
							<tbody>
								{membersWithGen.map((m) => (
									<tr key={m.name} style={{ opacity: m.active ? 1 : 0.55 }}>
										<td style={{ textAlign: 'left' }}>{m.generation ?? '-'}</td>
										<td style={{ textAlign: 'left' }}>
											<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
												<span>{m.displayName}</span>
												{!m.active && <span className="badge" style={{ background: 'var(--color-critical)', color: 'var(--color-text-on-strong)' }}>OFF</span>}
												<button
													onClick={() => openEditNotes(m.name)}
													title="메모 수정"
													aria-label="메모 수정"
													style={{
														background: 'none',
														border: 'none',
														cursor: 'pointer',
														padding: 4,
														display: 'grid',
														placeItems: 'center',
														color: 'var(--color-text-subtle)',
														opacity: 0.6
													}}
													onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
													onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6' }}
												>
													<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
														<path d="M3 21h6l12-12a2.828 2.828 0 1 0-4-4L5 17l-2 4z" stroke="currentColor" strokeWidth="1.5" fill="none" />
														<path d="M14 6l4 4" stroke="currentColor" strokeWidth="1.5" />
													</svg>
												</button>
											</div>
										</td>
										<td style={{ textAlign: 'center' }}>
											<button
												className={`btn${m.active ? ' primary' : ''}`}
												onClick={() => {
													const nextActive = !m.active
													toggleActive(m.name)
												}}
												aria-pressed={m.active}
											>
												{m.active ? '활성화' : '비활성화'}
											</button>
										</td>
										<td style={{ textAlign: 'center' }}>
											<button className="btn" onClick={() => remove(m.name)}>삭제</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</div>

			<Modal
				title={`메모 수정 - ${editingMember ? membersWithGen.find(m => m.name === editingMember.name)?.displayName : ''}`}
				open={editingMember !== null}
				onClose={() => setEditingMember(null)}
				footer={
					<>
						<button className="btn" onClick={() => setEditingMember(null)}>취소</button>
						<button className="btn primary" onClick={saveNotes}>저장</button>
					</>
				}
			>
				<div className="col">
					<label>메모</label>
					<textarea
						value={editingMember?.notes || ''}
						onChange={(e) => setEditingMember(editingMember ? { ...editingMember, notes: e.target.value } : null)}
						placeholder="메모를 입력하세요"
						style={{ minHeight: 120, resize: 'vertical', padding: 10, borderRadius: 8, border: '1px solid var(--color-border-subtle)', outline: 'none' }}
					/>
				</div>
			</Modal>

			<ActivityFeed
				title="최근 팀원 변경 내역"
				filter={['member']}
				emptyMessage="팀원 변경 기록이 아직 없습니다."
			/>
		</div>
	)
}


