import type { StateCreator } from 'zustand'
import type { AppState } from '../store'
import type { AppData, MembersEntry, PartAssignment, WeekData, Warning } from '@/shared/types'
import type { SlotDescriptor } from '@/shared/utils/assignment'
import { slotToLabel, BLANK_ROLE_VALUE } from '@/shared/utils/assignment'
import { getSlotValue, normalizeSlot, setSlotValue, slotsAreEqual } from '@/shared/domain/assignment/slot'
import { formatDateISO } from '@/shared/utils/date'
import { computeWarnings } from '@/shared/utils/rules'
import { normalizeReason, normalizeText } from '../activity'

const partLabel = (part: 'part1' | 'part2') => (part === 'part1' ? '1부' : '2부')
const roleLabel = (role: keyof PartAssignment) => role
const formatWeekLabel = (iso: string) => iso.replace(/-/g, '.')

const emptyPart = (): PartAssignment => ({ SW: '', 자막: '', 고정: '', 사이드: ['', ''], 스케치: '' })

const countAssignedRoles = (part: PartAssignment): number => {
	let count = 0
	if (part.SW) count += 1
	if (part['자막']) count += 1
	if (part['고정']) count += 1
	if (part['스케치']) count += 1
	count += part['사이드'].filter((n) => !!n).length
	return count
}

// BLANK_ROLE_VALUE 값은 화면상 배정으로 취급하지만, 영구 저장 시에는 빈 문자열로 저장한다.
const normalizeDraftForPersist = (draft: { part1: PartAssignment; part2: PartAssignment }) => {
	const clone = structuredClone(draft)
	const clearIfBlank = (value: string) => (value === BLANK_ROLE_VALUE ? '' : value)
		; (['part1', 'part2'] as const).forEach((part) => {
			const p = clone[part]
			p.SW = clearIfBlank(p.SW)
			p['자막'] = clearIfBlank(p['자막'])
			p['고정'] = clearIfBlank(p['고정'])
			p['스케치'] = clearIfBlank(p['스케치'])
			p['사이드'][0] = clearIfBlank(p['사이드'][0])
			p['사이드'][1] = clearIfBlank(p['사이드'][1])
		})
	return clone
}

export type AssignmentSlice = {
	app: AppData
	currentWeekDate: string
	currentDraft: { part1: PartAssignment; part2: PartAssignment }
	warnings: Warning[]
	setWeekDate: (date: string) => void
	setMembers: (members: MembersEntry[]) => void
	toggleMemberActive: (name: string) => void
	loadWeekToDraft: (date: string) => void
	assignRole: (part: 'part1' | 'part2', role: keyof PartAssignment, value: string, index?: 0 | 1) => void
	moveRole: (source: SlotDescriptor, target: SlotDescriptor) => void
	clearRole: (part: 'part1' | 'part2', role: keyof PartAssignment, index?: 0 | 1) => void
	updateAbsences: (date: string, absences: WeekData['absences']) => void
	importData: (data: AppData) => void
	exportData: () => AppData
	recalcWarnings: () => void
	setDraft: (draft: { part1: PartAssignment; part2: PartAssignment }) => void
	finalizeCurrentWeek: () => void
}

const initial: AppData = { weeks: {}, members: [] }

