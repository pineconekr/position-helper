import { DndContext, DragEndEvent } from '@dnd-kit/core'
import { useEffect, useMemo, useRef, useState } from 'react'
import AssignmentSummary from './AssignmentSummary'
import MemberList from './MemberList'
import RoleCell from './RoleCell'
import Modal from '@/shared/components/common/Modal'
import WarningBadge from '@/shared/components/common/WarningBadge'
import WeekCalendarModal from '@/shared/components/common/WeekCalendarModal'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Panel } from '@/shared/components/ui/Panel'
import { Textarea } from '@/shared/components/ui/Textarea'
import { useAppStore } from '@/shared/state/store'
import type { RoleKey } from '@/shared/types'
import type { Warning } from '@/shared/types'
import type { SlotDescriptor } from '@/shared/utils/assignment'
import { formatDateISO } from '@/shared/utils/date'

export default function AssignmentBoard() {
	const assignRole = useAppStore((s) => s.assignRole)
	const setWeekDate = useAppStore((s) => s.setWeekDate)
	const warnings = useAppStore((s) => s.warnings)
	const currentWeekDate = useAppStore((s) => s.currentWeekDate)
	const app = useAppStore((s) => s.app)
	const updateAbsences = useAppStore((s) => s.updateAbsences)
	const draft = useAppStore((s) => s.currentDraft)
	const loadWeekToDraft = useAppStore((s) => s.loadWeekToDraft)
	const clearRole = useAppStore((s) => s.clearRole)
	const moveRole = useAppStore((s) => s.moveRole)

	const [calendarOpen, setCalendarOpen] = useState(false)
	const [absenceForm, setAbsenceForm] = useState<{ name: string; reason: string }>({ name: '', reason: '' })
	const [warningGroupBy, setWarningGroupBy] = useState<'none' | 'role' | 'name'>('role')
	const [selectedMember, setSelectedMember] = useState<string | null>(null)
	const absenceSectionRef = useRef<HTMLDivElement | null>(null)
	const [editingAbsence, setEditingAbsence] = useState<{ name: string; reason: string } | null>(null)

	// 초기 렌더 시 날짜가 비어 있으면 오늘 날짜로 기본 설정
	useEffect(() => {
		if (!currentWeekDate) {
			const today = formatDateISO(new Date())
			setWeekDate(today)
			loadWeekToDraft(today)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	const currentAbsences = useMemo(() => {
		if (!currentWeekDate) return []
		return app.weeks[currentWeekDate]?.absences ?? []
	}, [app.weeks, currentWeekDate])

	function addAbsence() {
		if (!currentWeekDate) return
		if (!absenceForm.name) return
		const exists = currentAbsences.some((a) => a.name === absenceForm.name)
		const next = exists
			? currentAbsences.map((a) => a.name === absenceForm.name ? { name: a.name, reason: absenceForm.reason || undefined } : a)
			: [...currentAbsences, { name: absenceForm.name, reason: absenceForm.reason || undefined }]
		updateAbsences(currentWeekDate, next)
		setAbsenceForm({ name: '', reason: '' })
	}

	function removeAbsence(n: string) {
		if (!currentWeekDate) return
		updateAbsences(currentWeekDate, currentAbsences.filter((a) => a.name !== n))
	}

	function openEditAbsence(name: string) {
		const target = currentAbsences.find((a) => a.name === name)
		if (!target) return
		setEditingAbsence({ name, reason: target.reason ?? '' })
	}

	function saveAbsenceReason() {
		if (!currentWeekDate || !editingAbsence) return
		const trimmed = editingAbsence.reason.trim()
		const next = currentAbsences.map((a) =>
			a.name === editingAbsence.name ? { ...a, reason: trimmed || undefined } : a
		)
		updateAbsences(currentWeekDate, next)
		setEditingAbsence(null)
	}

	function nameExistsInPart(part: 'part1' | 'part2', name: string): boolean {
		const p = draft[part]
		if (p.SW === name || p['자막'] === name || p['고정'] === name || p['스케치'] === name) return true
		if (p['사이드'][0] === name || p['사이드'][1] === name) return true
		return false
	}

	function handleMemberClick(name: string) {
		setSelectedMember((prev) => (prev === name ? null : name))
	}

	function handleSlotClick(part: 'part1' | 'part2', role: RoleKey, index?: 0 | 1) {
		if (!selectedMember) return

		// 이미 배정된 멤버인지 확인
		if (nameExistsInPart(part, selectedMember)) {
			if (role === '사이드') {
				const current = draft[part]['사이드'][index ?? 0]
				if (current === selectedMember) {
					setSelectedMember(null)
					return
				}
			} else {
				const current = (draft[part] as any)[role]
				if (current === selectedMember) {
					setSelectedMember(null)
					return
				}
			}
			// 다른 위치에 있다면 무시
			return
		}

		// 배정 수행
		assignRole(part, role, selectedMember, index)
		setSelectedMember(null)
	}

	function handleDragEnd(ev: DragEndEvent) {
		const activeId = String(ev.active.id)
		const overId = String(ev.over?.id ?? '')
		if (!overId.startsWith('drop:')) return
		const [, tPart, tRole, tIdx] = overId.split(':')
		if (!tRole) return
		if (tPart !== 'part1' && tPart !== 'part2') return
		const targetPart = tPart as 'part1' | 'part2'
		const parseIndex = (value: string): 0 | 1 | undefined => {
			if (value === '0') return 0
			if (value === '1') return 1
			return undefined
		}
		const buildSlot = (part: 'part1' | 'part2', role: RoleKey, rawIdx: string): SlotDescriptor | null => {
			if (role === '사이드') {
				const idx = parseIndex(rawIdx)
				if (idx !== 0 && idx !== 1) return null
				return { part, role, index: idx }
			}
			return { part, role }
		}

		// 테이블 내부에서 드래그(스왑/이동)
		if (activeId.startsWith('assigned:')) {
			const [, sPart, sRole, sIdx, nameRaw] = activeId.split(':')
			if (sPart !== 'part1' && sPart !== 'part2') return
			const sourcePart = sPart as 'part1' | 'part2'
			const name = nameRaw || ''
			
			if (sourcePart === targetPart && sRole === tRole && sIdx === tIdx) return

			const sourceSlot = buildSlot(sourcePart, sRole as RoleKey, sIdx)
			const targetSlot = buildSlot(targetPart, tRole as RoleKey, tIdx)
			if (!sourceSlot || !targetSlot) return
			moveRole(sourceSlot, targetSlot)
		}
	}

	return (
		<DndContext onDragEnd={handleDragEnd}>
			<div className="assignment-board-layout" style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'start' }}>
				
				{/* 메인 컬럼 (배정판) */}
				<div className="layout-main" style={{ flex: '1 1 500px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
					<AssignmentSummary onOpenCalendar={() => setCalendarOpen(true)} />
					
					<Panel style={{ padding: 20 }}>
						<div className="toolbar" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
							<div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
								<label style={{ fontWeight: 500, fontSize: '0.9rem' }}>주차(일요일)</label>
								<Input
									type="date"
									value={currentWeekDate || formatDateISO(new Date())}
									onChange={(e) => {
										const next = e.target.value
										if (!next) return
										setWeekDate(next)
										loadWeekToDraft(next)
									}}
									style={{ width: 'auto', padding: '6px 12px' }}
								/>
								<Button size="sm" onClick={() => setCalendarOpen(true)}>캘린더</Button>
								{currentAbsences.length > 0 && (
									<Badge variant="critical">{`불참 ${currentAbsences.length}`}</Badge>
								)}
							</div>
							<WarningBadge count={warnings.length} />
						</div>

						<div className="assignment-table-wrapper" style={{ marginBottom: 24 }}>
							<table className="table assignment-table">
								<thead>
									<tr>
										<th>부</th>
										<th>SW</th>
										<th>자막</th>
										<th>고정</th>
										<th>사이드</th>
										<th>스케치</th>
									</tr>
								</thead>
								<tbody>
									<tr>
										<td>1부</td>
										<td data-label="SW"><RoleCell part="part1" role="SW" onSlotClick={handleSlotClick} /></td>
										<td data-label="자막"><RoleCell part="part1" role="자막" onSlotClick={handleSlotClick} /></td>
										<td data-label="고정"><RoleCell part="part1" role="고정" onSlotClick={handleSlotClick} /></td>
										<td data-label="사이드" className="role-cell-group">
											<RoleCell part="part1" role="사이드" index={0} onSlotClick={handleSlotClick} />
											<RoleCell part="part1" role="사이드" index={1} onSlotClick={handleSlotClick} />
										</td>
										<td data-label="스케치"><RoleCell part="part1" role="스케치" onSlotClick={handleSlotClick} /></td>
									</tr>
									<tr>
										<td>2부</td>
										<td data-label="SW"><RoleCell part="part2" role="SW" onSlotClick={handleSlotClick} /></td>
										<td data-label="자막"><RoleCell part="part2" role="자막" onSlotClick={handleSlotClick} /></td>
										<td data-label="고정"><RoleCell part="part2" role="고정" onSlotClick={handleSlotClick} /></td>
										<td data-label="사이드" className="role-cell-group">
											<RoleCell part="part2" role="사이드" index={0} onSlotClick={handleSlotClick} />
											<RoleCell part="part2" role="사이드" index={1} onSlotClick={handleSlotClick} />
										</td>
										<td data-label="스케치"><RoleCell part="part2" role="스케치" onSlotClick={handleSlotClick} /></td>
									</tr>
								</tbody>
							</table>
						</div>

						<div className="assignment-board__members">
							<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
								<div style={{ fontWeight: 700, fontSize: '0.95rem' }}>팀원 목록</div>
								{selectedMember && (
									<Badge variant="accent" title="선택된 팀원">{selectedMember}</Badge>
								)}
							</div>
							<MemberList
								orientation="horizontal"
								variant="inline"
								title={null}
								selectedMember={selectedMember}
								onMemberClick={handleMemberClick}
							/>
						</div>
					</Panel>
				</div>

				{/* 사이드 컬럼 (위젯) */}
				<div className="layout-side" style={{ flex: '1 1 320px', maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
					
					{/* 경고 위젯 */}
					{warnings.length > 0 && (() => {
						const severityRank = (lv: Warning['level']) => lv === 'error' ? 2 : lv === 'warn' ? 1 : 0
						const levelIcon: Record<Warning['level'], { icon: string; color: string; label: string }> = {
							error: { icon: 'error', color: 'var(--color-critical)', label: '위험' },
							warn: { icon: 'warning', color: 'var(--color-warning)', label: '주의' },
							info: { icon: 'info', color: 'var(--color-accent)', label: '알림' }
						}
						const roleOrder: RoleKey[] = ['SW', '고정', '스케치', '사이드', '자막']
						const roleRank = (r?: RoleKey) => (r ? roleOrder.indexOf(r) : roleOrder.length + 1)

						const nameCounts = new Map<string, number>()
						warnings.forEach((w) => {
							const n = w.target?.name
							if (!n) return
							nameCounts.set(n, (nameCounts.get(n) ?? 0) + 1)
						})
						const sortedWarnings = [...warnings].sort((a, b) => {
							const bySev = severityRank(b.level) - severityRank(a.level)
							if (bySev) return bySev
							const byNameLoad = (nameCounts.get(b.target?.name ?? '') ?? 0) - (nameCounts.get(a.target?.name ?? '') ?? 0)
							if (byNameLoad) return byNameLoad
							const byRole = roleRank(a.target?.role) - roleRank(b.target?.role)
							if (byRole) return byRole
							const partRank = (p?: 'part1' | 'part2') => (p === 'part1' ? 0 : p === 'part2' ? 1 : 2)
							const byPart = partRank(a.target?.part) - partRank(b.target?.part)
							if (byPart) return byPart
							return a.id.localeCompare(b.id)
						})

						type Key = string
						const summary = new Map<Key, number>()
						const keyLabel = (key: Key) => {
							const [role, part] = key.split('|')
							return `${role}${part ? `/${part === 'part1' ? '1부' : '2부'}` : ''}`
						}
						warnings.forEach((w) => {
							const k: Key = `${w.target?.role ?? '기타'}|${w.target?.part ?? ''}`
							summary.set(k, (summary.get(k) ?? 0) + 1)
						})
						const sortedSummary = [...summary.entries()].sort((a, b) => b[1] - a[1])

						const Card = ({ w }: { w: Warning }) => {
							const meta = levelIcon[w.level] ?? levelIcon.warn
							return (
								<div key={w.id} className="warning-card" style={{ border: '1px solid var(--color-border-subtle)', background: 'var(--color-surface-2)', borderRadius: 8, padding: 10 }}>
									<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
										<div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: 'var(--color-text-primary)' }}>
											<span className="material-symbol" style={{ color: meta.color }} aria-label={meta.label} role="img">
												{meta.icon}
											</span>
											<span>{w.message}</span>
										</div>
										{(w.target?.role || w.target?.part) && (
											<div className="muted" style={{ fontSize: 12 }}>
												{w.target?.part ? (w.target.part === 'part1' ? '1부' : '2부') : ''}
												{w.target?.role ? ` · ${w.target.role}` : ''}
											</div>
										)}
									</div>
									{(w.target?.name || w.target?.date) && (
										<div className="muted" style={{ fontSize: 12 }}>
											{w.target?.name ? `대상: ${w.target.name}` : ''}
											{w.target?.date ? `${w.target?.name ? ' · ' : ''}${w.target.date}` : ''}
										</div>
									)}
								</div>
							)
						}

						type GroupKey = string
						const groupMap = new Map<GroupKey, Warning[]>()
						const groupLabel = (k: GroupKey) => k
						if (warningGroupBy === 'role') {
							sortedWarnings.forEach((w) => {
								const k: GroupKey = w.target?.role ?? '기타'
								if (!groupMap.has(k)) groupMap.set(k, [])
								groupMap.get(k)!.push(w)
							})
						} else if (warningGroupBy === 'name') {
							sortedWarnings.forEach((w) => {
								const k: GroupKey = w.target?.name ?? '(이름 없음)'
								if (!groupMap.has(k)) groupMap.set(k, [])
								groupMap.get(k)!.push(w)
							})
						}

						const groupedEntries = warningGroupBy === 'none'
							? [['전체', sortedWarnings] as [GroupKey, Warning[]]]
							: [...groupMap.entries()].sort((a, b) => b[1].length - a[1].length)

						return (
							<Panel className="warning-panel" style={{ padding: 16, border: '1px solid var(--color-warning)' }}>
								<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
									<div style={{ fontWeight: 700 }}>경고 상세</div>
									<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
										<div className="muted" style={{ fontSize: '0.875rem' }}>그룹:</div>
										<select 
											value={warningGroupBy} 
											onChange={(e) => setWarningGroupBy(e.target.value as any)}
											style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--color-border-subtle)', background: 'var(--color-surface-1)', color: 'var(--color-text-primary)' }}
										>
											<option value="role">역할</option>
											<option value="name">이름</option>
											<option value="none">없음</option>
										</select>
									</div>
								</div>
								
								{sortedSummary.length > 0 && (
									<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
										{sortedSummary.map(([k, c]) => (
											<Badge key={k} variant="warning" title="역할/부 기준 경고 수">
												{keyLabel(k)} {c}
											</Badge>
										))}
									</div>
								)}

								<div className="col" style={{ gap: 10 }}>
									{groupedEntries.map(([k, arr]) => (
										<div key={k} className="col" style={{ gap: 8 }}>
											{warningGroupBy !== 'none' && (
												<div style={{ fontWeight: 700, marginTop: 4 }}>{groupLabel(k)} <span className="muted" style={{ fontWeight: 400 }}>({arr.length})</span></div>
											)}
											<div className="col" style={{ gap: 8 }}>
												{arr.map((w) => <Card key={w.id} w={w} />)}
											</div>
										</div>
									))}
								</div>
							</Panel>
						)
					})()}

					{/* 불참자 관리 위젯 */}
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
									{app.members.map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}
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

					<div className="muted assignment-board__hint" style={{ fontSize: '0.85rem', lineHeight: 1.5, padding: '0 4px' }}>
						<div style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
							<span className="material-symbol" style={{ fontSize: 18 }} aria-hidden="true">info</span>
							<span style={{ fontWeight: 600 }}>도움말</span>
						</div>
						<ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
							<li>역할 슬롯을 드래그하여 배정을 맞바꿀 수 있습니다.</li>
							<li>팀원을 선택하고 빈 슬롯을 클릭하면 배정됩니다.</li>
						</ul>
					</div>
				</div>
			</div>

			<WeekCalendarModal
				open={calendarOpen}
				onClose={() => setCalendarOpen(false)}
				onDateSelect={() => {}}
			/>

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
		</DndContext>
	)
}
