'use client'

import { useMemo, useState } from 'react'
import ActivityFeed from '@/shared/components/common/ActivityFeed'
import Modal from '@/shared/components/common/Modal'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Panel } from '@/shared/components/ui/Panel'
import { Textarea } from '@/shared/components/ui/Textarea'
import Icon from '@/shared/components/ui/Icon'
import { useAppStore } from '@/shared/state/store'

import { MembersEntry } from '@/shared/types'
import { stripCohort, extractCohort } from '@/shared/utils/assignment'
import clsx from 'clsx'

type MemberWithGen = MembersEntry & {
	generation: number | null
	displayName: string
}

function MemberFormModal({
	open,
	initialData,
	existingNames,
	onClose,
	onSave,
}: {
	open: boolean
	initialData?: MembersEntry | null
	existingNames: string[]
	onClose: () => void
	onSave: (data: { name: string; notes: string; active: boolean }) => void
}) {
	const isEdit = !!initialData
	const [name, setName] = useState(initialData?.name || '')
	const [notes, setNotes] = useState(initialData?.notes || '')
	const [active, setActive] = useState(initialData?.active ?? true)
	const [error, setError] = useState('')

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
			size="md"
			footer={
				<>
					<Button variant="ghost" onClick={onClose}>취소</Button>
					<Button variant="solid" onClick={handleSubmit}>
						{isEdit ? '저장' : '추가'}
					</Button>
				</>
			}
		>
			<div className="space-y-4">
				<Input
					label="이름 (예: 20 홍길동)"
					value={name}
					onChange={(e) => {
						setName(e.target.value)
						setError('')
					}}
					placeholder="기수와 이름을 입력하세요"
					autoFocus
					error={!!error}
					helperText={error}
				/>

				<div className="space-y-1">
					<Textarea
						label="메모"
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
						placeholder="특이사항이나 역할을 메모하세요 (선택)"
						className="min-h-[80px]"
					/>
				</div>

				<div className="space-y-2">
					<label className="text-sm font-medium text-[var(--color-label-secondary)] ml-0.5">상태</label>
					<button
						type="button"
						onClick={() => setActive(!active)}
						className={clsx(
							"w-full flex items-center gap-3 p-3 rounded-[var(--radius-md)]",
							"border transition-colors text-left",
							"bg-[var(--color-surface)] border-[var(--color-border-subtle)] hover:border-[var(--color-border-default)]"
						)}
					>
						<div className={clsx(
							"w-9 h-5 rounded-full relative transition-colors shrink-0",
							active ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-label-tertiary)]'
						)}>
							<div className={clsx(
								"w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all shadow-sm",
								active ? 'left-[18px]' : 'left-[2px]'
							)} />
						</div>
						<div>
							<div className="text-base font-medium text-[var(--color-label-primary)]">
								{active ? '활동 중' : '비활동'}
							</div>
							<div className="text-xs text-[var(--color-label-tertiary)]">
								{active ? '스케줄링 포함' : '명단 유지, 스케줄링 제외'}
							</div>
						</div>
					</button>
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
	member: MembersEntry | null
	onClose: () => void
	onConfirm: () => void
}) {
	return (
		<Modal
			title="팀원 삭제"
			open={!!member}
			onClose={onClose}
			size="sm"
			footer={
				<>
					<Button variant="ghost" onClick={onClose}>취소</Button>
					<Button variant="danger" onClick={onConfirm}>삭제하기</Button>
				</>
			}
		>
			<div className="p-4 bg-[var(--color-danger)]/5 rounded-[var(--radius-md)] border border-[var(--color-danger)]/10">
				<div className="flex gap-3">
					<Icon name="warning" size={20} className="text-[var(--color-danger)] shrink-0 mt-0.5" />
					<div>
						<p className="font-medium text-base text-[var(--color-danger)]">정말 삭제하시겠습니까?</p>
						<p className="text-sm text-[var(--color-label-secondary)] mt-1">
							<strong>{member?.name}</strong>님의 데이터가 영구적으로 삭제됩니다.
						</p>
					</div>
				</div>
			</div>
		</Modal>
	)
}

