import HolisticClientPage from './ClientPage'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default function Page() {
  const user = getCurrentUser()
  if (!user) redirect('/login')
  return <HolisticClientPage />
}
