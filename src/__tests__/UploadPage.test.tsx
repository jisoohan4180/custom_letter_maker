import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { UploadPage } from '../pages/UploadPage'
import type { Course } from '../lib/courses'

function mockCourses(courses: Course[]) {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ courses }),
  } as Response)
}

function csvFile(name: string, content: string): File {
  return new File([content], name, { type: 'text/csv' })
}

function course(over: Partial<Course> = {}): Course {
  return {
    id: 'c1',
    name: 'AIO1',
    description: '',
    front_msg: '앞멘트',
    back_msg: '뒷멘트',
    ...over,
  }
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/upload']}>
      <UploadPage />
    </MemoryRouter>,
  )
}

const fileInputs = () =>
  Array.from(document.querySelectorAll('input[type="file"]')) as HTMLInputElement[]

describe('UploadPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('등록된 과정이 없으면 안내와 관리 링크를 표시한다', async () => {
    mockCourses([])
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/먼저 과정을 등록해주세요/)).toBeTruthy()
    })
    expect(screen.getByRole('link', { name: /과정·멘트 관리로 이동/ })).toBeTruthy()
  })

  it('신청자 CSV에 이름 컬럼이 없으면 에러를 표시한다', async () => {
    mockCourses([course()])
    renderPage()
    await waitFor(() => screen.getByRole('combobox'))
    fireEvent.change(fileInputs()[0], {
      target: { files: [csvFile('a.csv', '연락처,기수\n010,1기')] },
    })
    await waitFor(() => {
      expect(screen.getByText('이름 컬럼이 없습니다')).toBeTruthy()
    })
  })

  it('데이터 행이 0건이면 "분석할 지원자가 없습니다"를 표시한다', async () => {
    mockCourses([course()])
    renderPage()
    await waitFor(() => screen.getByRole('combobox'))
    fireEvent.change(fileInputs()[0], {
      target: { files: [csvFile('a.csv', '이름,연락처')] },
    })
    await waitFor(() => {
      expect(screen.getByText('분석할 지원자가 없습니다')).toBeTruthy()
    })
  })

  it('두 파일이 유효하고 과정을 선택하면 분석 시작 버튼이 활성화된다', async () => {
    mockCourses([course()])
    renderPage()
    await waitFor(() => screen.getByRole('combobox'))
    const start = screen.getByRole('button', { name: '분석 시작' }) as HTMLButtonElement
    expect(start.disabled).toBe(true)

    fireEvent.change(fileInputs()[0], {
      target: { files: [csvFile('a.csv', '이름,연락처\n홍길동,010')] },
    })
    fireEvent.change(fileInputs()[1], {
      target: { files: [csvFile('b.csv', '이름,점수\n홍길동,5')] },
    })
    await waitFor(() => expect(screen.getByText('a.csv · 1행')).toBeTruthy())
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'c1' } })

    expect(start.disabled).toBe(false)
  })

  it('고정 멘트가 비어있는 과정으로 분석 시작 시 확인 팝업을 띄운다', async () => {
    mockCourses([course({ front_msg: '', back_msg: '' })])
    renderPage()
    await waitFor(() => screen.getByRole('combobox'))
    fireEvent.change(fileInputs()[0], {
      target: { files: [csvFile('a.csv', '이름\n홍길동')] },
    })
    fireEvent.change(fileInputs()[1], {
      target: { files: [csvFile('b.csv', '이름\n홍길동')] },
    })
    await waitFor(() => expect(screen.getByText('a.csv · 1행')).toBeTruthy())
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'c1' } })
    fireEvent.click(screen.getByRole('button', { name: '분석 시작' }))

    expect(screen.getByText(/고정 멘트가 비어있습니다/)).toBeTruthy()
  })
})
