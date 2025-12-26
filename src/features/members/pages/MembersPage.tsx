import { useMemo, useState } from 'react'
import ActivityFeed from '@/shared/components/common/ActivityFeed'
import Modal from '@/shared/components/common/Modal'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Panel } from '@/shared/components/ui/Panel'
import { Textarea } from '@/shared/components/ui/Textarea'
import { useAppStore } from '@/shared/state/store'
import { motion, AnimatePresence } from 'framer-motion'

// ----------------------------------------------------------------------
// Types & Utilities
// ----------------------------------------------------------------------

type Member = {
	name: string
	notes?: string
	active: boolean
}

type MemberWithGen = Member & {
	generation: number | null
	displayName: string
}

function extractGeneration(name: string): { generation: number | null; displayName: string } {
	const match = name.match(/^(\d+)\s+(.+)$/)
	if (match && match[2]) {
		return { generation: Number(match[1]), displayName: match[2] }
	}
	return { generation: null, displayName: name }
}

// ----------------------------------------------------------------------
// Sub-components
// ----------------------------------------------------------------------

function MemberFormModal({
	open,
	initialData,
	existingNames,
	onClose,
	onSave,
}: {
	open: boolean
	initialData?: Member | null
	existingNames: string[]
	onClose: () => void
	onSave: (data: { name: string; notes: string; active: boolean }) => void
}) {
	const isEdit = !!initialData
	const [name, setName] = useState(initialData?.name || '')
	const [notes, setNotes] = useState(initialData?.notes || '')
	const [active, setActive] = useState(initialData?.active ?? true)
	const [error, setError] = useState('')

	// Reset form when opening/closing or data changing
	useMemo(() => {
		if (open) {
			setName(initialData?.name || '')
			setNotes(initialData?.notes || '')
			setActive(initialData?.active ?? true)
			setError('')
		}
	}, [open, initialData])

	const handleSubmit = () => {
		const trimmedName = name.trim()
		const trimmedNotes = notes.trim()

		if (!trimmedName) {
			setError('이름을 입력해주세요.')
			return
		}

		// Check duplicate name only if it's a new member or name changed
		if (!isEdit && existingNames.includes(trimmedName)) {
			setError('이미 등록된 이름입니다.')
			return
		}
		if (isEdit && initialData?.name !== trimmedName && existingNames.includes(trimmedName)) {
			setError('이미 등록된 이름입니다.')
			return
		}

		onSave({ name: trimmedName, notes: trimmedNotes, active })
		onClose()
	}

	return (
		<Modal
			title={isEdit ? '팀원 정보 수정' : '새 팀원 추가'}
			open={open}
			onClose={onClose}
			footer={
				<>
					<Button variant="ghost" onClick={onClose}>취소</Button>
					<Button variant="primary" onClick={handleSubmit}>
						{isEdit ? '저장' : '추가'}
					</Button>
				</>
			}
		>
			<div className="col" style={{ gap: 20 }}>
				<div className="col" style={{ gap: 8 }}>
					<label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
						이름 <span style={{ fontWeight: 400, color: 'var(--color-text-subtle)' }}>(예: 20 홍길동)</span>
					</label>
					<Input
						value={name}
						onChange={(e) => {
							setName(e.target.value)
							setError('')
						}}
						placeholder="기수와 이름을 입력하세요"
						autoFocus
						aria-invalid={!!error}
					/>
					{error && <span style={{ fontSize: '0.8125rem', color: 'var(--color-critical)' }}>{error}</span>}
				</div>

				<div className="col" style={{ gap: 8 }}>
					<label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>메모</label>
					<Textarea
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
						placeholder="특이사항이나 역할을 메모하세요 (선택)"
						style={{ minHeight: 80 }}
					/>
				</div>

				<div className="col" style={{ gap: 8 }}>
					<label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>상태</label>
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: 12,
							padding: 12,
							borderRadius: 'var(--radius-md)',
							border: '1px solid var(--color-border-subtle)',
							background: 'var(--color-surface-2)',
							cursor: 'pointer'
						}}
						onClick={() => setActive(!active)}
					>
						<div
							style={{
								width: 40,
								height: 24,
								borderRadius: 999,
								background: active ? 'var(--color-success)' : 'var(--color-text-subtle)',
								position: 'relative',
								transition: 'background 0.2s',
								flexShrink: 0
							}}
						>
							<div
								style={{
									width: 20,
									height: 20,
									borderRadius: '50%',
									background: 'white',
									position: 'absolute',
									top: 2,
									left: active ? 18 : 2,
									transition: 'left 0.2s',
									boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
								}}
							/>
						</div>
						<div className="col" style={{ gap: 2 }}>
							<span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{active ? '활동 중 (Active)' : '비활동 (Inactive)'}</span>
							<span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
								{active ? '스케줄링 및 통계에 포함됩니다.' : '명단에는 남지만 스케줄링에서 제외됩니다.'}
							</span>
						</div>
					</div>
				</div>
			</div>
		</Modal>
	)
}

