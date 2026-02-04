import { neon } from '@neondatabase/serverless'

/**
 * Health Check API - DB 연결 상태 확인
 * 
 * - 인증 불필요 (공개 엔드포인트)
 * - SELECT 1로 최소 부하
 * - 응답 시간(latency) 측정
 */
export default async (req: Request) => {
    if (req.method !== 'GET') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
    }

    const start = Date.now()

    try {
        const sql = neon(process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL!)
        await sql`SELECT 1`

        return new Response(JSON.stringify({
            status: 'ok',
            db: 'connected',
            latency: Date.now() - start
        }), {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store'
            }
        })
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return new Response(JSON.stringify({
            status: 'error',
            db: 'disconnected',
            error: message,
            latency: Date.now() - start
        }), {
            status: 503,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store'
            }
        })
    }
}