export const createAssignmentSlice: StateCreator<AppState, [], [], AssignmentSlice> = (set, get) => ({
	app: initial,
	currentWeekDate: formatDateISO(new Date()),
	currentDraft: { part1: emptyPart(), part2: emptyPart() },
	warnings: [],
	setWeekDate: (date) => {
		const state = get()
		if (state.currentWeekDate) {
			state.finalizeCurrentWeek()
		}

		const nextState = get()
		const wk = nextState.app.weeks[date] ?? { part1: emptyPart(), part2: emptyPart(), absences: [] }

		set({
			currentWeekDate: date,
			currentDraft: {
				part1: structuredClone(wk.part1),
				part2: structuredClone(wk.part2)
			}
		})

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
		const previousValue = getSlotValue(prevDraft, role === '사이드' ? { part, role, index } : { part, role })
		if (previousValue === trimmedValue) return
		set((s) => {
			const next = structuredClone(s.currentDraft)
			setSlotValue(next, role === '사이드' ? { part, role, index } : { part, role }, trimmedValue)
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
	moveRole: (rawSource, rawTarget) => {
		const source = normalizeSlot(rawSource)
		const target = normalizeSlot(rawTarget)
		if (!source || !target) return
		if (slotsAreEqual(source, target)) return

		const draft = structuredClone(get().currentDraft)
		const sourceValue = getSlotValue(draft, source)
		if (!sourceValue) return
		const targetValue = getSlotValue(draft, target)

		setSlotValue(draft, target, sourceValue)
		setSlotValue(draft, source, targetValue ?? '')

		set({ currentDraft: draft })

		const addActivity = get().addActivity
		const sourceLabel = slotToLabel(source)
		const targetLabel = slotToLabel(target)

		addActivity({
			type: 'assignment',
			title: '역할 이동',
			description: `변경: ${sourceValue} 역할 이동 (${sourceLabel} → ${targetLabel})`,
			meta: { action: 'move', source, target, name: sourceValue, swapped: Boolean(targetValue) }
		})

		if (targetValue) {
			const reverseSource = target
			const reverseTarget = source
			const reverseSourceLabel = slotToLabel(reverseSource)
			const reverseTargetLabel = slotToLabel(reverseTarget)
			addActivity({
				type: 'assignment',
				title: '역할 이동',
				description: `변경: ${targetValue} 역할 이동 (${reverseSourceLabel} → ${reverseTargetLabel})`,
				meta: { action: 'move', source: reverseSource, target: reverseTarget, name: targetValue, swapped: true }
			})
		}

		get().recalcWarnings()
	},
	clearRole: (part, role, index) => {
		const prevDraft = get().currentDraft
		const previousValue = getSlotValue(prevDraft, role === '사이드' ? { part, role, index } : { part, role })
		if (!previousValue) return
		set((s) => {
			const next = structuredClone(s.currentDraft)
			setSlotValue(next, role === '사이드' ? { part, role, index } : { part, role }, '')
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
		const persistedDraft = normalizeDraftForPersist(s.currentDraft)
		const merged: WeekData = { ...baseWeek, ...persistedDraft } // absences 유지
		return { ...baseApp, weeks: { ...baseApp.weeks, [date]: merged } }
	},
	setDraft: (draft) => {
		set({ currentDraft: draft })
		get().addActivity({
			type: 'assignment',
			title: 'AI 제안 적용',
			description: '자동 배정 제안을 적용했습니다',
			meta: { action: 'ai-suggestion' }
		})
		get().recalcWarnings()
	},
	recalcWarnings: () =>
		set((s) => ({ warnings: s.currentWeekDate ? computeWarnings(s.currentWeekDate, s.currentDraft, s.app) : [] })),
	finalizeCurrentWeek: () => {
		const state = get()
		if (!state.currentWeekDate) return
		const date = state.currentWeekDate

		const baseCheck = state.app.weeks[date] ?? { part1: emptyPart(), part2: emptyPart(), absences: [] }
		const persistedDraftCheck = normalizeDraftForPersist(state.currentDraft)

		if (
			JSON.stringify(baseCheck.part1) === JSON.stringify(persistedDraftCheck.part1) &&
			JSON.stringify(baseCheck.part2) === JSON.stringify(persistedDraftCheck.part2)
		) {
			return
		}

		set((s) => {
			const base: WeekData = s.app.weeks[date] ?? { part1: emptyPart(), part2: emptyPart(), absences: [] }
			const persistedDraft = normalizeDraftForPersist(s.currentDraft)
			const nextWeeks = { ...s.app.weeks, [date]: { ...base, ...persistedDraft } }
			return { app: { ...s.app, weeks: nextWeeks } }
		})
		const nextState = get()
		const totalAssigned = countAssignedRoles(nextState.currentDraft.part1) + countAssignedRoles(nextState.currentDraft.part2)
		get().addActivity({
			type: 'finalize',
			title: `${formatWeekLabel(date)} 주차 확정`,
			description: `총 ${totalAssigned}명 배정 저장`,
			meta: { date, totalAssigned }
		})
	}
})
