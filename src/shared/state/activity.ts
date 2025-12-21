import type { ActivityEntry } from '@/shared/types'

export const MAX_ACTIVITY_ENTRIES = 120

export function createActivityEntry(payload: Omit<ActivityEntry, 'id' | 'timestamp'>): ActivityEntry {
	const id =
		typeof crypto !== 'undefined' && 'randomUUID' in crypto
			? crypto.randomUUID()
			: `act-${Date.now()}-${Math.random().toString(16).slice(2)}`
	return {
		id,
		timestamp: new Date().toISOString(),
		...payload
	}
}

export const normalizeReason = (reason?: string) => (reason ?? '').trim()
export const normalizeText = (text?: string) => (text ?? '').trim()

