import { NextRequest, NextResponse } from 'next/server'
import { verifyUserPassword, createSession } from '@/lib/userStore'

export async function POST(req: NextRequest) {
  const { username, password } = await req.json()
  if (!username || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  const user = verifyUserPassword(username, password)
  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }
  const token = createSession(user.id)
  const res = NextResponse.json({ ok: true })
  res.cookies.set('session', token, { httpOnly: true, path: '/' })
  return res
}
