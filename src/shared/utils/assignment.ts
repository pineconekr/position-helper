import type { PartAssignment } from '../types'

import { RoleKeys } from '../types'

export const BLANK_ROLE_VALUE = '__blank__'

export type SlotDescriptor = {
	part: 'part1' | 'part2'
	role: keyof PartAssignment
	index?: 0 | 1
}

const SLOT_ROLES = RoleKeys

const partLabel = (part: 'part1' | 'part2') => (part === 'part1' ? '1부' : '2부')

/**
 * Remove cohort number from name (e.g. "12기 홍길동" -> "홍길동")
 */
export function stripCohort(name: string): string {
	if (!name) return name
	return name.replace(/^\d+\s+/, '')
}

/**
 * Extract cohort number from name (e.g. "12기 홍길동" -> 12)
 */
export function extractCohort(name: string): number | null {
	const match = name.match(/^(\d+)\s+/)
	return match ? parseInt(match[1], 10) : null
}

export function listSlots(): SlotDescriptor[] {
	const slots: SlotDescriptor[] = []
		; (['part1', 'part2'] as const).forEach((part) => {
			SLOT_ROLES.forEach((role) => {
				if (role === '사이드') {
					slots.push({ part, role, index: 0 })
					slots.push({ part, role, index: 1 })
				} else {
					slots.push({ part, role })
				}
			})
		})
	return slots
}

export function analyzeDraft(draft: { part1: PartAssignment; part2: PartAssignment }) {
	const slots = listSlots()
	let assigned = 0
	const emptySlots: SlotDescriptor[] = []

	slots.forEach((slot) => {
		const part = draft[slot.part]
		const rawValue =
			slot.role === '사이드'
				? part['사이드'][slot.index ?? 0]
				: (part[slot.role] as string)
		// BLANK_ROLE_VALUE (공란 pill)은 배정된 상태로 취급
		const value = rawValue === BLANK_ROLE_VALUE ? BLANK_ROLE_VALUE : rawValue?.trim()

		// BLANK_ROLE_VALUE (공란 pill)도 배정된 것으로 간주
		if (value) {
			assigned += 1
		} else {
			emptySlots.push(slot)
		}
	})

	return {
		total: slots.length,
		assigned,
		emptySlots,
		slots
	}
}

export function slotToLabel(slot: SlotDescriptor) {
	const base = `${partLabel(slot.part)} ${slot.role}`
	if (slot.role === '사이드') {
		return `${base}(${slot.index === 0 ? '1' : '2'})`
	}
	return base
}


