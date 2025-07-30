import { NextRequest, NextResponse } from 'next/server'
import { deleteSession } from '@/lib/userStore'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('session')?.value
  if (token) deleteSession(token)
  const res = NextResponse.json({ ok: true })
  res.cookies.set('session', '', { httpOnly: true, path: '/', maxAge: 0 })
  return res
}
