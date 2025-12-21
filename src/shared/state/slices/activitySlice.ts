import type { StateCreator } from 'zustand'
import type { AppState } from '../store'
import type { ActivityEntry } from '@/shared/types'
import { createActivityEntry, MAX_ACTIVITY_ENTRIES } from '../activity'

export type ActivitySlice = {
	activityLog: ActivityEntry[]
	addActivity: (entry: Omit<ActivityEntry, 'id' | 'timestamp'>) => void
	clearActivity: () => void
	removeActivity: (id: string) => void
}

export const createActivitySlice: StateCreator<AppState, [], [], ActivitySlice> = (set) => ({
	activityLog: [],
	addActivity: (payload) =>
		set((s) => {
			const entry = createActivityEntry(payload)
			const next = [entry, ...s.activityLog].slice(0, MAX_ACTIVITY_ENTRIES)
			return { activityLog: next }
		}),
	clearActivity: () => set({ activityLog: [] }),
	removeActivity: (id) =>
		set((s) => ({
			activityLog: s.activityLog.filter((entry) => entry.id !== id)
		}))
})
