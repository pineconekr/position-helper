import { jwtVerify } from 'jose'

const COOKIE_NAME = 'ph_auth'

function getSecret(): Uint8Array {
    const password = process.env.ADMIN_PASSWORD
    if (!password) {
        throw new Error('FATAL: ADMIN_PASSWORD environment variable is not set')
    }
    return new TextEncoder().encode(password)
}

/**
 * 쿠키에서 JWT 토큰을 추출하고 검증합니다.
 * @returns { valid: true } 또는 { valid: false, error: string }
 */
export async function verifyAuth(req: Request): Promise<{ valid: boolean; error?: string }> {
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
        await jwtVerify(token, getSecret())
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
