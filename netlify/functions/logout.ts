const COOKIE_NAME = 'ph_auth'

export default async () => {
    // 쿠키를 만료시켜 로그아웃 처리
    const cookie = `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`

    return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': cookie
        }
    })
}