function DeleteConfirmModal({
	member,
	onClose,
	onConfirm,
}: {
	member: Member | null
	onClose: () => void
	onConfirm: () => void
}) {
	return (
		<Modal
			title="팀원 삭제"
			open={!!member}
			onClose={onClose}
			footer={
				<>
					<Button variant="ghost" onClick={onClose}>취소</Button>
					<Button variant="critical" onClick={onConfirm}>삭제하기</Button>
				</>
			}
		>
			<div className="col" style={{ gap: 12 }}>
				<div style={{
					padding: 16,
					background: 'var(--color-critical-soft)',
					color: 'var(--color-critical)',
					borderRadius: 'var(--radius-md)',
					display: 'flex',
					alignItems: 'start',
					gap: 12
				}}>
					<span className="material-symbol" style={{ fontSize: 24 }}>warning</span>
					<div className="col" style={{ gap: 4 }}>
						<strong style={{ fontSize: '0.9375rem' }}>정말 삭제하시겠습니까?</strong>
						<span style={{ fontSize: '0.875rem', opacity: 0.9 }}>
							<strong>{member?.name}</strong> 님의 데이터가 영구적으로 삭제됩니다.<br />
							과거 활동 내역은 보존되지만, 이후 통계에서는 제외될 수 있습니다.
						</span>
					</div>
				</div>
			</div>
		</Modal>
	)
}

// ----------------------------------------------------------------------
// Main Page Component
// ----------------------------------------------------------------------

