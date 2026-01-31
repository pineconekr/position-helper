import { neon } from '@neondatabase/serverless'
import { verifyAuth, unauthorizedResponse } from './utils/auth'

export default async (req: Request) => {
  // 인증 확인
  const auth = await verifyAuth(req)
  if (!auth.valid) {
    return unauthorizedResponse(auth.error)
  }

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
