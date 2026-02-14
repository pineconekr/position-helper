import { ZMembersEntry, ZWeekData, type AppData, type WeekData } from '@/shared/types'
import { toRaw } from 'vue'

type MergeStrategy = 'overwrite' | 'merge_incoming' | 'merge_existing'

export interface ExportOptions {
    includeMembers: boolean
    includeWeeks: boolean
    weekRange?: { start: string; end: string }
}

export type ImportIssueLevel = 'error' | 'warning'
export interface ImportValidationIssue {
    level: ImportIssueLevel
    field: string
    message: string
}

export interface ImportValidationResult {
    data: Partial<AppData> | null
    issues: ImportValidationIssue[]
    hasBlockingError: boolean
}

/**
 * Filter AppData based on export options
 */
export function filterDataForExport(data: AppData, options: ExportOptions): Partial<AppData> {
    const result: Partial<AppData> = {}

    if (options.includeMembers) {
        result.members = structuredClone(toRaw(data.members))
    }

    if (options.includeWeeks) {
        const allWeeks = data.weeks
        const filteredWeeks: Record<string, WeekData> = {}
        const { start, end } = options.weekRange || { start: '0000-00-00', end: '9999-12-31' }

        Object.keys(allWeeks).forEach(date => {
            if (date >= start && date <= end) {
                filteredWeeks[date] = structuredClone(toRaw(allWeeks[date]))
            }
        })
        result.weeks = filteredWeeks
    }

    return result
}

/**
 * Merge two AppData objects based on strategy
 */
export function mergeAppData(current: AppData, incoming: Partial<AppData>, strategy: MergeStrategy): AppData {
    // 1. Overwrite: Just return incoming (with fallbacks if partial)
    if (strategy === 'overwrite') {
        return {
            members: incoming.members ?? [], // Overwrite members if present, else empty
            weeks: incoming.weeks ?? {}      // Overwrite weeks if present, else empty
        }
    }

    // 2. Merge Logic
    const result = structuredClone(toRaw(current))

    // Merge Members
    if (incoming.members) {
        const currentMap = new Map(result.members.map(m => [m.name, m]))

        incoming.members.forEach(m => {
            if (currentMap.has(m.name)) {
                // Conflict
                if (strategy === 'merge_incoming') {
                    // Update existing
                    const index = result.members.findIndex(x => x.name === m.name)
                    if (index !== -1) result.members[index] = m
                }
            } else {
                // New member
                result.members.push(m)
            }
        })
    }

    // Merge Weeks
    if (incoming.weeks) {
        Object.entries(incoming.weeks).forEach(([date, weekData]) => {
            if (result.weeks[date]) {
                // Conflict
                if (strategy === 'merge_incoming') {
                    result.weeks[date] = weekData
                }
            } else {
                // New week
                result.weeks[date] = weekData
            }
        })
    }

    return result
}

/**
 * Download JSON file
 */
export function downloadJson(data: unknown, filename: string) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

function formatZodIssues(prefix: string, issues: Array<{ path: (string | number)[]; message: string }>): ImportValidationIssue[] {
    return issues.map((issue) => ({
        level: 'error',
        field: `${prefix}${issue.path.length > 0 ? `.${issue.path.join('.')}` : ''}`,
        message: issue.message
    }))
}

export function validateImportPayload(payload: unknown): ImportValidationResult {
    const issues: ImportValidationIssue[] = []

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return {
            data: null,
            issues: [{ level: 'error', field: 'root', message: 'JSON 최상위는 객체여야 합니다.' }],
            hasBlockingError: true
        }
    }

    const raw = payload as Record<string, unknown>
    const hasMembers = Object.prototype.hasOwnProperty.call(raw, 'members')
    const hasWeeks = Object.prototype.hasOwnProperty.call(raw, 'weeks')

    if (!hasMembers && !hasWeeks) {
        return {
            data: null,
            issues: [{ level: 'error', field: 'root', message: '`members` 또는 `weeks` 필드가 필요합니다.' }],
            hasBlockingError: true
        }
    }

    const normalized: Partial<AppData> = {}

    if (hasMembers) {
        if (!Array.isArray(raw.members)) {
            issues.push({ level: 'error', field: 'members', message: '`members`는 배열이어야 합니다.' })
        } else {
            const uniqueMembers = new Map<string, AppData['members'][number]>()
            raw.members.forEach((candidate, idx) => {
                const parsed = ZMembersEntry.safeParse(candidate)
                if (!parsed.success) {
                    issues.push(...formatZodIssues(`members[${idx}]`, parsed.error.issues))
                    return
                }
                const member = {
                    ...parsed.data,
                    name: parsed.data.name.trim(),
                    notes: parsed.data.notes?.trim() || undefined
                }
                if (!member.name) {
                    issues.push({ level: 'error', field: `members[${idx}].name`, message: '이름은 비어 있을 수 없습니다.' })
                    return
                }
                if (uniqueMembers.has(member.name)) {
                    issues.push({
                        level: 'warning',
                        field: `members[${idx}].name`,
                        message: `중복 멤버 '${member.name}'은 마지막 항목으로 덮어씁니다.`
                    })
                }
                uniqueMembers.set(member.name, member)
            })
            normalized.members = Array.from(uniqueMembers.values())
        }
    }

    if (hasWeeks) {
        if (!raw.weeks || typeof raw.weeks !== 'object' || Array.isArray(raw.weeks)) {
            issues.push({ level: 'error', field: 'weeks', message: '`weeks`는 객체여야 합니다.' })
        } else {
            const weekEntries = raw.weeks as Record<string, unknown>
            const sanitizedWeeks: Record<string, WeekData> = {}
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/
            Object.entries(weekEntries).forEach(([date, candidate]) => {
                if (!dateRegex.test(date)) {
                    issues.push({ level: 'error', field: `weeks.${date}`, message: '키는 YYYY-MM-DD 형식이어야 합니다.' })
                    return
                }
                const parsed = ZWeekData.safeParse(candidate)
                if (!parsed.success) {
                    issues.push(...formatZodIssues(`weeks.${date}`, parsed.error.issues))
                    return
                }
                sanitizedWeeks[date] = parsed.data
            })
            normalized.weeks = sanitizedWeeks
        }
    }

    const hasBlockingError = issues.some((issue) => issue.level === 'error')
    return {
        data: hasBlockingError ? null : normalized,
        issues,
        hasBlockingError
    }
}
