import type { StateCreator } from 'zustand'
import type { AppState } from '../store'
import { getEffectiveTheme } from '../store'
import type { MotionPreference, ThemePreference } from '@/shared/types'

export type ThemeSlice = {
	theme: ThemePreference
	motionPreference: MotionPreference
	setTheme: (t: ThemePreference) => void
	getEffectiveTheme: () => 'light' | 'dark'
	setMotionPreference: (value: MotionPreference) => void
}

export const createThemeSlice: StateCreator<AppState, [], [], ThemeSlice> = (set, get) => ({
	theme: 'system',
	motionPreference: 'allow',
	setTheme: (t) => {
		set({ theme: t })
		const effective = getEffectiveTheme(t)
		document.documentElement.setAttribute('data-theme', effective)
	},
	getEffectiveTheme: () => getEffectiveTheme(get().theme),
	setMotionPreference: (value) => set({ motionPreference: value })
})
