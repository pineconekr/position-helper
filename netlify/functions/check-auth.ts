import { jwtVerify } from 'jose'

const COOKIE_NAME = 'ph_auth'

function getSecret(): Uint8Array {
    const password = process.env.ADMIN_PASSWORD
    if (!password) {
        throw new Error('FATAL: ADMIN_PASSWORD environment variable is not set')
    }
    return new TextEncoder().encode(password)
}

export default async (req: Request) => {
    const cookieHeader = req.headers.get('cookie')

    if (!cookieHeader) {
        return new Response(JSON.stringify({ authenticated: false }), {
            headers: { 'Content-Type': 'application/json' }
        })
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
        return new Response(JSON.stringify({ authenticated: false }), {
            headers: { 'Content-Type': 'application/json' }
        })
    }

    try {
        await jwtVerify(token, getSecret())
        return new Response(JSON.stringify({ authenticated: true }), {
            headers: { 'Content-Type': 'application/json' }
        })
    } catch {
        return new Response(JSON.stringify({ authenticated: false }), {
            headers: { 'Content-Type': 'application/json' }
        })
    }
}
