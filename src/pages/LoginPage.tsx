import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

type Status = 'idle' | 'loading' | 'error' | 'locked'

interface State {
  status: Status
  message: string
  retryAfter: number
}

export function LoginPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [state, setState] = useState<State>({ status: 'idle', message: '', retryAfter: 0 })
  const [countdown, setCountdown] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const isLocked = state.status === 'locked'
  const isLoading = state.status === 'loading'
  const canSubmit = password.length > 0 && !isLocked && !isLoading

  function startCountdown(seconds: number) {
    setCountdown(seconds)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          setState({ status: 'idle', message: '', retryAfter: 0 })
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  async function handleSubmit() {
    if (!canSubmit) return
    setState({ status: 'loading', message: '', retryAfter: 0 })

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      const data = (await res.json()) as { ok: boolean; message?: string; retry_after?: number }

      if (res.ok) {
        const prev = localStorage.getItem('hrd-analysis-results')
        navigate(prev ? '/results' : '/upload')
      } else if (res.status === 429) {
        const after = data.retry_after ?? 30
        setState({ status: 'locked', message: data.message ?? '잠시 후 다시 시도해주세요', retryAfter: after })
        startCountdown(after)
      } else {
        setState({ status: 'error', message: data.message ?? '비밀번호가 맞지 않습니다', retryAfter: 0 })
      }
    } catch {
      setState({ status: 'error', message: '서버에 연결할 수 없습니다', retryAfter: 0 })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-sm w-full max-w-sm">
        <h1 className="text-xl font-semibold text-center mb-6 text-gray-800">
          HRD 전환 어시스턴트
        </h1>

        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="비밀번호 입력"
          disabled={isLoading || isLocked}
          className={[
            'w-full px-3 py-2 border rounded-md mb-1 outline-none',
            'focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100',
            state.status === 'error' ? 'border-red-500' : 'border-gray-300',
          ].join(' ')}
        />

        {state.status === 'error' && (
          <p className="text-red-500 text-sm mb-3">{state.message}</p>
        )}
        {isLocked && (
          <p className="text-orange-500 text-sm mb-3">
            {state.message} ({countdown}초 후 재시도)
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={[
            'w-full py-2 rounded-md text-white font-medium mt-2',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            'bg-blue-600 hover:bg-blue-700 transition-colors',
          ].join(' ')}
        >
          {isLoading ? '확인 중...' : '확인'}
        </button>
      </div>
    </div>
  )
}
