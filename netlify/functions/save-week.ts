import { neon } from '@neondatabase/serverless'

export default async (req: Request) => {
  const { date, weekData } = await req.json()
  const sql = neon(process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL!)

  await sql`
    INSERT INTO weeks (week_date, data)
    VALUES (${date}, ${JSON.stringify(weekData)})
    ON CONFLICT (week_date) DO UPDATE SET data = EXCLUDED.data
  `

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
}
