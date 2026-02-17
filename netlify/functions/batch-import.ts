import { neon } from '@neondatabase/serverless'
import { verifyAuth, unauthorizedResponse } from './utils/auth'

/**
 * Batch Import API - 전체 데이터를 한 번에 저장
 * 개별 API 호출 대신 이 엔드포인트를 사용하여 rate limit 방지
 *
 * [개선] 트랜잭션 + 입력 검증
 */

type IncomingMember = { name: string; active?: boolean; notes?: string; generation?: number }
type NormalizedMember = { name: string; active: boolean; notes: string; generation: number | null }
type NormalizedWeek = { week_date: string; data: unknown }

function isIncomingMember(value: unknown): value is IncomingMember {
    if (typeof value !== 'object' || value === null) return false

    const member = value as Record<string, unknown>
    return (
        typeof member.name === 'string' &&
        member.name.trim() !== '' &&
        (member.active === undefined || typeof member.active === 'boolean') &&
        (member.notes === undefined || typeof member.notes === 'string') &&
        (member.generation === undefined || typeof member.generation === 'number')
    )
}

// 입력 데이터 검증
function validateMembers(members: unknown): members is IncomingMember[] {
    if (!Array.isArray(members)) return false
    return members.every(isIncomingMember)
}

function validateWeeks(weeks: unknown): weeks is Record<string, unknown> {
    if (typeof weeks !== 'object' || weeks === null) return false
    return Object.keys(weeks).every(key => /^\d{4}-\d{2}-\d{2}$/.test(key))
}

function normalizeMembers(members: IncomingMember[]): NormalizedMember[] {
    return members.map((member) => ({
        name: member.name.trim(),
        active: member.active ?? true,
        notes: member.notes ?? '',
        generation: typeof member.generation === 'number' ? member.generation : null
    }))
}

function normalizeWeeks(weeks: Record<string, unknown>): NormalizedWeek[] {
    return Object.entries(weeks).map(([week_date, data]) => ({ week_date, data }))
}

export default async (req: Request) => {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
    }

    // 인증 확인
    const auth = await verifyAuth(req)
    if (!auth.valid) {
        return unauthorizedResponse(auth.error)
    }

    let body: { members?: unknown; weeks?: unknown }
    try {
        body = await req.json()
    } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 })
    }

    const { members, weeks } = body

    // 입력 검증
    if (members !== undefined && !validateMembers(members)) {
        return new Response(JSON.stringify({ error: 'Invalid members format' }), { status: 400 })
    }
    if (weeks !== undefined && !validateWeeks(weeks)) {
        return new Response(JSON.stringify({ error: 'Invalid weeks format (expected YYYY-MM-DD keys)' }), { status: 400 })
    }

    const sql = neon(process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL!)

    try {
        const normalizedMembers = members && Array.isArray(members) ? normalizeMembers(members) : []
        const normalizedWeeks = weeks && typeof weeks === 'object' ? normalizeWeeks(weeks) : []
        const membersImported = normalizedMembers.length
        const weeksImported = normalizedWeeks.length

        await sql`BEGIN`
        try {
            // Members 벌크 UPSERT
            if (normalizedMembers.length > 0) {
                await sql`
                    INSERT INTO members (name, active, notes, generation)
                    SELECT
                        m.name,
                        m.active,
                        m.notes,
                        m.generation
                    FROM jsonb_to_recordset(${JSON.stringify(normalizedMembers)}::jsonb) AS m(
                        name text,
                        active boolean,
                        notes text,
                        generation integer
                    )
                    ON CONFLICT (name) DO UPDATE SET
                        active = EXCLUDED.active,
                        notes = EXCLUDED.notes,
                        generation = EXCLUDED.generation
                `
            }

            // Weeks 벌크 UPSERT
            if (normalizedWeeks.length > 0) {
                await sql`
                    INSERT INTO weeks (week_date, data)
                    SELECT
                        w.week_date::date,
                        w.data::jsonb
                    FROM jsonb_to_recordset(${JSON.stringify(normalizedWeeks)}::jsonb) AS w(
                        week_date text,
                        data jsonb
                    )
                    ON CONFLICT (week_date) DO UPDATE SET data = EXCLUDED.data
                `
            }

            await sql`COMMIT`
        } catch (txError) {
            await sql`ROLLBACK`
            throw txError
        }

        return new Response(JSON.stringify({
            success: true,
            imported: {
                members: membersImported,
                weeks: weeksImported
            }
        }), {
            headers: { 'Content-Type': 'application/json' }
        })

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        console.error('Batch import error:', message)
        return new Response(JSON.stringify({
            error: 'Import failed',
            details: message
        }), { status: 500 })
    }
}
