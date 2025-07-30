import { NextRequest, NextResponse } from 'next/server'
import { createUser, createSession, findUserByUsername } from '@/lib/userStore'

export async function POST(req: NextRequest) {
  const { username, password } = await req.json().catch(() => ({})) as { username?: string, password?: string }
  if (!username || !password) {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 400 })
  }
  if (findUserByUsername(username)) {
    return NextResponse.json({ error: 'User exists' }, { status: 409 })
  }
  const user = createUser(username, password)
  const token = createSession(user.id)
  const res = NextResponse.json({ ok: true })
  res.cookies.set('session', token, { httpOnly: true, path: '/' })
  return res
}
