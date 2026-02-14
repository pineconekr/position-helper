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

  const sql = neon(process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL!)

  // Members 테이블 (generation 컬럼 포함)
  await sql`
    CREATE TABLE IF NOT EXISTS members (
      name TEXT PRIMARY KEY,
      active BOOLEAN DEFAULT true,
      notes TEXT,
      generation INTEGER
    );
  `

  // 기존 테이블에 generation 컬럼이 없으면 추가
  await sql`
    ALTER TABLE members ADD COLUMN IF NOT EXISTS generation INTEGER;
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
