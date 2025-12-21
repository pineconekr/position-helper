import { DndContext, DragEndEvent } from '@dnd-kit/core'
import { useEffect, useState } from 'react'
import AssignmentSummary from './AssignmentSummary'
import MemberList from './MemberList'
import WarningWidget from './WarningWidget'
import WarningBadge from '@/shared/components/common/WarningBadge'
import WeekCalendarModal from '@/shared/components/common/WeekCalendarModal'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Panel } from '@/shared/components/ui/Panel'
import { useAppStore } from '@/shared/state/store'
import { useToast } from '@/shared/hooks/useToast'
import type { RoleKey } from '@/shared/types'
import { BLANK_ROLE_VALUE } from '@/shared/utils/assignment'
import { decodeAssignedId, decodeDropId, decodeMemberId } from '@/shared/utils/dndIds'
import { formatDateISO } from '@/shared/utils/date'
import AbsenceWidget from './AbsenceWidget'
import AssignmentTable from './AssignmentTable'

export default function AssignmentBoard() {
	const assignRole = useAppStore((s) => s.assignRole)
	const setWeekDate = useAppStore((s) => s.setWeekDate)
	const warnings = useAppStore((s) => s.warnings)
	const currentWeekDate = useAppStore((s) => s.currentWeekDate)
	const app = useAppStore((s) => s.app)
	const draft = useAppStore((s) => s.currentDraft)
	const moveRole = useAppStore((s) => s.moveRole)
	const { toast } = useToast()

	const [calendarOpen, setCalendarOpen] = useState(false)
	const [selectedMember, setSelectedMember] = useState<string | null>(null)

	// 초기 렌더 시 날짜가 비어 있으면 오늘 날짜로 기본 설정
	useEffect(() => {
		if (!currentWeekDate) {
			const today = formatDateISO(new Date())
			setWeekDate(today)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	const currentAbsences = app.weeks[currentWeekDate]?.absences ?? []

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
					toast({
						title: '알림',
						description: '이미 해당 슬롯에 배정되어 있습니다.',
					})
					return
				}
			} else {
				const current = (draft[part] as any)[role]
				if (current === selectedMember) {
					setSelectedMember(null)
					toast({
						title: '알림',
						description: '이미 해당 슬롯에 배정되어 있습니다.',
					})
					return
				}
			}
			// 다른 위치에 있다면 무시
			toast({
				title: '배정 불가',
				description: `${part === 'part1' ? '1부' : '2부'}에 이미 배정된 인원입니다.`,
				variant: 'destructive',
			})
			return
		}

		// 배정 수행
		assignRole(part, role, selectedMember, index)
		setSelectedMember(null)
	}

	function handleDragEnd(ev: DragEndEvent) {
		const activeId = String(ev.active.id)
		const overId = String(ev.over?.id ?? '')
		const targetSlot = decodeDropId(overId)
		if (!targetSlot) return
		const targetPart = targetSlot.part

		// 멤버 목록에서 드래그 → 슬롯 배정
		if (activeId.startsWith('member:')) {
			const rawName = decodeMemberId(activeId)
			if (rawName === null) return
			
			// 공란 pill 드래그 시 실제 값은 BLANK_ROLE_VALUE로 처리하여 '배정'으로 인식되도록 함.
			// 화면상 '-'로 보이지만 내부 값은 식별자를 써야 '미배정 경고'를 우회 가능.
			// 저장 시에는 normalizeDraftForPersist에서 빈 문자열로 변환됨.
			const value = rawName === BLANK_ROLE_VALUE ? BLANK_ROLE_VALUE : rawName
			if (value !== BLANK_ROLE_VALUE && value && nameExistsInPart(targetPart, value)) {
				toast({
					title: '배정 불가',
					description: `${targetPart === 'part1' ? '1부' : '2부'}에 이미 배정된 인원입니다.`,
					variant: 'destructive',
				})
				return
			}
			assignRole(targetPart, targetSlot.role, value, targetSlot.index)
			setSelectedMember(null)
			return
		}

		// 테이블 내부에서 드래그(스왑/이동)
		if (activeId.startsWith('assigned:')) {
			const source = decodeAssignedId(activeId)
			if (!source) return
			if (
				source.part === targetSlot.part &&
				source.role === targetSlot.role &&
				(source.role !== '사이드' || source.index === targetSlot.index)
			) return
			moveRole(
				{ part: source.part, role: source.role, index: source.index },
				{ part: targetSlot.part, role: targetSlot.role, index: targetSlot.index }
			)
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

						<AssignmentTable onSlotClick={handleSlotClick} />

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
					<WarningWidget />
					<AbsenceWidget />
					
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
		</DndContext>
	)
}
