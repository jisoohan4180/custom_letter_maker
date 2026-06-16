import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AnalysisPage } from '../pages/AnalysisPage'
import { loadStoredAnalysis } from '../lib/results'
import type { Course } from '../lib/courses'

function sseBody(events: object[], close = true): ReadableStream<Uint8Array> {
  const enc = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const e of events) controller.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`))
      if (close) controller.close()
    },
  })
}

function mockStream(events: object[]) {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    status: 200,
    body: sseBody(events),
  } as Response)
}

// 진행 중 상태(스트림 미종료)를 시뮬레이션 — done 없이 열려 있는 스트림
function mockStreamOpen(events: object[]) {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    status: 200,
    body: sseBody(events, false),
  } as Response)
}

const course: Course = {
  id: 'c1',
  name: 'AIO1',
  description: '',
  front_msg: '',
  back_msg: '',
}

function navState() {
  return {
    applicantFile: new File(['이름\n홍길동'], 'a.csv', { type: 'text/csv' }),
    interviewFile: new File(['이름\n홍길동'], 'b.csv', { type: 'text/csv' }),
    course,
  }
}

function renderAnalysis(state: unknown) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/analysis', state }]}>
      <Routes>
        <Route path="/analysis" element={<AnalysisPage />} />
        <Route path="/upload" element={<div>업로드 화면</div>} />
        <Route path="/results" element={<div>결과 화면</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

const sampleRow = {
  cohort: '1기',
  name: '홍길동',
  phone: '010',
  job_understanding: '높음',
  course_confidence: '중간',
  decision_state: '고민',
  real_constraint: '없음',
  churn_reason: '비용 부담',
  message: '안녕하세요',
  failed: false,
}

describe('AnalysisPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('네비게이션 state가 없으면 업로드 화면으로 돌아간다', async () => {
    renderAnalysis(null)
    await waitFor(() => {
      expect(screen.getByText('업로드 화면')).toBeTruthy()
    })
  })

  it('진행률 "N명 중 M번째 분석 중"을 표시한다', async () => {
    mockStreamOpen([{ type: 'progress', current: 1, total: 3 }])
    renderAnalysis(navState())
    await waitFor(() => {
      expect(screen.getByText('3명 중 1번째 분석 중...')).toBeTruthy()
    })
  })

  it('진행 중 예상 완료 시간을 표시한다 (AC 3.2)', async () => {
    mockStreamOpen([{ type: 'progress', current: 1, total: 3 }])
    renderAnalysis(navState())
    await waitFor(() => {
      expect(screen.getByText(/예상 약 \d+초 남음/)).toBeTruthy()
    })
  })

  it('완료되면 로컬스토리지에 저장하고 결과 화면으로 이동한다', async () => {
    mockStream([
      { type: 'progress', current: 1, total: 1 },
      { type: 'done', rows: [sampleRow] },
    ])
    renderAnalysis(navState())
    await waitFor(() => {
      expect(screen.getByText('결과 화면')).toBeTruthy()
    })
    const stored = loadStoredAnalysis()
    expect(stored?.course_name).toBe('AIO1')
    expect(stored?.rows[0].name).toBe('홍길동')
  })

  it('분석 취소 클릭 시 확인 팝업이 표시된다', async () => {
    mockStreamOpen([{ type: 'progress', current: 1, total: 3 }])
    renderAnalysis(navState())
    await waitFor(() => screen.getByText('3명 중 1번째 분석 중...'))
    fireEvent.click(screen.getByRole('button', { name: '분석 취소' }))
    expect(screen.getByText(/취소하면 처음부터 다시 해야 합니다/)).toBeTruthy()
  })
})
