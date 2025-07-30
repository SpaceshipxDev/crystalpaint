"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isRegister, setIsRegister] = useState(false)

  const submit = async () => {
    setError('')
    const url = isRegister ? '/api/auth/register' : '/api/auth/login'
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
    if (res.ok) {
      router.push('/')
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Error')
    }
  }

  return (
    <div className="flex flex-col items-center mt-20 space-y-4">
      <h1 className="text-xl font-semibold">{isRegister ? 'Register' : 'Login'}</h1>
      <Input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
      <Input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <Button onClick={submit}>{isRegister ? 'Create Account' : 'Login'}</Button>
      <button className="text-sm underline" onClick={() => setIsRegister(!isRegister)}>
        {isRegister ? 'Have an account? Login' : "New user? Create account"}
      </button>
    </div>
  )
}
