import { DndContext, DragEndEvent } from '@dnd-kit/core'
import { useEffect, useState, useId, useMemo } from 'react'
import AssignmentSummary from './AssignmentSummary'
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

	const [selectedMember, setSelectedMember] = useState<string | null>(null)
	const [isMounted, setIsMounted] = useState(false)

	// DndContext에 고정된 ID 제공하여 hydration 불일치 방지
	const dndContextId = useId()

	// 클라이언트에서만 DndContext 활성화 (hydration 불일치 방지)
	useEffect(() => {
		setIsMounted(true)
	}, [])

	// 초기 렌더 시 날짜가 비어 있으면 오늘 날짜로 기본 설정
	useEffect(() => {
		if (!currentWeekDate) {
			const today = formatDateISO(new Date())
			setWeekDate(today)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	const currentAbsences = app.weeks[currentWeekDate]?.absences ?? []

	// ─────────────────────────────────────────────────────────────────────────
	// 배정 검증 유틸리티 함수들
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * 유효한 멤버 이름인지 검증
	 * - 빈 문자열, null, undefined, BLANK_ROLE_VALUE는 유효하지 않음
	 */
	function isValidMemberName(name: string | null | undefined): name is string {
		return Boolean(name) && name !== BLANK_ROLE_VALUE && name.trim() !== ''
	}

	/**
	 * 특정 파트에서 멤버가 배정된 슬롯 정보 반환
	 * - 없으면 null, 있으면 { role, index? } 반환
	 */
	function findMemberSlotInPart(
		part: 'part1' | 'part2',
		name: string
	): { role: RoleKey; index?: 0 | 1 } | null {
		if (!isValidMemberName(name)) return null

		const p = draft[part]

		// 단일 역할 체크
		if (p.SW === name) return { role: 'SW' }
		if (p['자막'] === name) return { role: '자막' }
		if (p['고정'] === name) return { role: '고정' }
		if (p['스케치'] === name) return { role: '스케치' }

		// 사이드 체크 (인덱스 포함)
		if (p['사이드'][0] === name) return { role: '사이드', index: 0 }
		if (p['사이드'][1] === name) return { role: '사이드', index: 1 }

		return null
	}

	/**
	 * 특정 파트에 멤버가 이미 배정되어 있는지 확인
	 */
	function nameExistsInPart(part: 'part1' | 'part2', name: string): boolean {
		return findMemberSlotInPart(part, name) !== null
	}

	/**
	 * 두 슬롯이 동일한지 비교
	 */
	function isSameSlot(
		slot1: { role: RoleKey; index?: 0 | 1 },
		slot2: { role: RoleKey; index?: 0 | 1 }
	): boolean {
		if (slot1.role !== slot2.role) return false
		// 사이드인 경우 인덱스까지 비교
		if (slot1.role === '사이드') {
			return slot1.index === slot2.index
		}
		return true
	}

	/**
	 * 배정 가능 여부 검증 및 결과 반환
	 */
	type AssignmentValidation =
		| { canAssign: true }
		| { canAssign: false; reason: 'same_slot' | 'already_in_part'; existingSlot?: { role: RoleKey; index?: 0 | 1 } }

	function validateAssignment(
		part: 'part1' | 'part2',
		role: RoleKey,
		memberName: string,
		index?: 0 | 1
	): AssignmentValidation {
		// 유효하지 않은 이름은 배정 가능으로 처리 (빈 값 배정 등)
		if (!isValidMemberName(memberName)) {
			return { canAssign: true }
		}

		// 해당 파트에서 멤버가 이미 배정된 슬롯 찾기
		const existingSlot = findMemberSlotInPart(part, memberName)

		// 배정되어 있지 않으면 배정 가능
		if (!existingSlot) {
			return { canAssign: true }
		}

		// 같은 슬롯인지 확인
		const targetSlot = { role, index }
		if (isSameSlot(existingSlot, targetSlot)) {
			return { canAssign: false, reason: 'same_slot', existingSlot }
		}

		// 다른 슬롯에 이미 배정됨
		return { canAssign: false, reason: 'already_in_part', existingSlot }
	}

	/**
	 * 파트 라벨 반환
	 */
	function getPartLabel(part: 'part1' | 'part2'): string {
		return part === 'part1' ? '1부' : '2부'
	}

	// ─────────────────────────────────────────────────────────────────────────
	// 이벤트 핸들러
	// ─────────────────────────────────────────────────────────────────────────

	function handleMemberClick(name: string) {
		setSelectedMember((prev) => (prev === name ? null : name))
	}

	function handleSlotClick(part: 'part1' | 'part2', role: RoleKey, index?: 0 | 1) {
		if (!selectedMember) return

		// 유효한 멤버 이름인지 먼저 확인
		if (!isValidMemberName(selectedMember)) {
			setSelectedMember(null)
			return
		}

		// 배정 가능 여부 검증
		const validation = validateAssignment(part, role, selectedMember, index)

		if (!validation.canAssign) {
			if (validation.reason === 'same_slot') {
				// 같은 슬롯 클릭 → 정보 알림
				setSelectedMember(null)
				toast({
					kind: 'info',
					title: '알림',
					description: '이미 해당 슬롯에 배정되어 있습니다.',
				})
			} else {
				// 다른 슬롯에 이미 배정됨 → 오류 알림
				toast({
					kind: 'error',
					title: '배정 불가',
					description: `${getPartLabel(part)}에 이미 배정된 인원입니다.`,
				})
			}
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

			// 공란 pill 드래그 시 BLANK_ROLE_VALUE로 처리
			const value = rawName === BLANK_ROLE_VALUE ? BLANK_ROLE_VALUE : rawName

			// BLANK_ROLE_VALUE는 검증 없이 바로 배정
			if (value === BLANK_ROLE_VALUE) {
				assignRole(targetPart, targetSlot.role, value, targetSlot.index)
				setSelectedMember(null)
				return
			}

			// 일반 멤버의 경우 배정 가능 여부 검증
			const validation = validateAssignment(targetPart, targetSlot.role, value, targetSlot.index)

			if (!validation.canAssign) {
				if (validation.reason === 'same_slot') {
					// 같은 슬롯으로 드래그 → 조용히 무시 (드래그에서는 토스트 없이)
					return
				}
				// 다른 슬롯에 이미 배정됨 → 오류 알림
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

		// 테이블 내부에서 드래그(스왑/이동)
		if (activeId.startsWith('assigned:')) {
			const source = decodeAssignedId(activeId)
			if (!source) return

			// 같은 슬롯으로 드래그 → 무시
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

	// DndContext 래퍼 컴포넌트 - 클라이언트에서만 활성화
	const DndWrapper = useMemo(() => {
		if (!isMounted) {
			return ({ children }: { children: React.ReactNode }) => <>{children}</>
		}
		return ({ children }: { children: React.ReactNode }) => (
			<DndContext id={dndContextId} onDragEnd={handleDragEnd}>
				{children}
			</DndContext>
		)
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isMounted, dndContextId])

	return (
		<DndWrapper>
			<div className="assignment-board-layout" style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'start' }}>

				{/* 메인 컬럼 (배정판) */}
				<div className="layout-main" style={{ flex: '1 1 500px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
					<AssignmentSummary />

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
							<Icon name="info" size={18} aria-hidden />
							<span style={{ fontWeight: 600 }}>도움말</span>
						</div>
						<ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
							<li>역할 슬롯을 드래그하여 배정을 맞바꿀 수 있습니다.</li>
							<li>팀원을 선택하고 빈 슬롯을 클릭하면 배정됩니다.</li>
						</ul>
					</div>
				</div>
			</div>
		</DndWrapper>
	)
}
