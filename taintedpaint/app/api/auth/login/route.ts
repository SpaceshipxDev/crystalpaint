import { NextRequest, NextResponse } from 'next/server'
import { verifyUser, createSession } from '@/lib/userStore'

export async function POST(req: NextRequest) {
  const { username, password } = await req.json().catch(() => ({})) as { username?: string, password?: string }
  if (!username || !password) {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 400 })
  }
  const user = verifyUser(username, password)
  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }
  const token = createSession(user.id)
  const res = NextResponse.json({ ok: true })
  res.cookies.set('session', token, { httpOnly: true, path: '/' })
  return res
}
