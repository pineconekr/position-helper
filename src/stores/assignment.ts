import { defineStore } from 'pinia'
import { ref, computed, toRaw } from 'vue'
import type { AppData, MembersEntry, PartAssignment, WeekData, Warning } from '@/shared/types'
import type { SlotDescriptor } from '@/shared/utils/assignment'
import { slotToLabel, BLANK_ROLE_VALUE } from '@/shared/utils/assignment'
import { getSlotValue, normalizeSlot, setSlotValue, slotsAreEqual } from '@/shared/domain/assignment/slot'
import { formatDateISO } from '@/shared/utils/date'
import { computeWarnings } from '@/shared/utils/rules'
import { useActivityStore, normalizeReason, normalizeText } from './activity'
import * as api from '@/api/db'
import { DUMMY_DATA } from '@/shared/data/dummy'

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
    const clone = structuredClone(toRaw(draft))
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

// Undo 히스토리 항목 타입
type DraftHistoryEntry = {
    draft: { part1: PartAssignment; part2: PartAssignment }
    activityId?: string
}

const MAX_HISTORY = 20
const initial: AppData = { weeks: {}, members: [] }

export const useAssignmentStore = defineStore('assignment', () => {
    const activityStore = useActivityStore()

    // State (reactive mutation for compatibility)
    const app = ref<AppData>(structuredClone(initial))
    const currentWeekDate = ref<string>(formatDateISO(new Date()))
    const currentDraft = ref<{ part1: PartAssignment; part2: PartAssignment }>({
        part1: emptyPart(),
        part2: emptyPart()
    })
    const warnings = ref<Warning[]>([])
    const draftHistory = ref<DraftHistoryEntry[]>([])
    const skipNextDbLoad = ref(false) // Import 직후 loadFromDb 방지용

    const canUndo = computed(() => draftHistory.value.length > 0)

    // Actions
    function recalcWarnings() {
        warnings.value = currentWeekDate.value
            ? computeWarnings(currentWeekDate.value, currentDraft.value, app.value)
            : []
    }

    function setWeekDate(date: string) {
        if (currentWeekDate.value) {
            finalizeCurrentWeek()
        }

        const wk = app.value.weeks[date] ?? { part1: emptyPart(), part2: emptyPart(), absences: [] }
        currentWeekDate.value = date
        currentDraft.value = {
            part1: structuredClone(toRaw(wk.part1)),
            part2: structuredClone(toRaw(wk.part2))
        }
        recalcWarnings()
    }

    function setMembers(members: MembersEntry[]) {
        const prevMembers = app.value.members
        const prevMap = new Map(prevMembers.map((m) => [m.name, m]))
        const nextMap = new Map(members.map((m) => [m.name, m]))
        const added = members.filter((m) => !prevMap.has(m.name))
        const removed = prevMembers.filter((m) => !nextMap.has(m.name))
        const notesChanged = members.filter((m) => {
            const prev = prevMap.get(m.name)
            if (!prev) return false
            return normalizeText(prev.notes) !== normalizeText(m.notes)
        })

        app.value.members = members

        added.forEach((m) => {
            activityStore.addActivity({
                type: 'member',
                title: `${m.name}`,
                description: '팀원 추가',
                meta: { action: 'add', member: m }
            })
        })
        removed.forEach((m) => {
            activityStore.addActivity({
                type: 'member',
                title: `${m.name}`,
                description: '팀원 삭제',
                meta: { action: 'remove', member: m }
            })
        })
        notesChanged.forEach((m) => {
            const prev = prevMap.get(m.name)
            activityStore.addActivity({
                type: 'member',
                title: `${m.name}`,
                description: `메모 수정: ${normalizeText(prev?.notes) || '없음'} → ${normalizeText(m.notes) || '없음'}`,
                meta: { action: 'note-update', before: prev?.notes, after: m.notes }
            })
        })
        syncToDb()
    }

    function toggleMemberActive(name: string) {
        const member = app.value.members.find((m) => m.name === name)
        if (!member) return

        member.active = !member.active

        activityStore.addActivity({
            type: 'member',
            title: `${member.name}`,
            description: member.active ? '활성화' : '비활성화',
            meta: { action: 'toggle-active', active: member.active }
        })
        syncToDb()
    }

    function setMembersActive(names: string[], active: boolean) {
        let count = 0
        names.forEach(name => {
            const member = app.value.members.find(m => m.name === name)
            if (member && member.active !== active) {
                member.active = active
                count++
            }
        })

        if (count > 0) {
            activityStore.addActivity({
                type: 'member',
                title: `${count}명 상태 변경`,
                description: `${count}명 ${active ? '활성화' : '비활성화'}`,
                meta: { action: 'bulk-active', count, active }
            })
            syncToDb()
        }

        return count
    }

    function loadWeekToDraft(date: string) {
        const wk = app.value.weeks[date] ?? { part1: emptyPart(), part2: emptyPart(), absences: [] }
        currentWeekDate.value = date
        currentDraft.value = { part1: structuredClone(toRaw(wk.part1)), part2: structuredClone(toRaw(wk.part2)) }
        recalcWarnings()
    }

    function assignRole(part: 'part1' | 'part2', role: keyof PartAssignment, value: string, index?: 0 | 1) {
        const trimmedValue = value.trim()
        const prevDraft = structuredClone(toRaw(currentDraft.value))
        const slot = role === '사이드' ? { part, role, index } : { part, role }
        const previousValue = getSlotValue(prevDraft, slot)
        if (previousValue === trimmedValue) return

        // 히스토리에 저장
        draftHistory.value = [...draftHistory.value, { draft: prevDraft }].slice(-MAX_HISTORY)

        // Mutation 방식으로 업데이트 (Vue reactivity 호환)
        setSlotValue(currentDraft.value, slot, trimmedValue)

        const title = `${partLabel(part)} ${roleLabel(role)}`
        const description = previousValue
            ? `${previousValue} → ${trimmedValue || '비어 있음'}`
            : `${trimmedValue || '비어 있음'} 배정`
        activityStore.addActivity({
            type: 'assignment',
            title,
            description,
            meta: { part, role, index, before: previousValue, after: trimmedValue }
        })
        recalcWarnings()
    }

    function moveRole(rawSource: SlotDescriptor, rawTarget: SlotDescriptor) {
        const source = normalizeSlot(rawSource)
        const target = normalizeSlot(rawTarget)
        if (!source || !target) return
        if (slotsAreEqual(source, target)) return

        const prevDraft = structuredClone(toRaw(currentDraft.value))
        const sourceValue = getSlotValue(prevDraft, source)
        if (!sourceValue) return
        const targetValue = getSlotValue(prevDraft, target)

        // 히스토리에 저장
        draftHistory.value = [...draftHistory.value, { draft: prevDraft }].slice(-MAX_HISTORY)

        // Mutation으로 스왑 실행
        setSlotValue(currentDraft.value, target, sourceValue)
        setSlotValue(currentDraft.value, source, targetValue ?? '')

        const sourceLabel = slotToLabel(source)
        const targetLabel = slotToLabel(target)

        activityStore.addActivity({
            type: 'assignment',
            title: '역할 이동',
            description: `변경: ${sourceValue} 역할 이동 (${sourceLabel} → ${targetLabel})`,
            meta: { action: 'move', source, target, name: sourceValue, swapped: Boolean(targetValue) }
        })

        if (targetValue) {
            activityStore.addActivity({
                type: 'assignment',
                title: '역할 이동',
                description: `변경: ${targetValue} 역할 이동 (${targetLabel} → ${sourceLabel})`,
                meta: { action: 'move', source: target, target: source, name: targetValue, swapped: true }
            })
        }

        recalcWarnings()
    }

    function clearRole(part: 'part1' | 'part2', role: keyof PartAssignment, index?: 0 | 1) {
        const prevDraft = structuredClone(toRaw(currentDraft.value))
        const slot = role === '사이드' ? { part, role, index } : { part, role }
        const previousValue = getSlotValue(prevDraft, slot)
        if (!previousValue) return

        // 히스토리에 저장
        draftHistory.value = [...draftHistory.value, { draft: prevDraft }].slice(-MAX_HISTORY)

        setSlotValue(currentDraft.value, slot, '')

        activityStore.addActivity({
            type: 'assignment',
            title: `${partLabel(part)} ${roleLabel(role)}`,
            description: `${previousValue} 배정 해제`,
            meta: { part, role, index, before: previousValue, after: '' }
        })
        recalcWarnings()
    }

    function updateAbsences(date: string, absences: WeekData['absences']) {
        const prevAbsences = structuredClone(toRaw(app.value.weeks[date]?.absences ?? []))
        const prevMap = new Map(prevAbsences.map((a) => [a.name, normalizeReason(a.reason)]))
        const nextMap = new Map(absences.map((a) => [a.name, normalizeReason(a.reason)]))
        const added = absences.filter((a) => !prevMap.has(a.name))
        const removed = prevAbsences.filter((a) => !nextMap.has(a.name))
        const updated = absences.filter((a) => {
            const prevReason = prevMap.get(a.name)
            if (prevReason === undefined) return false
            return prevReason !== normalizeReason(a.reason)
        })

        // Mutation으로 업데이트
        if (!app.value.weeks[date]) {
            app.value.weeks[date] = { part1: emptyPart(), part2: emptyPart(), absences: [] }
        }
        app.value.weeks[date].absences = absences

        const label = formatWeekLabel(date)
        added.forEach((a) => {
            activityStore.addActivity({
                type: 'absence',
                title: `${label} 불참자`,
                description: `${a.name} 추가${a.reason ? ` (${normalizeReason(a.reason)})` : ''}`,
                meta: { action: 'add', date, absence: a }
            })
        })
        removed.forEach((a) => {
            activityStore.addActivity({
                type: 'absence',
                title: `${label} 불참자`,
                description: `${a.name} 제거`,
                meta: { action: 'remove', date, absence: a }
            })
        })
        updated.forEach((a) => {
            activityStore.addActivity({
                type: 'absence',
                title: `${label} 불참자`,
                description: `${a.name} 사유 변경: ${prevMap.get(a.name) || '없음'} → ${normalizeReason(a.reason) || '없음'}`,
                meta: { action: 'update', date, absence: a, before: prevMap.get(a.name) }
            })
        })
        syncToDb()
    }

    function importData(data: AppData) {
        app.value = structuredClone(toRaw(data))
        currentDraft.value = { part1: emptyPart(), part2: emptyPart() }
        warnings.value = []

        // Import 후 다른 페이지에서 loadFromDb 호출 방지
        skipNextDbLoad.value = true

        const date = currentWeekDate.value
        if (date && data.weeks[date]) {
            loadWeekToDraft(date)
        }
    }

    function exportData(): AppData {
        const date = currentWeekDate.value
        if (!date) return app.value

        const baseWeek: WeekData = app.value.weeks[date] ?? { part1: emptyPart(), part2: emptyPart(), absences: [] }
        const persistedDraft = normalizeDraftForPersist(currentDraft.value)
        const merged: WeekData = { ...baseWeek, ...persistedDraft }
        return { ...app.value, weeks: { ...app.value.weeks, [date]: merged } }
    }

    function setDraft(draft: { part1: PartAssignment; part2: PartAssignment }) {
        currentDraft.value = draft
        activityStore.addActivity({
            type: 'assignment',
            title: 'AI 제안 적용',
            description: '자동 배정 제안을 적용했습니다',
            meta: { action: 'ai-suggestion' }
        })
        recalcWarnings()
    }

    function finalizeCurrentWeek() {
        if (!currentWeekDate.value) return
        const date = currentWeekDate.value

        const base = app.value.weeks[date] ?? { part1: emptyPart(), part2: emptyPart(), absences: [] }
        const persistedDraft = normalizeDraftForPersist(currentDraft.value)

        if (
            JSON.stringify(base.part1) === JSON.stringify(persistedDraft.part1) &&
            JSON.stringify(base.part2) === JSON.stringify(persistedDraft.part2)
        ) {
            return
        }

        // Mutation으로 저장
        if (!app.value.weeks[date]) {
            app.value.weeks[date] = { part1: emptyPart(), part2: emptyPart(), absences: [] }
        }
        app.value.weeks[date] = { ...app.value.weeks[date], ...persistedDraft }

        const totalAssigned = countAssignedRoles(currentDraft.value.part1) + countAssignedRoles(currentDraft.value.part2)
        activityStore.addActivity({
            type: 'finalize',
            title: `${formatWeekLabel(date)} 주차 확정`,
            description: `총 ${totalAssigned}명 배정 저장`,
            meta: { date, totalAssigned }
        })

        syncToDb()
    }

    function undoLastAssignment() {
        if (draftHistory.value.length === 0) return

        const lastEntry = draftHistory.value.pop()
        if (!lastEntry) return

        currentDraft.value = structuredClone(toRaw(lastEntry.draft))

        activityStore.addActivity({
            type: 'assignment',
            title: '실행 취소',
            description: '마지막 배정 작업을 취소했습니다',
            meta: { action: 'undo' }
        })

        recalcWarnings()
    }

    async function loadFromDb() {
        // Import 직후면 DB 로드 스킵 (Import 데이터 유지)
        if (skipNextDbLoad.value) {
            console.log('⏭️ Skipping DB load (import in progress)')
            skipNextDbLoad.value = false
            return
        }

        try {
            const data = await api.getAllData()
            if (data && (data.members.length > 0 || Object.keys(data.weeks).length > 0)) {
                app.value = data
                const date = currentWeekDate.value
                if (date && data.weeks[date]) {
                    const wk = data.weeks[date]
                    currentDraft.value = { part1: structuredClone(toRaw(wk.part1)), part2: structuredClone(toRaw(wk.part2)) }
                }
                recalcWarnings()
            }
        } catch (error) {
            console.error('Failed to load from DB:', error)
        }
    }

    async function syncToDb() {
        try {
            // N+1 문제 해결을 위해 batchImport 사용 (전체 데이터 한 번에 전송)
            const payload = exportData()
            await api.batchImport(payload)
        } catch (error) {
            console.error('Failed to sync to DB:', error)
        }
    }

    /**
     * 강제로 더미 데이터를 로드합니다 (개발/디버그 목적)
     */
    function loadDummyData() {
        console.log('🧪 Force loading dummy data')
        app.value = structuredClone(toRaw(DUMMY_DATA))
        const date = currentWeekDate.value
        if (date && DUMMY_DATA.weeks[date]) {
            const wk = DUMMY_DATA.weeks[date]
            currentDraft.value = { part1: structuredClone(toRaw(wk.part1)), part2: structuredClone(toRaw(wk.part2)) }
        }
        recalcWarnings()
    }

    return {
        // State
        app,
        currentWeekDate,
        currentDraft,
        warnings,
        draftHistory,
        canUndo,
        // Actions
        setWeekDate,
        setMembers,
        toggleMemberActive,
        setMembersActive,
        loadWeekToDraft,
        assignRole,
        moveRole,
        clearRole,
        updateAbsences,
        importData,
        exportData,
        recalcWarnings,
        setDraft,
        finalizeCurrentWeek,
        undoLastAssignment,
        loadFromDb,
        syncToDb,
        loadDummyData
    }
})
