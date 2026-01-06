/**
 * 배정 슬롯 검증 유틸리티
 * 
 * AssignmentBoard에서 사용하는 검증 로직을 분리하여
 * 테스트 가능성과 재사용성을 높임
 */

import type { PartAssignment, RoleKey } from '@/shared/types'
import { BLANK_ROLE_VALUE } from '@/shared/utils/assignment'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type PartKey = 'part1' | 'part2'

export type DraftType = {
    part1: PartAssignment
    part2: PartAssignment
}

export type SlotInfo = {
    role: RoleKey
    index?: 0 | 1
}

export type AssignmentValidation =
    | { canAssign: true }
    | {
        canAssign: false
        reason: 'same_slot' | 'already_in_part'
        existingSlot?: SlotInfo
    }

// ─────────────────────────────────────────────────────────────────────────────
// Validation Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 유효한 멤버 이름인지 검증
 * - 빈 문자열, null, undefined, BLANK_ROLE_VALUE는 유효하지 않음
 */
export function isValidMemberName(name: string | null | undefined): name is string {
    return typeof name === 'string' && name !== BLANK_ROLE_VALUE && name.trim() !== ''
}

/**
 * 특정 파트에서 멤버가 배정된 슬롯 정보 반환
 * - 없으면 null, 있으면 { role, index? } 반환
 */
export function findMemberSlotInPart(
    draft: DraftType,
    part: PartKey,
    name: string
): SlotInfo | null {
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
export function nameExistsInPart(
    draft: DraftType,
    part: PartKey,
    name: string
): boolean {
    return findMemberSlotInPart(draft, part, name) !== null
}

/**
 * 두 슬롯이 동일한지 비교
 */
export function isSameSlot(slot1: SlotInfo, slot2: SlotInfo): boolean {
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
export function validateAssignment(
    draft: DraftType,
    part: PartKey,
    role: RoleKey,
    memberName: string,
    index?: 0 | 1
): AssignmentValidation {
    // 유효하지 않은 이름은 배정 가능으로 처리 (빈 값 배정 등)
    if (!isValidMemberName(memberName)) {
        return { canAssign: true }
    }

    // 해당 파트에서 멤버가 이미 배정된 슬롯 찾기
    const existingSlot = findMemberSlotInPart(draft, part, memberName)

    // 배정되어 있지 않으면 배정 가능
    if (!existingSlot) {
        return { canAssign: true }
    }

    // 같은 슬롯인지 확인
    const targetSlot: SlotInfo = { role, index }
    if (isSameSlot(existingSlot, targetSlot)) {
        return { canAssign: false, reason: 'same_slot', existingSlot }
    }

    // 다른 슬롯에 이미 배정됨
    return { canAssign: false, reason: 'already_in_part', existingSlot }
}

// ─────────────────────────────────────────────────────────────────────────────
// Label Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 파트 라벨 반환
 */
export function getPartLabel(part: PartKey): string {
    return part === 'part1' ? '1부' : '2부'
}

/**
 * 역할 라벨 반환 (한국어)
 */
export function getRoleLabel(role: RoleKey): string {
    const labels: Record<RoleKey, string> = {
        SW: 'SW',
        자막: '자막',
        고정: '고정',
        사이드: '사이드',
        스케치: '스케치'
    }
    return labels[role]
}
