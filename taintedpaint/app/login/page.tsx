'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const res = await fetch(`/api/auth/${mode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    if (res.ok) {
      router.push('/')
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Failed')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={submit} className="space-y-4 w-72">
        <h1 className="text-xl font-medium text-center">
          {mode === 'login' ? 'Login' : 'Create Account'}
        </h1>
        <Input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <Button type="submit" className="w-full">
          {mode === 'login' ? 'Login' : 'Sign Up'}
        </Button>
        <p className="text-sm text-center">
          {mode === 'login' ? (
            <button
              type="button"
              className="underline"
              onClick={() => setMode('signup')}
            >
              Create account
            </button>
          ) : (
            <button
              type="button"
              className="underline"
              onClick={() => setMode('login')}
            >
              Back to login
            </button>
          )}
        </p>
      </form>
    </div>
  )
}
