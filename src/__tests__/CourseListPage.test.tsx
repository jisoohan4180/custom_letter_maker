import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CourseListPage } from '../pages/CourseListPage'
import type { Course } from '../lib/courses'

function mockFetch(impl: () => Promise<Partial<Response>>) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(impl as typeof fetch)
}

function jsonResponse(body: unknown, ok = true): Partial<Response> {
  return { ok, status: ok ? 200 : 500, json: async () => body }
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/courses']}>
      <Routes>
        <Route path="/courses" element={<CourseListPage />} />
        <Route path="/courses/new" element={<div>새 과정 화면</div>} />
        <Route path="/courses/:id" element={<div>과정 편집 화면</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

const sampleCourse: Course = {
  id: 'abc-123',
  name: 'AIO1',
  description: 'AI 오케스트레이션 1기',
  front_msg: '',
  back_msg: '',
}

describe('CourseListPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('로딩 중에는 스켈레톤이 표시된다', () => {
    mockFetch(() => new Promise(() => {})) // 영원히 pending
    renderPage()
    expect(screen.getByLabelText('로딩 중')).toBeTruthy()
  })

  it('과정이 없으면 빈 상태 안내와 과정 추가 버튼이 표시된다', async () => {
    mockFetch(async () => jsonResponse({ courses: [] }))
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/아직 등록된 과정이 없습니다/)).toBeTruthy()
    })
    expect(screen.getByRole('button', { name: '과정 추가' })).toBeTruthy()
  })

  it('과정이 있으면 카드 목록이 표시된다', async () => {
    mockFetch(async () => jsonResponse({ courses: [sampleCourse] }))
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('AIO1')).toBeTruthy()
    })
    expect(screen.getByText('AI 오케스트레이션 1기')).toBeTruthy()
    expect(screen.getByRole('button', { name: '수정' })).toBeTruthy()
  })

  it('조회 실패 시 에러 메시지가 표시된다', async () => {
    mockFetch(async () => jsonResponse({}, false))
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/불러오지 못했습니다/)).toBeTruthy()
    })
  })
})
