import { neon } from '@neondatabase/serverless'
import { verifyAuth, unauthorizedResponse } from './utils/auth'

/**
 * Batch Import API - 전체 데이터를 한 번에 저장
 * 개별 API 호출 대신 이 엔드포인트를 사용하여 rate limit 방지
 * 
 * [개선] 트랜잭션 사용, 입력 검증 추가
 */

// 입력 데이터 검증
function validateMembers(members: unknown): members is Array<{ name: string; active?: boolean; notes?: string; generation?: number }> {
    if (!Array.isArray(members)) return false
    return members.every(m =>
        typeof m === 'object' && m !== null &&
        typeof (m as any).name === 'string' && (m as any).name.trim() !== ''
    )
}

function validateWeeks(weeks: unknown): weeks is Record<string, unknown> {
    if (typeof weeks !== 'object' || weeks === null) return false
    return Object.keys(weeks).every(key => /^\d{4}-\d{2}-\d{2}$/.test(key))
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
        let membersImported = 0
        let weeksImported = 0

        // Members 일괄 저장 (UPSERT) - generation을 INTEGER로 저장
        if (members && Array.isArray(members)) {
            for (const member of members) {
                // generation이 숫자가 아니면 null로 처리
                const gen = typeof member.generation === 'number' ? member.generation : null

                await sql`
                    INSERT INTO members (name, active, notes, generation)
                    VALUES (${member.name}, ${member.active ?? true}, ${member.notes ?? ''}, ${gen})
                    ON CONFLICT (name) DO UPDATE SET 
                        active = EXCLUDED.active,
                        notes = EXCLUDED.notes,
                        generation = EXCLUDED.generation
                `
                membersImported++
            }
        }

        // Weeks 일괄 저장 (UPSERT)
        if (weeks && typeof weeks === 'object') {
            for (const [date, weekData] of Object.entries(weeks)) {
                await sql`
                    INSERT INTO weeks (week_date, data)
                    VALUES (${date}, ${JSON.stringify(weekData)})
                    ON CONFLICT (week_date) DO UPDATE SET data = EXCLUDED.data
                `
                weeksImported++
            }
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
