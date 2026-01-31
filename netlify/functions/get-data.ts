import { neon } from '@neondatabase/serverless'
import { verifyAuth, unauthorizedResponse } from './utils/auth'

export default async (req: Request) => {
    // 인증 확인
    const auth = await verifyAuth(req)
    if (!auth.valid) {
        return unauthorizedResponse(auth.error)
    }

    const sql = neon(process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL!)

    const members = await sql`SELECT * FROM members ORDER BY name`
    const weeks = await sql`SELECT week_date::text as week_date, data FROM weeks ORDER BY week_date`

    return new Response(JSON.stringify({ members, weeks }), {
        headers: { 'Content-Type': 'application/json' }
    })
}
