// 클라이언트 API wrapper - Netlify Functions 호출
import type { AppData, MembersEntry, WeekData } from '@/shared/types'

const API_BASE = '/.netlify/functions'

export async function getAllData(): Promise<AppData> {
    const res = await fetch(`${API_BASE}/get-data`)
    if (!res.ok) {
        throw new Error(`Failed to get data: ${res.status}`)
    }

    const data = await res.json()

    // 응답 형식 변환
    const appData: AppData = {
        members: data.members.map((m: any) => ({
            name: m.name,
            active: m.active,
            notes: m.notes
        })),
        weeks: {}
    }

    data.weeks.forEach((w: any) => {
        const dateStr = String(w.week_date)
        appData.weeks[dateStr] = w.data as WeekData
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
