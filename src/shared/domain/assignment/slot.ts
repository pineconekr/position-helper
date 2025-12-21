import type { PartAssignment } from '@/shared/types'
import type { SlotDescriptor } from '@/shared/utils/assignment'

export type AssignmentDraft = { part1: PartAssignment; part2: PartAssignment }

export function normalizeSlot(slot: SlotDescriptor): SlotDescriptor | null {
	if (slot.role === '사이드') {
		if (slot.index !== 0 && slot.index !== 1) return null
		return { part: slot.part, role: slot.role, index: slot.index }
	}
	return { part: slot.part, role: slot.role }
}

export function slotsAreEqual(a: SlotDescriptor, b: SlotDescriptor): boolean {
	return a.part === b.part && a.role === b.role && (a.role !== '사이드' || a.index === b.index)
}

export function getSlotValue(draft: AssignmentDraft, slot: SlotDescriptor): string {
	if (slot.role === '사이드') {
		const idx = slot.index ?? 0
		return draft[slot.part]['사이드'][idx] ?? ''
	}
	return draft[slot.part][slot.role]
}

export function setSlotValue(draft: AssignmentDraft, slot: SlotDescriptor, value: string) {
	if (slot.role === '사이드') {
		const idx = slot.index ?? 0
		draft[slot.part]['사이드'][idx] = value
	} else {
		draft[slot.part][slot.role] = value
	}
}

