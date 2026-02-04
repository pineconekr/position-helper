import { neon } from '@neondatabase/serverless'
import { verifyAuth, unauthorizedResponse } from './utils/auth'

/**
 * 🔄 DB Migration: Legacy Name Format → Normalized Structure
 * 
 * 이 스크립트는 기존 "20 박예" 형식의 데이터를
 * { name: "박예", generation: 20 } 형식으로 변환합니다.
 * 
 * ⚠️ 1회성 마이그레이션 스크립트입니다. 실행 후 삭제하세요.
 * 
 * 실행 방법: POST /.netlify/functions/migrate-members
 */

const LEGACY_NAME_PATTERN = /^(\d+)\s+(.+)$/

interface MigrationResult {
    total: number
    migrated: number
    skipped: number
    errors: string[]
    details: Array<{ oldName: string; newName: string; generation: number }>
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

    const result: MigrationResult = {
        total: 0,
        migrated: 0,
        skipped: 0,
        errors: [],
        details: []
    }

    try {
        // 1. 먼저 generation 컬럼이 있는지 확인하고 없으면 추가
        await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS generation INTEGER;`

        // 2. 모든 멤버 조회
        const members = await sql`SELECT name, active, notes, generation FROM members`
        result.total = members.length

        console.log(`📊 Found ${members.length} members to check`)

        for (const member of members) {
            const oldName = member.name as string

            // 이미 마이그레이션된 경우 (generation이 있고, 이름에 숫자 접두사가 없는 경우)
            if (member.generation !== null && !LEGACY_NAME_PATTERN.test(oldName)) {
                result.skipped++
                continue
            }

            // 레거시 형식 검사
            const match = oldName.match(LEGACY_NAME_PATTERN)

            if (match) {
                const generation = parseInt(match[1], 10)
                const newName = match[2].trim()

                try {
                    // 3. 새 이름으로 레코드 생성 (UPSERT)
                    await sql`
                        INSERT INTO members (name, active, notes, generation)
                        VALUES (${newName}, ${member.active}, ${member.notes || ''}, ${generation})
                        ON CONFLICT (name) DO UPDATE SET 
                            active = EXCLUDED.active,
                            notes = EXCLUDED.notes,
                            generation = EXCLUDED.generation
                    `

                    // 4. 이전 레코드 삭제 (이름이 다른 경우에만)
                    if (newName !== oldName) {
                        await sql`DELETE FROM members WHERE name = ${oldName}`
                    }

                    result.migrated++
                    result.details.push({ oldName, newName, generation })
                    console.log(`✅ Migrated: "${oldName}" → "${newName}" (${generation}기)`)

                } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : 'Unknown error'
                    result.errors.push(`Failed to migrate "${oldName}": ${msg}`)
                    console.error(`❌ Error migrating "${oldName}":`, msg)
                }
            } else {
                // 레거시 형식이 아님 - generation만 업데이트 필요한지 확인
                if (member.generation === null) {
                    // generation 없는 경우 0으로 설정
                    await sql`UPDATE members SET generation = 0 WHERE name = ${oldName}`
                    result.migrated++
                    result.details.push({ oldName, newName: oldName, generation: 0 })
                } else {
                    result.skipped++
                }
            }
        }

        // 5. Weeks 테이블의 JSONB 데이터도 마이그레이션 (선택적)
        // 이 부분은 복잡할 수 있으므로 별도 처리 권장
        const weeksNote = 'weeks 테이블의 역할 배정 데이터(part1, part2)에 저장된 이름은 자동 변환되지 않습니다. 필요시 별도 마이그레이션을 진행하세요.'

        return new Response(JSON.stringify({
            success: true,
            message: `Migration completed: ${result.migrated} migrated, ${result.skipped} skipped`,
            result,
            note: weeksNote
        }, null, 2), {
            headers: { 'Content-Type': 'application/json' }
        })

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        console.error('❌ Migration failed:', message)
        return new Response(JSON.stringify({
            success: false,
            error: 'Migration failed',
            details: message,
            partialResult: result
        }), { status: 500 })
    }
}
