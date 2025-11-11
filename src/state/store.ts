import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppData, ActivityEntry, ActivityType, MembersEntry, PartAssignment, WeekData, Warning } from '../types'
import { computeWarnings } from '../utils/rules'
import { formatDateISO } from '../utils/date'

function getSystemTheme(): 'light' | 'dark' {
	if (typeof window === 'undefined') return 'light'
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getEffectiveTheme(theme: 'light' | 'dark' | 'system'): 'light' | 'dark' {
	return theme === 'system' ? getSystemTheme() : theme
}

const MAX_ACTIVITY_ENTRIES = 120

const partLabel = (part: 'part1' | 'part2') => (part === 'part1' ? '1부' : '2부')
const roleLabel = (role: keyof PartAssignment) => role
const formatWeekLabel = (iso: string) => iso.replace(/-/g, '.')

const createActivityEntry = (payload: Omit<ActivityEntry, 'id' | 'timestamp'>): ActivityEntry => {
	const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
		? crypto.randomUUID()
		: `act-${Date.now()}-${Math.random().toString(16).slice(2)}`
	return {
		id,
		timestamp: new Date().toISOString(),
		...payload
	}
}

const normalizeReason = (reason?: string) => (reason ?? '').trim()
const normalizeText = (text?: string) => (text ?? '').trim()

const countAssignedRoles = (part: PartAssignment): number => {
	let count = 0
	if (part.SW) count += 1
	if (part['자막']) count += 1
	if (part['고정']) count += 1
	if (part['스케치']) count += 1
	count += part['사이드'].filter((n) => !!n).length
	return count
}

export type AppState = {
	app: AppData
	currentWeekDate: string
	currentDraft: { part1: PartAssignment; part2: PartAssignment }
	warnings: Warning[]
	theme: 'light' | 'dark' | 'system'
	activityLog: ActivityEntry[]
	// actions
	setTheme: (t: 'light' | 'dark' | 'system') => void
	getEffectiveTheme: () => 'light' | 'dark'
	setWeekDate: (date: string) => void
	setMembers: (members: MembersEntry[]) => void
	toggleMemberActive: (name: string) => void
	addActivity: (entry: Omit<ActivityEntry, 'id' | 'timestamp'>) => void
	clearActivity: () => void
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
			activityLog: [],
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
			setMembers: (members) => {
				const prevMembers = get().app.members
				const prevMap = new Map(prevMembers.map((m) => [m.name, m]))
				const nextMap = new Map(members.map((m) => [m.name, m]))
				const added = members.filter((m) => !prevMap.has(m.name))
				const removed = prevMembers.filter((m) => !nextMap.has(m.name))
				const notesChanged = members.filter((m) => {
					const prev = prevMap.get(m.name)
					if (!prev) return false
					return normalizeText(prev.notes) !== normalizeText(m.notes)
				})

				set((s) => ({ app: { ...s.app, members } }))

				const addActivity = get().addActivity
				added.forEach((m) => {
					addActivity({
						type: 'member',
						title: `${m.name}`,
						description: '팀원 추가',
						meta: { action: 'add', member: m }
					})
				})
				removed.forEach((m) => {
					addActivity({
						type: 'member',
						title: `${m.name}`,
						description: '팀원 삭제',
						meta: { action: 'remove', member: m }
					})
				})
				notesChanged.forEach((m) => {
					const prev = prevMap.get(m.name)
					addActivity({
						type: 'member',
						title: `${m.name}`,
						description: `메모 수정: ${normalizeText(prev?.notes) || '없음'} → ${normalizeText(m.notes) || '없음'}`,
						meta: { action: 'note-update', before: prev?.notes, after: m.notes }
					})
				})
			},
			toggleMemberActive: (name) => {
				const prevMember = get().app.members.find((m) => m.name === name)
				set((s) => {
					const next = s.app.members.map((m) => m.name === name ? { ...m, active: !m.active } : m)
					return { app: { ...s.app, members: next } }
				})
				const nextMember = get().app.members.find((m) => m.name === name)
				if (!prevMember || !nextMember) return
				get().addActivity({
					type: 'member',
					title: `${nextMember.name}`,
					description: nextMember.active ? '활성화' : '비활성화',
					meta: { action: 'toggle-active', active: nextMember.active }
				})
			},
			addActivity: (payload) =>
				set((s) => {
					const entry = createActivityEntry(payload)
					const next = [entry, ...s.activityLog].slice(0, MAX_ACTIVITY_ENTRIES)
					return { activityLog: next }
				}),
			clearActivity: () => set({ activityLog: [] }),
			loadWeekToDraft: (date) => {
				set((s) => {
					const wk = s.app.weeks[date] ?? { part1: emptyPart(), part2: emptyPart(), absences: [] }
					return { currentWeekDate: date, currentDraft: { part1: structuredClone(wk.part1), part2: structuredClone(wk.part2) } }
				})
				get().recalcWarnings()
			},
			assignRole: (part, role, value, index) => {
				const trimmedValue = value.trim()
				const prevDraft = structuredClone(get().currentDraft)
				const previousValue = role === '사이드'
					? prevDraft[part]['사이드'][index ?? 0]
					: (prevDraft[part] as any)[role] as string
				if (previousValue === trimmedValue) return
				set((s) => {
					const next = structuredClone(s.currentDraft)
					if (role === '사이드' && typeof index !== 'undefined') next[part]['사이드'][index] = trimmedValue
					else (next[part] as any)[role] = trimmedValue
					return { currentDraft: next }
				})
				const title = `${partLabel(part)} ${roleLabel(role)}`
				const description = previousValue
					? `${previousValue} → ${trimmedValue || '비어 있음'}`
					: `${trimmedValue || '비어 있음'} 배정`
				get().addActivity({
					type: 'assignment',
					title,
					description,
					meta: { part, role, index, before: previousValue, after: trimmedValue }
				})
				get().recalcWarnings()
			},
			clearRole: (part, role, index) => {
				const prevDraft = get().currentDraft
				const previousValue = role === '사이드'
					? prevDraft[part]['사이드'][index ?? 0]
					: (prevDraft[part] as any)[role] as string
				if (!previousValue) return
				set((s) => {
					const next = structuredClone(s.currentDraft)
					if (role === '사이드' && typeof index !== 'undefined') next[part]['사이드'][index] = ''
					else (next[part] as any)[role] = ''
					return { currentDraft: next }
				})
				get().addActivity({
					type: 'assignment',
					title: `${partLabel(part)} ${roleLabel(role)}`,
					description: `${previousValue} 배정 해제`,
					meta: { part, role, index, before: previousValue, after: '' }
				})
				get().recalcWarnings()
			},
			updateAbsences: (date, absences) => {
				const prevAbsences = structuredClone(get().app.weeks[date]?.absences ?? [])
				const prevMap = new Map(prevAbsences.map((a) => [a.name, normalizeReason(a.reason)]))
				const nextMap = new Map(absences.map((a) => [a.name, normalizeReason(a.reason)]))
				const added = absences.filter((a) => !prevMap.has(a.name))
				const removed = prevAbsences.filter((a) => !nextMap.has(a.name))
				const updated = absences.filter((a) => {
					const prevReason = prevMap.get(a.name)
					if (prevReason === undefined) return false
					return prevReason !== normalizeReason(a.reason)
				})

				set((s) => {
					const week: WeekData = s.app.weeks[date] ?? { part1: emptyPart(), part2: emptyPart(), absences: [] }
					const nextWeeks = { ...s.app.weeks, [date]: { ...week, absences } }
					return { app: { ...s.app, weeks: nextWeeks } }
				})

				const addActivity = get().addActivity
				const label = formatWeekLabel(date)
				added.forEach((a) => {
					addActivity({
						type: 'absence',
						title: `${label} 불참자`,
						description: `${a.name} 추가${a.reason ? ` (${normalizeReason(a.reason)})` : ''}`,
						meta: { action: 'add', date, absence: a }
					})
				})
				removed.forEach((a) => {
					addActivity({
						type: 'absence',
						title: `${label} 불참자`,
						description: `${a.name} 제거`,
						meta: { action: 'remove', date, absence: a }
					})
				})
				updated.forEach((a) => {
					addActivity({
						type: 'absence',
						title: `${label} 불참자`,
						description: `${a.name} 사유 변경: ${prevMap.get(a.name) || '없음'} → ${normalizeReason(a.reason) || '없음'}`,
						meta: { action: 'update', date, absence: a, before: prevMap.get(a.name) }
					})
				})
			},
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
			finalizeCurrentWeek: () => {
				const state = get()
				if (!state.currentWeekDate) return
				const date = state.currentWeekDate
				set((s) => {
					const base: WeekData = s.app.weeks[date] ?? { part1: emptyPart(), part2: emptyPart(), absences: [] }
					const nextWeeks = { ...s.app.weeks, [date]: { ...base, ...s.currentDraft } }
					return { app: { ...s.app, weeks: nextWeeks } }
				})
				const totalAssigned = countAssignedRoles(state.currentDraft.part1) + countAssignedRoles(state.currentDraft.part2)
				get().addActivity({
					type: 'finalize',
					title: `${formatWeekLabel(date)} 주차 확정`,
					description: `총 ${totalAssigned}명 배정 저장`,
					meta: { date, totalAssigned }
				})
			}
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


