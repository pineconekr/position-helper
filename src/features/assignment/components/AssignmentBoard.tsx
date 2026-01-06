import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core'
import { useEffect, useState, useId, useMemo } from 'react'
import AssignmentSummary from './AssignmentSummary'
import AssignmentTable from './AssignmentTable'
import MemberList from './MemberList'
import WarningWidget from './WarningWidget'
import WarningBadge from '@/shared/components/common/WarningBadge'
import { Badge } from '@/shared/components/ui/Badge'
import { Input } from '@/shared/components/ui/Input'
import { Panel } from '@/shared/components/ui/Panel'
import Icon from '@/shared/components/ui/Icon'
import { useAppStore } from '@/shared/state/store'
import { useToast } from '@/shared/hooks/useToast'
import type { RoleKey } from '@/shared/types'
import { BLANK_ROLE_VALUE } from '@/shared/utils/assignment'
import { decodeAssignedId, decodeDropId, decodeMemberId } from '@/shared/utils/dndIds'
import { formatDateISO } from '@/shared/utils/date'
import AbsenceWidget from './AbsenceWidget'
import {
	isValidMemberName,
	validateAssignment,
	isSameSlot,
	getPartLabel,
	type PartKey
} from '../utils/slotValidation'
import clsx from 'clsx'

const DRAG_ACTIVATION_DISTANCE = 8

