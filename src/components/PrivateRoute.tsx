import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'

type AuthState = 'checking' | 'authenticated' | 'unauthenticated'

export function PrivateRoute({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>('checking')

  useEffect(() => {
    fetch('/api/v1/auth/me')
      .then(res => {
        setAuthState(res.ok ? 'authenticated' : 'unauthenticated')
      })
      .catch(() => setAuthState('unauthenticated'))
  }, [])

  if (authState === 'checking') return null
  if (authState === 'unauthenticated') return <Navigate to="/" replace />
  return <>{children}</>
}
