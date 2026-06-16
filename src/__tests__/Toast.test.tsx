import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { Toast } from '../components/Toast'

afterEach(() => {
  vi.useRealTimers()
})

describe('Toast', () => {
  it('메시지를 표시한다', () => {
    render(<Toast message="저장됐습니다" onDismiss={() => {}} />)
    expect(screen.getByText('저장됐습니다')).toBeTruthy()
  })

  it('durationMs 후 onDismiss 가 호출된다', () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    render(<Toast message="저장됐습니다" onDismiss={onDismiss} durationMs={2000} />)
    expect(onDismiss).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(onDismiss).toHaveBeenCalledOnce()
  })
})
