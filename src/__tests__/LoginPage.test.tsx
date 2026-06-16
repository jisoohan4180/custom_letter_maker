import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { LoginPage } from '../pages/LoginPage'

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ ok: false, message: '비밀번호가 맞지 않습니다' }),
    } as Response)
  })

  it('초기 상태에서 확인 버튼이 비활성화된다', () => {
    renderLoginPage()
    const btn = screen.getByRole('button', { name: '확인' }) as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })

  it('비밀번호 입력 시 확인 버튼이 활성화된다', () => {
    renderLoginPage()
    fireEvent.change(screen.getByPlaceholderText('비밀번호 입력'), { target: { value: 'abc' } })
    const btn = screen.getByRole('button', { name: '확인' }) as HTMLButtonElement
    expect(btn.disabled).toBe(false)
  })

  it('비밀번호 필드가 마스킹된다 (type=password)', () => {
    renderLoginPage()
    const input = screen.getByPlaceholderText('비밀번호 입력') as HTMLInputElement
    expect(input.type).toBe('password')
  })

  it('비밀번호 지우면 확인 버튼이 다시 비활성화된다', () => {
    renderLoginPage()
    const input = screen.getByPlaceholderText('비밀번호 입력')
    fireEvent.change(input, { target: { value: 'abc' } })
    fireEvent.change(input, { target: { value: '' } })
    const btn = screen.getByRole('button', { name: '확인' }) as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })
})
