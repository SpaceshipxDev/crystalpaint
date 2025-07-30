import { NextRequest, NextResponse } from 'next/server'
import { findUser, createUser, createSession } from '@/lib/userStore'

export async function POST(req: NextRequest) {
  const { username, password } = await req.json()
  if (!username || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  if (findUser(username)) {
    return NextResponse.json({ error: 'User exists' }, { status: 400 })
  }
  const userId = createUser(username, password)
  const token = createSession(userId)
  const res = NextResponse.json({ ok: true })
  res.cookies.set('session', token, { httpOnly: true, path: '/' })
  return res
}
