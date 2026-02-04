// 클라이언트 API wrapper - Netlify Functions 호출
import type { AppData, MembersEntry, WeekData } from '@/shared/types'

const API_BASE = '/.netlify/functions'

// API 응답 타입 정의
interface DbMemberRow {
    name: string
    active: boolean
    notes: string
    generation?: string
}

interface DbWeekRow {
    week_date: string
    data: WeekData
}

interface GetDataResponse {
    members: DbMemberRow[]
    weeks: DbWeekRow[]
}

export async function getAllData(): Promise<AppData> {
    const res = await fetch(`${API_BASE}/get-data`)
    if (!res.ok) {
        throw new Error(`Failed to get data: ${res.status}`)
    }

    const data: GetDataResponse = await res.json()

    // 응답 형식 변환
    const appData: AppData = {
        members: data.members.map((m) => ({
            name: m.name,
            active: m.active,
            notes: m.notes
        })),
        weeks: {}
    }

    data.weeks.forEach((w) => {
        const dateStr = String(w.week_date)
        appData.weeks[dateStr] = w.data
    })

    return appData
}

export async function saveWeekAssignment(date: string, weekData: WeekData): Promise<void> {
    const res = await fetch(`${API_BASE}/save-week`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, weekData })
    })

    if (!res.ok) {
        throw new Error(`Failed to save week: ${res.status}`)
    }
}

export async function updateMember(member: MembersEntry): Promise<void> {
    const res = await fetch(`${API_BASE}/update-member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member })
    })

    if (!res.ok) {
        throw new Error(`Failed to update member: ${res.status}`)
    }
}

export async function initSchema(): Promise<void> {
    const res = await fetch(`${API_BASE}/init-schema`, { method: 'POST' })
    if (!res.ok) {
        throw new Error(`Failed to init schema: ${res.status}`)
    }
}

export async function batchImport(data: AppData): Promise<{ members: number; weeks: number }> {
    const res = await fetch(`${API_BASE}/batch-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            members: data.members,
            weeks: data.weeks
        })
    })

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.details || `Failed to batch import: ${res.status}`)
    }

    const result = await res.json()
    return result.imported
}
