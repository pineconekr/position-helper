'use client'

import { useRef } from 'react'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Panel } from '@/shared/components/ui/Panel'
import { Textarea } from '@/shared/components/ui/Textarea'
import Modal from '@/shared/components/common/Modal'
import Icon from '@/shared/components/ui/Icon'
import { useAbsenceManager } from '../hooks/useAbsenceManager'
import clsx from 'clsx'

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
			<Panel ref={absenceSectionRef} className="p-4 space-y-4">
				<div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-subtle)]">
					<div className="text-sm font-bold text-[var(--color-label-primary)] flex items-center gap-2">
						<Icon name="event_busy" size={16} className="text-[var(--color-label-tertiary)]" />
						불참자 관리
					</div>
					{currentAbsences.length > 0 && (
						<span className="px-1.5 py-0.5 rounded-[4px] bg-[var(--color-danger)]/10 text-[var(--color-danger)] text-xs font-medium">
							{currentAbsences.length}명
						</span>
					)}
				</div>

				<div className="flex flex-col gap-3">
					<div className="space-y-1">
						<label className="text-xs font-medium text-[var(--color-label-secondary)]">팀원 선택</label>
						<div className="relative">
							<select
								value={absenceForm.name}
								onChange={(e) => setAbsenceForm((f) => ({ ...f, name: e.target.value }))}
								className={clsx(
									"w-full h-8 pl-2 pr-8 rounded-[var(--radius-sm)] appearance-none",
									"bg-[var(--color-surface)] border border-[var(--color-border-default)]",
									"text-sm text-[var(--color-label-primary)]",
									"focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]",
									"transition-all duration-100"
								)}
							>
								<option value="">선택해주세요</option>
								{members.map((m) => (
									<option key={m.name} value={m.name}>{m.name}</option>
								))}
							</select>
							<div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-label-tertiary)]">
								<Icon name="expand_more" size={16} />
							</div>
						</div>
					</div>

					<div className="space-y-1">
						<label className="text-xs font-medium text-[var(--color-label-secondary)]">사유 (선택)</label>
						<Input
							value={absenceForm.reason}
							onChange={(e) => setAbsenceForm((f) => ({ ...f, reason: e.target.value }))}
							placeholder="예: 시험, 여행"
							className="bg-[var(--color-surface)]"
						/>
					</div>

					<Button
						variant="solid"
						onClick={addAbsence}
						disabled={!currentWeekDate || !absenceForm.name}
						className="w-full justify-center"
						size="sm"
					>
						불참 등록
					</Button>
				</div>

				{currentAbsences.length > 0 && (
					<div className="space-y-2 pt-2">
						{currentAbsences.map((a) => (
							<div key={a.name} className="flex items-center justify-between p-2 rounded-[var(--radius-sm)] bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] group">
								<div className="flex flex-col">
									<span className="text-sm font-medium text-[var(--color-label-primary)]">{a.name}</span>
									<span className="text-xs text-[var(--color-label-tertiary)]">{a.reason || '사유 없음'}</span>
								</div>
								<div className="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
									<button
										onClick={() => openEditAbsence(a.name)}
										className="p-1 text-[var(--color-label-secondary)] hover:text-[var(--color-accent)] rounded-[4px] hover:bg-[var(--color-surface)]"
									>
										<Icon name="edit" size={14} />
									</button>
									<button
										onClick={() => removeAbsence(a.name)}
										className="p-1 text-[var(--color-label-secondary)] hover:text-[var(--color-danger)] rounded-[4px] hover:bg-[var(--color-surface)]"
									>
										<Icon name="close" size={14} />
									</button>
								</div>
							</div>
						))}
					</div>
				)}

				{!currentWeekDate && (
					<div className="text-xs text-[var(--color-danger)] text-center py-2 bg-[var(--color-danger)]/5 rounded-[var(--radius-sm)]">
						주차를 먼저 선택해주세요
					</div>
				)}
			</Panel>

			<Modal
				title={editingAbsence ? `사유 수정 - ${editingAbsence.name}` : '사유 수정'}
				open={editingAbsence !== null}
				onClose={() => setEditingAbsence(null)}
				footer={
					<>
						<Button variant="ghost" onClick={() => setEditingAbsence(null)}>취소</Button>
						<Button variant="solid" onClick={saveAbsenceReason}>저장</Button>
					</>
				}
				size="sm"
			>
				<div className="flex flex-col gap-1.5">
					<label className="text-xs font-medium text-[var(--color-label-secondary)]">사유 입력</label>
					<Textarea
						value={editingAbsence?.reason ?? ''}
						onChange={(e) => setEditingAbsence((prev) => prev ? { ...prev, reason: e.target.value } : prev)}
						placeholder="불참 사유를 수정하세요"
						autoFocus
					/>
				</div>
			</Modal>
		</>
	)
}
