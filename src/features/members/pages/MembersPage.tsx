import { useMemo, useState } from 'react'
import ActivityFeed from '@/shared/components/common/ActivityFeed'
import Modal from '@/shared/components/common/Modal'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Panel } from '@/shared/components/ui/Panel'
import { Textarea } from '@/shared/components/ui/Textarea'
import { useAppStore } from '@/shared/state/store'

function extractGeneration(name: string): { generation: number | null; displayName: string } {
	const match = name.match(/^(\d+)\s+(.+)$/)
	if (match && match[2]) {
		return { generation: Number(match[1]), displayName: match[2] }
	}
	return { generation: null, displayName: name }
}

export default function MembersPage() {
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
			<Panel style={{ padding: 24 }}>
				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
					<h3 style={{ margin: 0, fontSize: '1.25rem' }}>팀원 관리</h3>
					<div className="muted" style={{ fontSize: '0.875rem' }}>팀원 정보를 수정하면 아래 활동 로그에 기록됩니다.</div>
				</div>
				<div className="members-layout">
					<div className="col" style={{ flex: 1, minWidth: '300px' }}>
						<div style={{ border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-md)', padding: 16, background: 'var(--color-surface-1)' }}>
							<div className="row" style={{ gap: 12 }}>
								<div className="col" style={{ flex: 1 }}>
									<label style={{ fontSize: '0.875rem', fontWeight: 500 }}>이름 <span style={{ fontSize: '0.85em', color: 'var(--color-text-subtle)' }}>(예: 20 솔빈)</span></label>
									<Input 
										value={name} 
										onChange={(e) => {
											setName(e.target.value)
											if (formError) setFormError('')
										}} 
										placeholder="예: 20 솔빈"
										aria-invalid={!!formError}
									/>
								</div>
								<div className="col" style={{ flex: 1 }}>
									<label style={{ fontSize: '0.875rem', fontWeight: 500 }}>메모</label>
									<Input 
										value={notes} 
										onChange={(e) => setNotes(e.target.value)} 
										placeholder="선택사항"
									/>
								</div>
							</div>
							{formError && (
								<div style={{ marginTop: 8, color: 'var(--color-critical)', fontSize: '0.8125rem' }}>
									{formError}
								</div>
							)}
							<div className="row" style={{ alignItems: 'end', marginTop: 12, gap: 12 }}>
								<div className="col" style={{ flex: 1 }}>
									<label style={{ fontSize: '0.875rem', fontWeight: 500 }}>상태</label>
									<div>
										<Button
											variant={active ? 'primary' : 'secondary'}
											onClick={() => setActive((v) => !v)}
											aria-pressed={active}
											style={{ width: '100%' }}
										>
											{active ? '활성화 상태' : '비활성화 상태'}
										</Button>
									</div>
								</div>
								<div>
									<Button variant="primary" onClick={add} style={{ minWidth: 96 }}>추가</Button>
								</div>
							</div>
						</div>
					</div>
					<div className="col" style={{ flex: 2 }}>
						<div className="panel" style={{ overflow: 'hidden', padding: 0, borderRadius: 'var(--radius-md)' }}>
							<table className="table" style={{ tableLayout: 'fixed', width: '100%', border: 'none', background: 'transparent' }}>
								<colgroup>
									<col style={{ width: '10%' }} />
									<col style={{ width: '35%' }} />
									<col style={{ width: '25%' }} />
									<col style={{ width: '30%' }} />
								</colgroup>
								<thead>
									<tr>
										<th style={{ textAlign: 'left', border: 'none', borderBottom: '1px solid var(--color-border-subtle)' }}>기수</th>
										<th style={{ textAlign: 'left', border: 'none', borderBottom: '1px solid var(--color-border-subtle)' }}>이름</th>
										<th style={{ textAlign: 'center', border: 'none', borderBottom: '1px solid var(--color-border-subtle)' }}>상태</th>
										<th style={{ textAlign: 'center', border: 'none', borderBottom: '1px solid var(--color-border-subtle)' }}>삭제</th>
									</tr>
								</thead>
								<tbody>
									{membersWithGen.map((m) => (
										<tr key={m.name} style={{ opacity: m.active ? 1 : 0.55, borderBottom: '1px solid var(--color-border-subtle)' }}>
											<td style={{ textAlign: 'left', border: 'none' }}>{m.generation ?? '-'}</td>
											<td style={{ textAlign: 'left', border: 'none' }}>
												<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
													<span style={{ fontWeight: 500 }}>{m.displayName}</span>
													{!m.active && <Badge variant="critical">OFF</Badge>}
													<Button
														variant="ghost"
														size="sm"
														icon="edit_note"
														onClick={() => openEditNotes(m.name)}
														title="메모 수정"
														aria-label="메모 수정"
														style={{ padding: 4, height: 28, width: 28 }}
													/>
												</div>
											</td>
											<td style={{ textAlign: 'center', border: 'none' }}>
												<Button
													variant={m.active ? 'primary' : 'secondary'}
													size="sm"
													onClick={() => {
														const nextActive = !m.active
														toggleActive(m.name)
													}}
													aria-pressed={m.active}
												>
													{m.active ? '활성화' : '비활성화'}
												</Button>
											</td>
											<td style={{ textAlign: 'center', border: 'none' }}>
												<Button variant="ghost" size="sm" onClick={() => remove(m.name)} style={{ color: 'var(--color-critical)' }}>삭제</Button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			</Panel>

			<Modal
				title={`메모 수정 - ${editingMember ? membersWithGen.find(m => m.name === editingMember.name)?.displayName : ''}`}
				open={editingMember !== null}
				onClose={() => setEditingMember(null)}
				footer={
					<>
						<Button onClick={() => setEditingMember(null)}>취소</Button>
						<Button variant="primary" onClick={saveNotes}>저장</Button>
					</>
				}
			>
				<div className="col">
					<label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: 4 }}>메모</label>
					<Textarea
						value={editingMember?.notes || ''}
						onChange={(e) => setEditingMember(editingMember ? { ...editingMember, notes: e.target.value } : null)}
						placeholder="메모를 입력하세요"
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