export default function AssignmentBoard() {
	const assignRole = useAppStore((s) => s.assignRole)
	const clearRole = useAppStore((s) => s.clearRole)
	const setWeekDate = useAppStore((s) => s.setWeekDate)
	const warnings = useAppStore((s) => s.warnings)
	const currentWeekDate = useAppStore((s) => s.currentWeekDate)
	const app = useAppStore((s) => s.app)
	const draft = useAppStore((s) => s.currentDraft)
	const moveRole = useAppStore((s) => s.moveRole)
	const recalcWarnings = useAppStore((s) => s.recalcWarnings)
	const { toast } = useToast()

	const [selectedMember, setSelectedMember] = useState<string | null>(null)
	const [isMounted, setIsMounted] = useState(false)

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: DRAG_ACTIVATION_DISTANCE,
			},
		})
	)

	const dndContextId = useId()

	useEffect(() => {
		setIsMounted(true)
	}, [])

	useEffect(() => {
		if (!currentWeekDate) {
			const today = formatDateISO(new Date())
			setWeekDate(today)
		}
	}, [currentWeekDate, setWeekDate])

	useEffect(() => {
		if (isMounted && currentWeekDate && draft) {
			recalcWarnings()
		}
	}, [isMounted, currentWeekDate, draft, recalcWarnings])

	const currentAbsences = app.weeks[currentWeekDate]?.absences ?? []

	function handleMemberClick(name: string) {
		setSelectedMember((prev) => (prev === name ? null : name))
	}

	function handleSlotClick(part: PartKey, role: RoleKey, index?: 0 | 1) {
		if (!selectedMember) return

		if (!isValidMemberName(selectedMember)) {
			setSelectedMember(null)
			return
		}

		const validation = validateAssignment(draft, part, role, selectedMember, index)

		if (!validation.canAssign) {
			if (validation.reason === 'same_slot') {
				setSelectedMember(null)
				toast({
					kind: 'info',
					title: '알림',
					description: '이미 해당 슬롯에 배정되어 있습니다.',
				})
			} else {
				toast({
					kind: 'error',
					title: '배정 불가',
					description: `${getPartLabel(part)}에 이미 배정된 인원입니다.`,
				})
			}
			return
		}

		assignRole(part, role, selectedMember, index)
		setSelectedMember(null)
	}

	function handleDragEnd(ev: DragEndEvent) {
		const activeId = String(ev.active.id)
		const overId = String(ev.over?.id ?? '')
		const targetSlot = decodeDropId(overId)
		if (!targetSlot) return
		const targetPart = targetSlot.part

		if (activeId.startsWith('member:')) {
			const rawName = decodeMemberId(activeId)
			if (rawName === null) return

			const value = rawName === BLANK_ROLE_VALUE ? BLANK_ROLE_VALUE : rawName

			if (value === BLANK_ROLE_VALUE) {
				assignRole(targetPart, targetSlot.role, value, targetSlot.index)
				setSelectedMember(null)
				return
			}

			const validation = validateAssignment(draft, targetPart, targetSlot.role, value, targetSlot.index)

			if (!validation.canAssign) {
				if (validation.reason === 'same_slot') {
					return
				}
				toast({
					kind: 'error',
					title: '배정 불가',
					description: `${getPartLabel(targetPart)}에 이미 배정된 인원입니다.`,
				})
				return
			}

			assignRole(targetPart, targetSlot.role, value, targetSlot.index)
			setSelectedMember(null)
			return
		}

		if (activeId.startsWith('assigned:')) {
			const source = decodeAssignedId(activeId)
			if (!source) return

			if (
				source.part === targetSlot.part &&
				isSameSlot(
					{ role: source.role, index: source.index },
					{ role: targetSlot.role, index: targetSlot.index }
				)
			) {
				return
			}

			moveRole(
				{ part: source.part, role: source.role, index: source.index },
				{ part: targetSlot.part, role: targetSlot.role, index: targetSlot.index }
			)
		}
	}

	const DndWrapper = useMemo(() => {
		if (!isMounted) {
			return ({ children }: { children: React.ReactNode }) => <>{children}</>
		}
		return ({ children }: { children: React.ReactNode }) => (
			<DndContext id={dndContextId} sensors={sensors} onDragEnd={handleDragEnd}>
				{children}
			</DndContext>
		)
	}, [isMounted, dndContextId, sensors, handleDragEnd])

	return (
		<DndWrapper>
			<div className="flex flex-wrap gap-4 items-start">

				{/* 메인 컬럼 (배정판) */}
				<div className="flex-[1_1_500px] min-w-0 flex flex-col gap-4">
					<AssignmentSummary />

					<Panel className="p-4 space-y-4">
						<div className="flex justify-between items-center flex-wrap gap-3 pb-4 border-b border-[var(--color-border-subtle)]">
							<div className="flex gap-2 items-center flex-wrap">
								<label className="text-sm font-medium text-[var(--color-label-secondary)]">주차</label>
								<Input
									type="date"
									value={currentWeekDate || formatDateISO(new Date())}
									onChange={(e) => {
										const next = e.target.value
										if (!next) return
										setWeekDate(next)
									}}
									className="w-auto px-2 py-1 h-8 text-sm"
								/>
								{currentAbsences.length > 0 && (
									<Badge variant="danger">{`불참 ${currentAbsences.length}`}</Badge>
								)}
							</div>
							<WarningBadge count={warnings.length} />
						</div>

						{/* 배정 테이블 */}
						<div>
							<div className="flex items-center gap-2 mb-2">
								<span className="text-base font-bold text-[var(--color-label-primary)]">배정</span>
								<span className="text-xs text-[var(--color-label-tertiary)]">
									드래그하여 배정하세요
								</span>
							</div>
							<AssignmentTable
								selectedMember={selectedMember}
								onSlotClick={handleSlotClick}
								onClearSlot={(part: PartKey, role: RoleKey, index?: 0 | 1) => {
									clearRole(part, role, index)
									toast({
										kind: 'info',
										title: '배정 취소',
										description: '배정이 해제되었습니다.',
									})
								}}
							/>
						</div>
					</Panel>

					<Panel className="p-4">
						<div className="flex items-center justify-between gap-2 mb-3">
							<span className="text-base font-bold text-[var(--color-label-primary)]">팀원 목록</span>
							{selectedMember && (
								<Badge variant="accent" size="sm">선택됨: {selectedMember}</Badge>
							)}
						</div>
						<MemberList
							orientation="horizontal"
							variant="inline"
							title={null}
							selectedMember={selectedMember}
							onMemberClick={handleMemberClick}
						/>
					</Panel>
				</div>

				{/* 사이드 컬럼 (위젯) */}
				<div className="flex-[1_1_300px] max-w-full flex flex-col gap-4">
					<WarningWidget />
					<AbsenceWidget />

					<div className="text-[var(--color-label-tertiary)] text-xs leading-relaxed px-1">
						<div className="flex gap-1.5 mb-1.5 items-center">
							<Icon name="info" size={14} aria-hidden />
							<span className="font-semibold text-[var(--color-label-secondary)]">도움말</span>
						</div>
						<ul className="m-0 pl-4 list-disc space-y-1">
							<li>역할 슬롯을 드래그하여 배정을 맞바꿀 수 있습니다.</li>
							<li>팀원을 선택하고 빈 슬롯을 클릭하면 배정됩니다.</li>
						</ul>
					</div>
				</div>
			</div>
		</DndWrapper>
	)
}
