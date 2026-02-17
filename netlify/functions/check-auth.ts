import { verifyAuth } from './utils/auth'

export default async (req: Request) => {
    const auth = await verifyAuth(req)
    return new Response(JSON.stringify({ authenticated: auth.valid }), {
        headers: { 'Content-Type': 'application/json' }
    })
}