export default function MembersPage() {
	const members = useAppStore((s) => s.app.members)
	const setMembers = useAppStore((s) => s.setMembers)

	const [searchTerm, setSearchTerm] = useState('')
	const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [editingMember, setEditingMember] = useState<MembersEntry | null>(null)
	const [deletingMember, setDeletingMember] = useState<MembersEntry | null>(null)

	const membersWithGen = useMemo(() => {
		return members.map((m) => ({
			...m,
			generation: extractCohort(m.name),
			displayName: stripCohort(m.name)
		}))
	}, [members])

	const filteredMembers = useMemo(() => {
		const lowerQuery = searchTerm.toLowerCase()
		return membersWithGen.filter(m => {
			const matchesSearch = m.name.toLowerCase().includes(lowerQuery) ||
				m.notes?.toLowerCase().includes(lowerQuery)
			const matchesFilter = filter === 'all'
				? true
				: filter === 'active' ? m.active : !m.active
			return matchesSearch && matchesFilter
		})
	}, [membersWithGen, searchTerm, filter])

	// 기수별 인원 통계
	const generationStats = useMemo(() => {
		const stats = new Map<number, number>()
		let unknown = 0
		membersWithGen.forEach(m => {
			if (m.active) {
				if (m.generation) {
					stats.set(m.generation, (stats.get(m.generation) || 0) + 1)
				} else {
					unknown++
				}
			}
		})
		const sorted = Array.from(stats.entries()).sort((a, b) => b[0] - a[0]) // 최신 기수 순
		return { sorted, unknown }
	}, [membersWithGen])

	const handleAdd = (data: { name: string; notes: string; active: boolean }) => {
		setMembers([...members, { name: data.name, notes: data.notes || undefined, active: data.active }])
	}

	const handleEdit = (data: { name: string; notes: string; active: boolean }) => {
		if (!editingMember) return
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

	const openEditModal = (member: MembersEntry) => {
		setEditingMember(member)
		setIsModalOpen(true)
	}

	const activeCount = members.filter(m => m.active).length

	return (
		<div className="space-y-6">
			{/* Page Header */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h1 className="text-xl font-bold tracking-tight text-[var(--color-label-primary)]">팀원 관리</h1>
					<p className="mt-1 text-sm text-[var(--color-label-secondary)]">
						전체 {members.length}명 관리 중
					</p>
				</div>
				<Button variant="solid" onClick={openAddModal} icon="add" className="w-full sm:w-auto">
					팀원 추가
				</Button>
			</div>

			{/* Main Content Grid */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Left: Member List */}
				<div className="lg:col-span-2 space-y-4">
					{/* Filters & Search */}
					<div className="flex flex-col sm:flex-row gap-3 justify-between p-1">
						<div className="flex p-0.5 bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] rounded-[var(--radius-sm)] shrink-0">
							{(['all', 'active', 'inactive'] as const).map((f) => (
								<button
									key={f}
									onClick={() => setFilter(f)}
									className={clsx(
										"px-3 py-1 text-sm font-medium rounded-[4px] transition-all",
										filter === f
											? "bg-[var(--color-surface)] text-[var(--color-label-primary)] shadow-sm ring-1 ring-black/5"
											: "text-[var(--color-label-secondary)] hover:text-[var(--color-label-primary)]"
									)}
								>
									{f === 'all' && '전체'}
									{f === 'active' && '활동 중'}
									{f === 'inactive' && '비활동'}
								</button>
							))}
						</div>
						<div className="relative w-full sm:w-64">
							<Input
								leftIcon={<Icon name="search" size={14} />}
								placeholder="이름 검색..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="w-full"
							/>
						</div>
					</div>

					{/* High Density List */}
					<div className="bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-[var(--radius-md)] overflow-hidden">
						<table className="w-full">
							<thead className="bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-subtle)]">
								<tr className="text-left text-xs font-semibold text-[var(--color-label-tertiary)] uppercase tracking-wider">
									<th className="px-4 py-2 text-center w-14">기수</th>
									<th className="px-4 py-2">이름</th>
									<th className="px-4 py-2 w-20 text-center">상태</th>
									<th className="px-4 py-2 w-16"></th>
								</tr>
							</thead>
							<tbody className="divide-y divide-[var(--color-border-subtle)]">
								{filteredMembers.length === 0 ? (
									<tr>
										<td colSpan={4} className="py-12 text-center">
											<div className="flex flex-col items-center justify-center gap-2">
												<div className="w-10 h-10 rounded-full bg-[var(--color-surface-elevated)] flex items-center justify-center">
													<Icon name="person_off" size={20} className="text-[var(--color-label-tertiary)]" />
												</div>
												<p className="text-sm text-[var(--color-label-secondary)]">
													{searchTerm ? '검색 결과가 없습니다' : '조건에 맞는 팀원이 없습니다'}
												</p>
											</div>
										</td>
									</tr>
								) : (
									filteredMembers.map((member) => (
										<tr
											key={member.name}
											className={clsx(
												"group transition-colors hover:bg-[var(--color-surface-elevated)]",
												!member.active && "opacity-60"
											)}
										>
											{/* Generation */}
											<td className="px-4 py-2.5 text-center">
												{member.generation ? (
													<span className="text-sm font-mono text-[var(--color-label-secondary)]">
														{member.generation}
													</span>
												) : (
													<span className="text-[var(--color-label-tertiary)]">-</span>
												)}
											</td>

											{/* Name & Notes */}
											<td className="px-4 py-2.5">
												<div className="flex items-center gap-3">
													<div className={clsx(
														"w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border border-[var(--color-border-subtle)]",
														member.generation
															? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
															: "bg-[var(--color-surface-elevated)] text-[var(--color-label-secondary)]"
													)}>
														{member.displayName.charAt(0)}
													</div>
													<div className="flex flex-col">
														<span className="text-base font-medium text-[var(--color-label-primary)]">
															{member.displayName}
														</span>
														{member.notes && (
															<span className="text-xs text-[var(--color-label-tertiary)] truncate max-w-[200px]">
																{member.notes}
															</span>
														)}
													</div>
												</div>
											</td>

											{/* Status */}
											<td className="px-4 py-2.5 text-center">
												<div className={clsx(
													"inline-block w-2 h-2 rounded-full",
													member.active ? "bg-[var(--color-success)]" : "bg-[var(--color-label-tertiary)]"
												)} />
											</td>

											{/* Actions */}
											<td className="px-4 py-2.5 text-right">
												<div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
													<button
														onClick={() => openEditModal(member)}
														className="p-1 text-[var(--color-label-secondary)] hover:text-[var(--color-accent)] rounded-[4px] hover:bg-[var(--color-surface-elevated)]"
													>
														<Icon name="edit" size={14} />
													</button>
													<button
														onClick={() => setDeletingMember(member)}
														className="p-1 text-[var(--color-label-secondary)] hover:text-[var(--color-danger)] rounded-[4px] hover:bg-[var(--color-surface-elevated)]"
													>
														<Icon name="delete" size={14} />
													</button>
												</div>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</div>

				{/* Right: Sidebar */}
				<div className="space-y-5">
					{/* Status Overview Card - Using semantic colors instead of gradient */}
					<Panel className="border-2 border-[var(--color-accent)]/20 relative overflow-hidden">
						<div className="absolute inset-0 bg-[var(--color-accent)]/5" />
						<div className="relative z-10">
							<h3 className="text-[var(--color-accent)] text-sm font-semibold uppercase tracking-wide mb-3">활동 현황</h3>
							<div className="flex items-end gap-2 mb-2">
								<span className="text-3xl font-bold tracking-tight text-[var(--color-label-primary)]">{activeCount}</span>
								<span className="text-[var(--color-label-secondary)] text-sm mb-1">/ {members.length}명</span>
							</div>
							<div className="w-full bg-[var(--color-surface)] h-1.5 rounded-full overflow-hidden">
								<div
									className="bg-[var(--color-accent)] h-full rounded-full transition-all duration-1000"
									style={{ width: `${members.length > 0 ? (activeCount / members.length) * 100 : 0}%` }}
								/>
							</div>
						</div>
					</Panel>

					{/* Generation Distribution - Compact */}
					<Panel>
						<h3 className="text-base font-medium text-[var(--color-label-primary)] mb-3 flex items-center gap-2">
							<Icon name="groups" size={16} className="text-[var(--color-label-tertiary)]" />
							기수별 분포
						</h3>
						<div className="space-y-2">
							{generationStats.sorted.map(([gen, count], idx) => (
								<div key={gen} className="flex items-center gap-3 text-sm">
									<div className="w-8 font-mono text-[var(--color-label-secondary)] text-right">{gen}기</div>
									<div className="flex-1 h-1.5 bg-[var(--color-surface-elevated)] rounded-full overflow-hidden">
										<div
											className={`h-full rounded-full ${idx === 0 ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-label-tertiary)]'}`}
											style={{ width: `${(count / Math.max(1, ...generationStats.sorted.map(s => s[1]))) * 100}%` }}
										/>
									</div>
									<div className="w-4 text-right font-medium text-[var(--color-label-primary)]">{count}</div>
								</div>
							))}
							{generationStats.unknown > 0 && (
								<div className="flex items-center gap-3 text-xs pt-2 border-t border-[var(--color-border-subtle)]">
									<div className="w-8 text-[var(--color-label-tertiary)] text-right">-</div>
									<div className="flex-1 text-[var(--color-label-tertiary)] text-xs">기수 미확인</div>
									<div className="w-4 text-right font-medium text-[var(--color-label-secondary)]">{generationStats.unknown}</div>
								</div>
							)}
						</div>
					</Panel>

					{/* Activity Feed */}
					<ActivityFeed
						title="변경 내역"
						filter={['member']}
						emptyMessage="최근 변경 사항 없음"
					/>
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