export default function MembersPage() {
	const members = useAppStore((s) => s.app.members)
	const setMembers = useAppStore((s) => s.setMembers)
	const toggleActive = useAppStore((s) => s.toggleMemberActive)

	// Local State
	const [searchTerm, setSearchTerm] = useState('')
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [editingMember, setEditingMember] = useState<Member | null>(null)
	const [deletingMember, setDeletingMember] = useState<Member | null>(null)

	// Derived State
	const membersWithGen = useMemo(() => {
		return members.map((m) => ({ ...m, ...extractGeneration(m.name) }))
	}, [members])

	const filteredMembers = useMemo(() => {
		const lowerQuery = searchTerm.toLowerCase()
		return membersWithGen.filter(m =>
			m.name.toLowerCase().includes(lowerQuery) ||
			m.notes?.toLowerCase().includes(lowerQuery)
		)
	}, [membersWithGen, searchTerm])

	// Actions
	const handleAdd = (data: { name: string; notes: string; active: boolean }) => {
		setMembers([...members, { name: data.name, notes: data.notes || undefined, active: data.active }])
	}

	const handleEdit = (data: { name: string; notes: string; active: boolean }) => {
		if (!editingMember) return
		// If name changed, we need to remove old and add new (or just update)
		// Assuming name is ID, if name changes we should update references, but for now simple update
		// Actually, if name changes, we need to replace the entry
		const updatedMembers = members.map(m =>
			m.name === editingMember.name
				? { ...m, name: data.name, notes: data.notes || undefined, active: data.active }
				: m
		)
		setMembers(updatedMembers)
		setEditingMember(null)
	}

	const handleDelete = () => {
		if (!deletingMember) return
		setMembers(members.filter(m => m.name !== deletingMember.name))
		setDeletingMember(null)
	}

	const openAddModal = () => {
		setEditingMember(null)
		setIsModalOpen(true)
	}

	const openEditModal = (member: Member) => {
		setEditingMember(member)
		setIsModalOpen(true)
	}

	return (
		<div className="app-main__page" id="team-management-content">
			{/* Header Section */}
			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
				<div className="col" style={{ gap: 4 }}>
					<h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>팀원 관리</h1>
					<span className="muted" style={{ fontSize: '0.9375rem' }}>
						전체 {members.length}명의 팀원을 관리합니다.
					</span>
				</div>
				<div className="row" style={{ gap: 12 }}>
					<div style={{ position: 'relative', width: 240 }}>
						<span className="material-symbol" style={{
							position: 'absolute',
							left: 10,
							top: '50%',
							transform: 'translateY(-50%)',
							color: 'var(--color-text-muted)',
							fontSize: 20
						}}>search</span>
						<Input
							placeholder="이름 또는 메모 검색..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							style={{ paddingLeft: 36, width: '100%' }}
						/>
					</div>
					<Button variant="primary" onClick={openAddModal} icon="add">
						팀원 추가
					</Button>
				</div>
			</div>

			{/* Main Content */}
			<div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(300px, 1fr)', gap: 24, alignItems: 'start' }}>
				
				{/* Left Column: Member List Table */}
				<Panel style={{ padding: 0, overflow: 'hidden', minHeight: 400 }}>
					<div style={{ overflowX: 'auto' }}>
						<table className="table" style={{ border: 'none', width: '100%' }}>
							<thead>
								<tr>
									<th style={{ width: 80, paddingLeft: 24 }}>기수</th>
									<th style={{ minWidth: 120 }}>이름</th>
									<th style={{ width: '40%' }}>메모</th>
									<th style={{ width: 100, textAlign: 'center' }}>상태</th>
									<th style={{ width: 100, textAlign: 'right', paddingRight: 24 }}>관리</th>
								</tr>
							</thead>
							<tbody>
								{filteredMembers.length === 0 ? (
									<tr>
										<td colSpan={5} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-muted)' }}>
											검색 결과가 없습니다.
										</td>
									</tr>
								) : (
									filteredMembers.map((member) => (
										<tr key={member.name} style={{ opacity: member.active ? 1 : 0.6, transition: 'opacity 0.2s' }}>
											<td style={{ paddingLeft: 24, fontWeight: 500, color: 'var(--color-text-muted)' }}>
												{member.generation ? `${member.generation}기` : '-'}
											</td>
											<td>
												<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
													<div style={{
														width: 32,
														height: 32,
														borderRadius: '50%',
														background: member.active ? 'var(--color-accent-soft)' : 'var(--color-surface-2)',
														color: member.active ? 'var(--color-accent)' : 'var(--color-text-muted)',
														display: 'flex',
														alignItems: 'center',
														justifyContent: 'center',
														fontWeight: 600,
														fontSize: '0.875rem'
													}}>
														{member.displayName.charAt(0)}
													</div>
													<span style={{ fontWeight: 600 }}>{member.displayName}</span>
												</div>
											</td>
											<td>
												<div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>
													{member.notes || '-'}
												</div>
											</td>
											<td style={{ textAlign: 'center' }}>
												<Badge variant={member.active ? 'success' : 'neutral'}>
													{member.active ? 'Active' : 'Inactive'}
												</Badge>
											</td>
											<td style={{ textAlign: 'right', paddingRight: 24 }}>
												<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
													<Button
														variant="ghost"
														size="sm"
														icon="edit"
														onClick={() => openEditModal(member)}
														title="수정"
														style={{ width: 32, height: 32, padding: 0 }}
													/>
													<Button
														variant="ghost"
														size="sm"
														icon="delete"
														onClick={() => setDeletingMember(member)}
														title="삭제"
														style={{ width: 32, height: 32, padding: 0, color: 'var(--color-critical)' }}
													/>
												</div>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</Panel>

				{/* Right Column: Activity Feed & Summary */}
				<div className="col" style={{ gap: 24 }}>
					<ActivityFeed
						title="변경 내역"
						filter={['member']}
						emptyMessage="최근 변경 사항이 없습니다."
					/>
					
					{/* Summary Card */}
					<Panel style={{ padding: 20 }}>
						<h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 600 }}>현황 요약</h3>
						<div className="row" style={{ gap: 16 }}>
							<div className="col" style={{ flex: 1, padding: 12, background: 'var(--color-surface-2)', borderRadius: 12, alignItems: 'center' }}>
								<span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-accent)' }}>{members.filter(m => m.active).length}</span>
								<span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>활동 중</span>
							</div>
							<div className="col" style={{ flex: 1, padding: 12, background: 'var(--color-surface-2)', borderRadius: 12, alignItems: 'center' }}>
								<span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-text-subtle)' }}>{members.length}</span>
								<span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>전체 인원</span>
							</div>
						</div>
					</Panel>
				</div>
			</div>

			{/* Modals */}
			<MemberFormModal
				open={isModalOpen}
				initialData={editingMember}
				existingNames={members.map(m => m.name)}
				onClose={() => {
					setIsModalOpen(false)
					setEditingMember(null)
				}}
				onSave={editingMember ? handleEdit : handleAdd}
			/>

			<DeleteConfirmModal
				member={deletingMember}
				onClose={() => setDeletingMember(null)}
				onConfirm={handleDelete}
			/>
		</div>
	)
}
