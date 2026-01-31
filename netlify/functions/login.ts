import { SignJWT } from 'jose'

const COOKIE_NAME = 'ph_auth'

function getSecret(): Uint8Array {
    const password = process.env.ADMIN_PASSWORD
    if (!password) {
        throw new Error('FATAL: ADMIN_PASSWORD environment variable is not set')
    }
    return new TextEncoder().encode(password)
}

// 브루트포스 공격 완화용 지연 함수
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export default async (req: Request) => {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        })
    }

    const { password } = await req.json()
    const adminPassword = process.env.ADMIN_PASSWORD

    if (!adminPassword) {
        return new Response(JSON.stringify({ error: 'Server configuration error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }

    if (password !== adminPassword) {
        // 🔒 브루트포스 공격 완화: 실패 시 1초 지연
        await delay(1000)
        return new Response(JSON.stringify({ error: 'Invalid password' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        })
    }


    // 비밀번호 일치 → JWT 토큰 생성 (24시간 유효)
    const token = await new SignJWT({ role: 'admin' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(getSecret())

    // HttpOnly 쿠키로 설정
    const cookie = `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`

    return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': cookie
        }
    })
}
