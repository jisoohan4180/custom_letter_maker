import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PrivateRoute } from '../components/PrivateRoute'

function renderWithAuth(authenticated: boolean) {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: authenticated,
    status: authenticated ? 200 : 401,
    json: async () => ({ authenticated }),
  } as Response)

  return render(
    <MemoryRouter initialEntries={['/upload']}>
      <Routes>
        <Route path="/" element={<div>로그인 페이지</div>} />
        <Route
          path="/upload"
          element={
            <PrivateRoute>
              <div>업로드 페이지</div>
            </PrivateRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PrivateRoute', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('인증된 상태에서 자식 컴포넌트를 렌더링한다', async () => {
    renderWithAuth(true)
    await waitFor(() => {
      expect(screen.getByText('업로드 페이지')).toBeTruthy()
    })
  })

  it('미인증 상태에서 로그인 페이지로 리다이렉트한다', async () => {
    renderWithAuth(false)
    await waitFor(() => {
      expect(screen.getByText('로그인 페이지')).toBeTruthy()
    })
  })
})
