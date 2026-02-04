import { neon } from '@neondatabase/serverless'
import { verifyAuth, unauthorizedResponse } from './utils/auth'

export default async (req: Request) => {
    if (req.method !== 'GET') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
    }

    // 인증 확인
    const auth = await verifyAuth(req)
    if (!auth.valid) {
        return unauthorizedResponse(auth.error)
    }

    const sql = neon(process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL!)

    // generation 컬럼 포함하여 조회
    const members = await sql`SELECT name, active, notes, generation FROM members ORDER BY name`
    const weeks = await sql`SELECT week_date::text as week_date, data FROM weeks ORDER BY week_date`

    return new Response(JSON.stringify({ members, weeks }), {
        headers: { 'Content-Type': 'application/json' }
    })
}
