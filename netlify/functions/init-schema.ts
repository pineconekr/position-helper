import { neon } from '@neondatabase/serverless'
import { verifyAuth, unauthorizedResponse } from './utils/auth'

export default async (req: Request) => {
  // 인증 확인
  const auth = await verifyAuth(req)
  if (!auth.valid) {
    return unauthorizedResponse(auth.error)
  }

  const sql = neon(process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL!)

  await sql`
    CREATE TABLE IF NOT EXISTS members (
      name TEXT PRIMARY KEY,
      active BOOLEAN DEFAULT true,
      notes TEXT
    );
  `
  await sql`
    CREATE TABLE IF NOT EXISTS weeks (
      week_date DATE PRIMARY KEY,
      data JSONB NOT NULL
    );
  `
  await sql`
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      timestamp TIMESTAMPTZ DEFAULT NOW(),
      type TEXT,
      title TEXT,
      description TEXT,
      meta JSONB
    );
  `

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
}
