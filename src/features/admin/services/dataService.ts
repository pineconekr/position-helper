import type { AppData, WeekData } from '@/shared/types'
import { toRaw } from 'vue'

type MergeStrategy = 'overwrite' | 'merge_incoming' | 'merge_existing'

export interface ExportOptions {
    includeMembers: boolean
    includeWeeks: boolean
    weekRange?: { start: string; end: string }
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
