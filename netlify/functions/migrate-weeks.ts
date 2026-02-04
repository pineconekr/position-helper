import { neon } from '@neondatabase/serverless'
import { verifyAuth, unauthorizedResponse } from './utils/auth'

/**
 * 🔄 DB Migration: Weeks JSONB Data
 * 
 * weeks 테이블의 JSONB 데이터 내 이름 형식을 정규화합니다.
 * "20 박예" → "박예"
 * 
 * ⚠️ 1회성 마이그레이션 스크립트입니다. 실행 후 삭제하세요.
 * 
 * 실행 방법: POST /.netlify/functions/migrate-weeks
 */

const LEGACY_NAME_PATTERN = /^(\d+)\s+(.+)$/

function normalizeName(name: string): string {
    if (!name) return name
    const match = name.match(LEGACY_NAME_PATTERN)
    return match ? match[2].trim() : name
}

interface WeekData {
    part1: {
        SW: string
        자막: string
        고정: string
        사이드: [string, string]
        스케치: string
    }
    part2: {
        SW: string
        자막: string
        고정: string
        사이드: [string, string]
        스케치: string
    }
    absences: Array<{ name: string; reason?: string }>
}

function migrateWeekData(data: WeekData): WeekData {
    const migratePart = (part: WeekData['part1']) => ({
        SW: normalizeName(part.SW),
        자막: normalizeName(part.자막),
        고정: normalizeName(part.고정),
        사이드: [normalizeName(part.사이드[0]), normalizeName(part.사이드[1])] as [string, string],
        스케치: normalizeName(part.스케치)
    })

    return {
        part1: migratePart(data.part1),
        part2: migratePart(data.part2),
        absences: data.absences.map(a => ({
            name: normalizeName(a.name),
            reason: a.reason
        }))
    }
}

export default async (req: Request) => {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed. Use POST.' }), { status: 405 })
    }

    // 인증 확인
    const auth = await verifyAuth(req)
    if (!auth.valid) {
        return unauthorizedResponse(auth.error)
    }

    const sql = neon(process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL!)

    const result = {
        total: 0,
        migrated: 0,
        skipped: 0,
        errors: [] as string[]
    }

    try {
        // 모든 weeks 조회
        const weeks = await sql`SELECT week_date::text as week_date, data FROM weeks`
        result.total = weeks.length

        console.log(`📊 Found ${weeks.length} weeks to migrate`)

        for (const week of weeks) {
            const weekDate = week.week_date as string
            const data = week.data as WeekData

            try {
                // 항상 마이그레이션 시도 (이미 정규화된 이름은 그대로 반환됨)
                const migratedData = migrateWeekData(data)

                // 변경 여부 확인
                const originalStr = JSON.stringify(data)
                const migratedStr = JSON.stringify(migratedData)

                if (originalStr === migratedStr) {
                    result.skipped++
                    continue
                }

                // DB 업데이트
                await sql`
                    UPDATE weeks 
                    SET data = ${JSON.stringify(migratedData)}::jsonb
                    WHERE week_date = ${weekDate}::date
                `

                result.migrated++
                console.log(`✅ Migrated week: ${weekDate}`)

            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : 'Unknown error'
                result.errors.push(`Failed to migrate week "${weekDate}": ${msg}`)
                console.error(`❌ Error migrating week "${weekDate}":`, msg)
            }
        }

        return new Response(JSON.stringify({
            success: true,
            message: `Weeks migration completed: ${result.migrated} migrated, ${result.skipped} skipped`,
            result
        }, null, 2), {
            headers: { 'Content-Type': 'application/json' }
        })

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        console.error('❌ Weeks migration failed:', message)
        return new Response(JSON.stringify({
            success: false,
            error: 'Migration failed',
            details: message,
            partialResult: result
        }), { status: 500 })
    }
}
