import { neon } from '@neondatabase/serverless'

export default async () => {
    const sql = neon(process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL!)

    const members = await sql`SELECT * FROM members ORDER BY name`
    const weeks = await sql`SELECT week_date::text as week_date, data FROM weeks ORDER BY week_date`

    return new Response(JSON.stringify({ members, weeks }), {
        headers: { 'Content-Type': 'application/json' }
    })
}
