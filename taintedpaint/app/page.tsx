// app.page.tsx 

import KanbanBoard from "@/kanban-board"
import { cookies } from 'next/headers'
import { getUserBySession } from '@/lib/userStore'
import { redirect } from 'next/navigation'

export default function Page() {
  const cookieStore = cookies()
  const token = cookieStore.get('session')?.value
  const user = token ? getUserBySession(token) : null
  if (!user) redirect('/login')
  return <KanbanBoard />
}
