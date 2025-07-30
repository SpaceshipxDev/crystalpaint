import { cookies } from 'next/headers'
import { getUserBySession } from './userStore'

export function getCurrentUser() {
  const token = cookies().get('session')?.value
  if (!token) return null
  return getUserBySession(token)
}
