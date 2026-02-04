import { jwtVerify } from 'jose'

const COOKIE_NAME = 'ph_auth'

export function getSecret(): Uint8Array {
    const secret = process.env.JWT_SECRET
    if (!secret) {
        throw new Error('FATAL: JWT_SECRET environment variable is not set')
    }
    return new TextEncoder().encode(secret)
}

/**
 * 쿠키에서 JWT 토큰을 추출하고 검증합니다.
 * @returns { valid: true } 또는 { valid: false, error: string }
 */
export async function verifyAuth(req: Request): Promise<{ valid: boolean; error?: string }> {
    // Netlify Dev 환경에서만 인증 바이패스 (환경 변수는 위조 불가)
    if (process.env.NETLIFY_DEV === 'true') {
        console.log('🚧 Netlify Dev mode: bypassing auth')
        return { valid: true }
    }

    const cookieHeader = req.headers.get('cookie')

    if (!cookieHeader) {
        return { valid: false, error: 'No cookie header' }
    }

    // 쿠키 파싱
    const cookies = Object.fromEntries(
        cookieHeader.split(';').map(c => {
            const [key, ...val] = c.trim().split('=')
            return [key, val.join('=')]
        })
    )

    const token = cookies[COOKIE_NAME]

    if (!token) {
        return { valid: false, error: 'No auth token' }
    }

    try {
        await jwtVerify(token, getSecret(), { algorithms: ['HS256'] })
        return { valid: true }
    } catch (e) {
        return { valid: false, error: 'Invalid or expired token' }
    }
}


/**
 * 인증 실패 시 반환할 Response
 */
export function unauthorizedResponse(message = 'Unauthorized') {
    return new Response(JSON.stringify({ error: message }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
    })
}
