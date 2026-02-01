import { neon } from '@neondatabase/serverless'
import { verifyAuth, unauthorizedResponse } from './utils/auth'

export default async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  // 인증 확인
  const auth = await verifyAuth(req)
  if (!auth.valid) {
    return unauthorizedResponse(auth.error)
  }

  const { member } = await req.json()

  if (!member || !member.name) {
    return new Response(JSON.stringify({ error: 'Invalid member data' }), { status: 400 })
  }
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
