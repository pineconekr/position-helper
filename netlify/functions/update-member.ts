import { neon } from '@neondatabase/serverless'

export default async (req: Request) => {
  const { member } = await req.json()
  const sql = neon(process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL!)

  await sql`
    INSERT INTO members (name, active, notes)
    VALUES (${member.name}, ${member.active}, ${member.notes || ''})
    ON CONFLICT (name) DO UPDATE SET active = EXCLUDED.active, notes = EXCLUDED.notes
  `

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
}
