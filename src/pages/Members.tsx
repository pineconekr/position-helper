import { useState, useMemo } from 'react'
import { useAppStore } from '../state/store'
import Modal from '../components/common/Modal'

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
	
	const membersWithGen = useMemo(() => {
		return members.map((m) => ({ ...m, ...extractGeneration(m.name) }))
	}, [members])

	function add() {
		if (!name.trim()) return
		if (members.some((m) => m.name === name.trim())) return
		setMembers([...members, { name: name.trim(), notes: notes.trim() || undefined, active }])
		setName(''); setNotes(''); setActive(true)
	}
	function remove(n: string) {
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
		<div className="panel" style={{ padding: 12 }}>
			<h3 style={{ marginTop: 0 }}>팀원 관리</h3>
			<div className="row">
				<div className="col" style={{ flex: 1 }}>
					<div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 12, background: 'var(--panel)' }}>
						<div className="row" style={{ gap: 8 }}>
							<div className="col">
								<label>이름 <span style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>(예: 20 솔빈)</span></label>
								<input 
									value={name} 
									onChange={(e) => setName(e.target.value)} 
									placeholder="예: 20 솔빈"
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
						<div className="row" style={{ alignItems: 'end', marginTop: 8, gap: 8 }}>
							<div className="col" style={{ flex: 1 }}>
								<label>상태</label>
								<div>
									<button className="btn" onClick={() => setActive((v) => !v)}>{active ? '활성 ON' : '비활성 OFF'}</button>
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
											{!m.active && <span className="badge" style={{ background: 'var(--danger)', color: '#fff' }}>OFF</span>}
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
													color: 'var(--text-secondary)',
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
										<button className="btn" onClick={() => toggleActive(m.name)}>{m.active ? '활성 ON' : '비활성 OFF'}</button>
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
						style={{ minHeight: 120, resize: 'vertical', padding: 10, borderRadius: 8, border: '1px solid var(--border)', outline: 'none' }}
					/>
				</div>
			</Modal>
		</div>
	)
}


