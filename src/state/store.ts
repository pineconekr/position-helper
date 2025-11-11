import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppData, MembersEntry, PartAssignment, WeekData, Warning } from '../types'
import { computeWarnings } from '../utils/rules'
import { formatDateISO } from '../utils/date'

function getSystemTheme(): 'light' | 'dark' {
	if (typeof window === 'undefined') return 'light'
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getEffectiveTheme(theme: 'light' | 'dark' | 'system'): 'light' | 'dark' {
	return theme === 'system' ? getSystemTheme() : theme
}

export type AppState = {
	app: AppData
	currentWeekDate: string
	currentDraft: { part1: PartAssignment; part2: PartAssignment }
	warnings: Warning[]
	theme: 'light' | 'dark' | 'system'
	// actions
	setTheme: (t: 'light' | 'dark' | 'system') => void
	getEffectiveTheme: () => 'light' | 'dark'
	setWeekDate: (date: string) => void
	setMembers: (members: MembersEntry[]) => void
	toggleMemberActive: (name: string) => void
	loadWeekToDraft: (date: string) => void
	assignRole: (part: 'part1' | 'part2', role: keyof PartAssignment, value: string, index?: 0 | 1) => void
	clearRole: (part: 'part1' | 'part2', role: keyof PartAssignment, index?: 0 | 1) => void
	updateAbsences: (date: string, absences: WeekData['absences']) => void
	importData: (data: AppData) => void
	exportData: () => AppData
	recalcWarnings: () => void
	finalizeCurrentWeek: () => void
}

const emptyPart = (): PartAssignment => ({ SW: '', 자막: '', 고정: '', 사이드: ['', ''], 스케치: '' })

const initial: AppData = { weeks: {}, members: [] }

export const useAppStore = create<AppState>()(
	persist(
		(set, get) => ({
			app: initial,
			currentWeekDate: formatDateISO(new Date()),
			currentDraft: { part1: emptyPart(), part2: emptyPart() },
			warnings: [],
			theme: 'system',
			setTheme: (t) => {
				set({ theme: t })
				const effective = getEffectiveTheme(t)
				document.documentElement.setAttribute('data-theme', effective)
			},
			getEffectiveTheme: () => getEffectiveTheme(get().theme),
			setWeekDate: (date) => {
				set({ currentWeekDate: date })
				get().recalcWarnings()
			},
			setMembers: (members) => set((s) => ({ app: { ...s.app, members } })),
			toggleMemberActive: (name) =>
				set((s) => {
					const next = s.app.members.map((m) => m.name === name ? { ...m, active: !m.active } : m)
					return { app: { ...s.app, members: next } }
				}),
			loadWeekToDraft: (date) => {
				set((s) => {
					const wk = s.app.weeks[date] ?? { part1: emptyPart(), part2: emptyPart(), absences: [] }
					return { currentWeekDate: date, currentDraft: { part1: structuredClone(wk.part1), part2: structuredClone(wk.part2) } }
				})
				get().recalcWarnings()
			},
			assignRole: (part, role, value, index) => {
				set((s) => {
					const next = structuredClone(s.currentDraft)
					if (role === '사이드' && typeof index !== 'undefined') next[part]['사이드'][index] = value
					else (next[part] as any)[role] = value
					return { currentDraft: next }
				})
				get().recalcWarnings()
			},
			clearRole: (part, role, index) => {
				set((s) => {
					const next = structuredClone(s.currentDraft)
					if (role === '사이드' && typeof index !== 'undefined') next[part]['사이드'][index] = ''
					else (next[part] as any)[role] = ''
					return { currentDraft: next }
				})
				get().recalcWarnings()
			},
			updateAbsences: (date, absences) =>
				set((s) => {
					const week: WeekData = s.app.weeks[date] ?? { part1: emptyPart(), part2: emptyPart(), absences: [] }
					const nextWeeks = { ...s.app.weeks, [date]: { ...week, absences } }
					return { app: { ...s.app, weeks: nextWeeks } }
				}),
			importData: (data) => {
				// 새로운 객체로 설정하여 참조 변경 보장
				set({ 
					app: { ...data, members: [...data.members], weeks: { ...data.weeks } },
					currentDraft: { part1: emptyPart(), part2: emptyPart() },
					warnings: []
				})
				// 현재 날짜에 해당하는 주차가 있으면 로드
				const date = get().currentWeekDate
				if (date && data.weeks[date]) {
					get().loadWeekToDraft(date)
				}
			},
			exportData: () => {
				const s = get()
				const baseApp = s.app
				const date = s.currentWeekDate
				if (!date) return baseApp
				const baseWeek: WeekData = baseApp.weeks[date] ?? { part1: emptyPart(), part2: emptyPart(), absences: [] }
				const merged: WeekData = { ...baseWeek, ...s.currentDraft } // absences 유지
				return { ...baseApp, weeks: { ...baseApp.weeks, [date]: merged } }
			},
			recalcWarnings: () =>
				set((s) => ({ warnings: s.currentWeekDate ? computeWarnings(s.currentWeekDate, s.currentDraft, s.app) : [] })),
			finalizeCurrentWeek: () =>
				set((s) => {
					if (!s.currentWeekDate) return {}
					const base: WeekData = s.app.weeks[s.currentWeekDate] ?? { part1: emptyPart(), part2: emptyPart(), absences: [] }
					const nextWeeks = { ...s.app.weeks, [s.currentWeekDate]: { ...base, ...s.currentDraft } }
					return { app: { ...s.app, weeks: nextWeeks } }
				})
		}),
		{
			name: 'position-helper-store',
			partialize: (s) => ({ app: s.app, theme: s.theme }),
			version: 1,
			onRehydrateStorage: () => (state) => {
				if (state) {
					const effective = getEffectiveTheme(state.theme)
					document.documentElement.setAttribute('data-theme', effective)
				}
			}
		}
	)
)


