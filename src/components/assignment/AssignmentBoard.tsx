import { DndContext, DragEndEvent } from '@dnd-kit/core'
import { useEffect, useMemo, useRef, useState } from 'react'
import MemberList from './MemberList'
import RoleCell from './RoleCell'
import WarningBadge from '../common/WarningBadge'
import type { RoleKey } from '../../types'
import type { Warning } from '../../types'
import ActivityFeed from '../common/ActivityFeed'
import AssignmentSummary from './AssignmentSummary'
import WeekCalendarModal from '../common/WeekCalendarModal'
import { useAppStore } from '../../state/store'
import { formatDateISO } from '../../utils/date'

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

	const [calendarOpen, setCalendarOpen] = useState(false)
	const [absenceForm, setAbsenceForm] = useState<{ name: string; reason: string }>({ name: '', reason: '' })
	const [warningGroupBy, setWarningGroupBy] = useState<'none' | 'role' | 'name'>('role')
	const [selectedMember, setSelectedMember] = useState<string | null>(null)
	const absenceSectionRef = useRef<HTMLDivElement | null>(null)

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
		if (!selectedMember) return // 멤버 선택 없이 슬롯 클릭 시 아무 동작 안 함 (기존 X 버튼으로 삭제)

		// 이미 배정된 멤버인지 확인
		if (nameExistsInPart(part, selectedMember)) {
			// 같은 위치 클릭이 아니면 무시하거나, 이동 처리? 일단 간단히 토스트나 무시
			// 여기서는 무시 (드래그로 이동 유도 또는 재선택 유도)
			if (role === '사이드') {
				const current = draft[part]['사이드'][index ?? 0]
				if (current === selectedMember) {
					setSelectedMember(null) // 선택 해제
					return
				}
			} else {
				const current = (draft[part] as any)[role]
				if (current === selectedMember) {
					setSelectedMember(null)
					return
				}
			}
			// 다른 위치에 있다면? 일단 단순화: 중복 배정 방지
			return
		}

		// 배정 수행
		assignRole(part, role, selectedMember, index)
		setSelectedMember(null) // 배정 후 선택 해제
	}

	function handleDragEnd(ev: DragEndEvent) {
		const activeId = String(ev.active.id)
		const overId = String(ev.over?.id ?? '')
		if (!overId.startsWith('drop:')) return
		const [, tPart, tRole, tIdx] = overId.split(':')
		if (!tRole) return
		if (tPart !== 'part1' && tPart !== 'part2') return
		const targetPart = tPart as 'part1' | 'part2'

		// 2) 테이블 내부에서 드래그(스왑/이동) - 이제 이것만 유효
		if (activeId.startsWith('assigned:')) {
			const [, sPart, sRole, sIdx, nameRaw] = activeId.split(':')
			if (sPart !== 'part1' && sPart !== 'part2') return
			const sourcePart = sPart as 'part1' | 'part2'
			const name = nameRaw || ''
			// 동일 타겟이면 무시
			if (sourcePart === targetPart && sRole === tRole && sIdx === tIdx) return

			// 타겟 현재 값
			let targetValue = ''
			if (tRole === '사이드') {
				const idx = tIdx === 'single' ? 0 : Number(tIdx)
				if (idx !== 0 && idx !== 1) return
				targetValue = draft[targetPart]['사이드'][idx as 0 | 1]
			} else {
				targetValue = (draft[targetPart] as any)[tRole] as string
			}

			// 이동: 타겟 비어있으면 소스 비우고 타겟 채움
			if (!targetValue) {
				if (tRole === '사이드') {
					const idx = tIdx === 'single' ? 0 : Number(tIdx)
					if (idx !== 0 && idx !== 1) return
					assignRole(targetPart, '사이드', name, idx as 0 | 1)
				} else {
					assignRole(targetPart, tRole as any, name)
				}
				// 소스 비우기
				if (sRole === '사이드') {
					const sindex = sIdx === 'single' ? 0 : Number(sIdx)
					if (sindex !== 0 && sindex !== 1) return
					clearRole(sourcePart, '사이드', sindex as 0 | 1)
				} else {
					clearRole(sourcePart, sRole as any)
				}
				return
			}

			// 스왑: 타겟에 값이 있으면 교환
			if (tRole === '사이드') {
				const idx = tIdx === 'single' ? 0 : Number(tIdx)
				if (idx !== 0 && idx !== 1) return
				assignRole(targetPart, '사이드', name, idx as 0 | 1)
			} else {
				assignRole(targetPart, tRole as any, name)
			}

			if (sRole === '사이드') {
				const sindex = sIdx === 'single' ? 0 : Number(sIdx)
				if (sindex !== 0 && sindex !== 1) return
				assignRole(sourcePart, '사이드', targetValue, sindex as 0 | 1)
			} else {
				assignRole(sourcePart, sRole as any, targetValue)
			}
			return
		}
	}

	return (
		<DndContext onDragEnd={handleDragEnd}>
			<div className="dnd-container">
				<div className="assignment-board__sidebar">
					<MemberList 
						orientation="vertical" 
						selectedMember={selectedMember}
						onMemberClick={handleMemberClick}
					/>
				</div>

				<div className="assignment-board__main">
					<AssignmentSummary
						onOpenCalendar={() => setCalendarOpen(true)}
					/>
					
					<div className="panel" style={{ padding: 12 }}>
						<div className="toolbar">
							<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
								<label>주차(일요일)</label>
								<input
									type="date"
									value={currentWeekDate || formatDateISO(new Date())}
									onChange={(e) => {
										const next = e.target.value
										if (!next) return
										setWeekDate(next)
										loadWeekToDraft(next)
									}}
								/>
								<button className="btn" onClick={() => setCalendarOpen(true)}>캘린더</button>
								{currentAbsences.length > 0 && (
									<span className="badge">{`불참 ${currentAbsences.length}`}</span>
								)}
							</div>
							<WarningBadge count={warnings.length} />
						</div>
						{warnings.length > 0 && (() => {
						const severityRank = (lv: Warning['level']) => lv === 'error' ? 2 : lv === 'warn' ? 1 : 0
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

						// Summary chips: by role/part
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

						// 카드 렌더러
						const Card = ({ w }: { w: Warning }) => (
							<div key={w.id} className="warning-card" style={{ border: '1px solid var(--color-border-subtle)', background: 'var(--color-surface-2)', borderRadius: 8, padding: 10 }}>
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
									<div style={{ fontWeight: 700, color: w.level === 'error' ? 'var(--color-critical)' : 'var(--color-text-primary)' }}>
										[{w.level.toUpperCase()}] {w.message}
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

						// 그룹핑
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
							<div className="panel warning-panel" style={{ padding: 12, marginBottom: 12 }}>
								<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
									<div style={{ fontWeight: 700 }}>경고 상세</div>
									<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
										<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
											{sortedSummary.map(([k, c]) => (
												<span key={k} className="badge" title="역할/부 기준 경고 수">
													{keyLabel(k)} {c}
												</span>
											))}
										</div>
										<div className="muted" style={{ marginLeft: 8 }}>그룹:</div>
										<select value={warningGroupBy} onChange={(e) => setWarningGroupBy(e.target.value as any)}>
											<option value="role">역할</option>
											<option value="name">이름</option>
											<option value="none">없음</option>
										</select>
									</div>
								</div>

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
							</div>
						)
					})()}

					<div ref={absenceSectionRef} className="panel" style={{ padding: 12, marginBottom: 12 }}>
						<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
							<div style={{ fontWeight: 600 }}>불참자 관리</div>
						</div>
						<div className="row" style={{ alignItems: 'center' }}>
							<div className="col" style={{ flex: 1 }}>
								<label>팀원</label>
								<select
									value={absenceForm.name}
									onChange={(e) => setAbsenceForm((f) => ({ ...f, name: e.target.value }))}
								>
									<option value="">선택</option>
									{app.members.map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}
								</select>
							</div>
							<div className="col" style={{ flex: 2 }}>
								<label>이유(선택)</label>
								<input
									value={absenceForm.reason}
									onChange={(e) => setAbsenceForm((f) => ({ ...f, reason: e.target.value }))}
									placeholder="예: 시험"
								/>
							</div>
							<div style={{ alignSelf: 'end' }}>
								<button className="btn primary" onClick={addAbsence} disabled={!currentWeekDate || !absenceForm.name}>추가/업데이트</button>
							</div>
						</div>
						{currentAbsences.length > 0 && (
							<table className="table" style={{ marginTop: 12 }}>
								<thead><tr><th>이름</th><th>이유</th><th></th></tr></thead>
								<tbody>
									{currentAbsences.map((a) => (
										<tr key={a.name}>
											<td>{a.name}</td>
											<td>{a.reason ?? '-'}</td>
											<td><button className="btn-remove" title="삭제" onClick={() => removeAbsence(a.name)} aria-label="삭제"><span className="material-symbol">close</span></button></td>
										</tr>
									))}
								</tbody>
							</table>
						)}
						{!currentWeekDate && <div className="muted" style={{ marginTop: 8 }}>날짜를 먼저 선택하세요.</div>}
					</div>
					<div className="muted assignment-board__hint">
						<span className="material-symbol" aria-hidden="true">info</span>
						<span className="hint-desktop">역할 슬롯끼리 드래그하여 위치를 바꿀 수 있습니다.</span>
						<span className="hint-mobile" style={{ display: 'none' }}>멤버를 터치하여 선택한 후 역할을 누르세요.</span>
					</div>

					<div className="assignment-table-wrapper">
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

					<WeekCalendarModal
						open={calendarOpen}
						onClose={() => setCalendarOpen(false)}
						onDateSelect={() => {}}
					/>
				</div>

				<ActivityFeed
					title="최근 배정 변경 내역"
					filter={['assignment', 'absence', 'finalize']}
					emptyMessage="아직 변경 기록이 없습니다. 배정을 시작해보세요."
				/>

				</div>
			</div>
		</DndContext>
	)
}


