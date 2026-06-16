import { useEffect } from 'react'

interface Props {
  message: string
  onDismiss: () => void
  durationMs?: number
}

/** 공통 토스트. durationMs(기본 2초) 후 자동 소멸한다 (UX-DR9). */
export function Toast({ message, onDismiss, durationMs = 2000 }: Props) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, durationMs)
    return () => clearTimeout(timer)
  }, [onDismiss, durationMs])

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-md shadow-lg z-50"
      role="status"
    >
      {message}
    </div>
  )
}
