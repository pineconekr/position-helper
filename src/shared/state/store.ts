import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MotionPreference } from '@/shared/types'
import type { ThemeSlice } from './slices/themeSlice'
import { createThemeSlice } from './slices/themeSlice'
import type { ActivitySlice } from './slices/activitySlice'
import { createActivitySlice } from './slices/activitySlice'
import type { AssignmentSlice } from './slices/assignmentSlice'
import { createAssignmentSlice } from './slices/assignmentSlice'

import { formatDateISO } from '@/shared/utils/date'
import type { AppData, PartAssignment } from '@/shared/types'

const emptyPart = (): PartAssignment => ({ SW: '', 자막: '', 고정: '', 사이드: ['', ''], 스케치: '' })

export function getSystemTheme(): 'light' | 'dark' {
	if (typeof window === 'undefined') return 'light'
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function getEffectiveTheme(theme: 'light' | 'dark' | 'system'): 'light' | 'dark' {
	return theme === 'system' ? getSystemTheme() : theme
}

export type AppState = ThemeSlice & ActivitySlice & AssignmentSlice

export const useAppStore = create<AppState>()(
	persist(
		(...a) => ({
			...createThemeSlice(...a),
			...createActivitySlice(...a),
			...createAssignmentSlice(...a)
		}),
		{
			name: 'position-helper-store',
			partialize: (s) => ({
				app: s.app,
				theme: s.theme,
				motionPreference: s.motionPreference,
				currentDraft: s.currentDraft,
				currentWeekDate: s.currentWeekDate
			}),
			version: 4,
			migrate: (persistedState: any, version) => {
				if (!persistedState) return persistedState
				
				// v1 -> v2 migration
				if (version < 2) {
					persistedState = { ...persistedState, motionPreference: 'allow' satisfies MotionPreference }
				}
				
				// v2 -> v3 migration
				if (version === 2) {
					const prev = persistedState as typeof persistedState & { reduceMotion?: boolean }
					const preference: MotionPreference = prev.reduceMotion ? 'reduce' : 'allow'
					const { reduceMotion, ...rest } = prev
					persistedState = { ...rest, motionPreference: preference }
				}

				// v3 -> v4 migration (initialize currentDraft & currentWeekDate from app data if missing)
				if (version < 4) {
					// Default to today if not present
					const today = formatDateISO(new Date())
					const currentWeekDate = persistedState.currentWeekDate || today
					
					// Try to load draft from existing app weeks if possible
					const app = persistedState.app as AppData
					const existingWeek = app?.weeks?.[currentWeekDate]
					
					const currentDraft = existingWeek 
						? { part1: structuredClone(existingWeek.part1), part2: structuredClone(existingWeek.part2) }
						: { part1: emptyPart(), part2: emptyPart() }

					persistedState = {
						...persistedState,
						currentWeekDate,
						currentDraft
					}
				}

				return persistedState as AppState
			},
			onRehydrateStorage: () => (state) => {
				if (state) {
					const effective = getEffectiveTheme(state.theme)
					document.documentElement.setAttribute('data-theme', effective)
				}
			}
		}
	)
)
