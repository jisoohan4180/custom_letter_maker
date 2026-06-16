import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CourseEditPage } from '../pages/CourseEditPage'

type Handler = (url: string, init?: RequestInit) => Partial<Response>

function setFetch(handler: Handler) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(((url: string, init?: RequestInit) =>
    Promise.resolve(handler(url, init) as Response)) as typeof fetch)
}

function json(body: unknown, ok = true, status = 200): Partial<Response> {
  return { ok, status, json: async () => body }
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/courses" element={<div>과정 목록 화면</div>} />
        <Route path="/courses/new" element={<CourseEditPage />} />
        <Route path="/courses/:id" element={<CourseEditPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

const nameInput = () => screen.getByPlaceholderText('예: AIO1') as HTMLInputElement
const descInput = () =>
  screen.getByPlaceholderText('AI 가 참조할 과정 어필 포인트 (200자 이내)') as HTMLTextAreaElement
const saveButton = () => screen.getByRole('button', { name: /저장/ }) as HTMLButtonElement

describe('CourseEditPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('신규 모드에서 과정명이 비어있으면 저장 버튼이 비활성화된다', () => {
    setFetch(() => json({}))
    renderAt('/courses/new')
    expect(saveButton().disabled).toBe(true)
    fireEvent.change(nameInput(), { target: { value: 'AIO1' } })
    expect(saveButton().disabled).toBe(false)
  })

  it('과정 설명이 200자를 초과하면 카운터가 표시되고 저장이 막힌다', () => {
    setFetch(() => json({}))
    renderAt('/courses/new')
    fireEvent.change(nameInput(), { target: { value: 'AIO1' } })
    fireEvent.change(descInput(), { target: { value: '가'.repeat(201) } })
    expect(screen.getByText('201/200')).toBeTruthy()
    expect(saveButton().disabled).toBe(true)
  })

  it('과정을 추가하면 "저장됐습니다" 토스트가 표시된다', async () => {
    setFetch((_url, init) =>
      init?.method === 'POST'
        ? json({ id: '1', name: 'AIO1', description: '', front_msg: '', back_msg: '' }, true, 201)
        : json({}),
    )
    renderAt('/courses/new')
    fireEvent.change(nameInput(), { target: { value: 'AIO1' } })
    fireEvent.click(saveButton())
    await waitFor(() => {
      expect(screen.getByText('저장됐습니다')).toBeTruthy()
    })
  })

  it('중복 과정명이면 에러 메시지가 표시된다', async () => {
    setFetch((_url, init) =>
      init?.method === 'POST'
        ? json({ detail: '이미 있는 과정명입니다' }, false, 409)
        : json({}),
    )
    renderAt('/courses/new')
    fireEvent.change(nameInput(), { target: { value: '중복' } })
    fireEvent.click(saveButton())
    await waitFor(() => {
      expect(screen.getByText('이미 있는 과정명입니다')).toBeTruthy()
    })
  })

  it('수정 모드에서 기존 과정 데이터가 폼에 채워진다', async () => {
    setFetch(() =>
      json({ id: 'abc', name: '기존과정', description: '설명', front_msg: '앞', back_msg: '뒤' }),
    )
    renderAt('/courses/abc')
    await waitFor(() => {
      expect(nameInput().value).toBe('기존과정')
    })
    expect(descInput().value).toBe('설명')
  })

  it('저장하지 않은 변경이 있을 때 돌아가기를 누르면 확인 팝업이 뜬다', () => {
    setFetch(() => json({}))
    renderAt('/courses/new')
    fireEvent.change(nameInput(), { target: { value: '수정중' } })
    fireEvent.click(screen.getByText('← 과정 목록으로 돌아가기'))
    expect(screen.getByText('저장하지 않고 나가시겠습니까?')).toBeTruthy()
  })
})
