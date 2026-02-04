// 클라이언트 API wrapper - Netlify Functions 호출
import type { AppData, MembersEntry, WeekData } from '@/shared/types'
import { migrateMembers } from '@/shared/utils/member-registry'

const API_BASE = '/.netlify/functions'

// 공통 fetch 옵션 (인증 쿠키 포함)
const fetchOptions: RequestInit = {
    credentials: 'include'
}

// API 응답 타입 정의 (DB에서 오는 raw 데이터)
interface DbMemberRow {
    name: string
    active: boolean
    notes: string
    generation?: number | null
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
    const res = await fetch(`${API_BASE}/get-data`, fetchOptions)
    if (!res.ok) {
        throw new Error(`Failed to get data: ${res.status}`)
    }

    const data: GetDataResponse = await res.json()

    // 응답 형식 변환 + 레거시 마이그레이션
    const appData: AppData = {
        members: migrateMembers(data.members),
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
        ...fetchOptions,
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
        ...fetchOptions,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member })
    })

    if (!res.ok) {
        throw new Error(`Failed to update member: ${res.status}`)
    }
}

export async function initSchema(): Promise<void> {
    const res = await fetch(`${API_BASE}/init-schema`, {
        ...fetchOptions,
        method: 'POST'
    })
    if (!res.ok) {
        throw new Error(`Failed to init schema: ${res.status}`)
    }
}

export async function batchImport(data: AppData): Promise<{ members: number; weeks: number }> {
    const res = await fetch(`${API_BASE}/batch-import`, {
        ...fetchOptions,
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
