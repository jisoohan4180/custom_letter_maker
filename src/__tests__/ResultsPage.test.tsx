import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ResultsPage } from '../pages/ResultsPage'
import { saveStoredAnalysis, loadStoredAnalysis } from '../lib/results'
import type { AnalysisRow } from '../lib/analysis'

function row(over: Partial<AnalysisRow> = {}): AnalysisRow {
  return {
    cohort: '1기',
    name: '홍길동',
    phone: '010',
    job_understanding: '높음',
    course_confidence: '중간',
    decision_state: '고민',
    real_constraint: '없음',
    churn_reason: '비용 부담',
    message: '안녕하세요 홍길동님, 과정 등록을 독려하는 긴 메시지입니다. 꼭 등록 부탁드립니다.',
    failed: false,
    ...over,
  }
}

function seed(rows: AnalysisRow[]) {
  saveStoredAnalysis({ analyzed_at: '2026-06-17T09:23:00', course_name: 'AIO1', rows })
}

function renderResults() {
  return render(
    <MemoryRouter initialEntries={['/results']}>
      <Routes>
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/upload" element={<div>업로드 화면</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ResultsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('저장된 결과가 없으면 안내를 표시한다', () => {
    renderResults()
    expect(screen.getByText(/아직 분석 결과가 없습니다/)).toBeTruthy()
  })

  it('분석 일시·과정명과 결과 테이블을 표시한다', () => {
    seed([row()])
    renderResults()
    expect(screen.getByText('2026.06.17 09:23 · AIO1')).toBeTruthy()
    expect(screen.getByText('홍길동')).toBeTruthy()
    expect(screen.getByText('비용 부담')).toBeTruthy()
  })

  it('분석 실패 행이 있으면 안내 배너를 표시한다', () => {
    seed([row(), row({ name: '실패자', failed: true, churn_reason: '분석 실패', message: '' })])
    renderResults()
    expect(screen.getByText(/1명 분석 실패/)).toBeTruthy()
  })

  it('멘트를 클릭하면 전문(원문 전체) 팝업이 열린다', () => {
    seed([row()])
    renderResults()
    const cell = screen.getByText(/안녕하세요 홍길동님/)
    fireEvent.click(cell)
    const dialog = screen.getByRole('dialog', { name: /멘트 전문/ })
    expect(dialog).toBeTruthy()
    // 모달에는 절단되지 않은 원문 전체가 보여야 한다
    expect(dialog.textContent).toContain('꼭 등록 부탁드립니다.')
  })

  it('30자 이하 멘트는 말줄임표 없이, 31자 이상은 말줄임표와 함께 표시된다', () => {
    const exact30 = '가'.repeat(30)
    const over31 = '나'.repeat(31)
    seed([row({ name: 'A', message: exact30 }), row({ name: 'B', message: over31 })])
    renderResults()
    expect(screen.getByText(exact30)).toBeTruthy() // 말줄임표 없음
    expect(screen.getByText(`${'나'.repeat(30)}…`)).toBeTruthy() // 30자 + 말줄임표
  })

  it('결과 삭제 확인 시 로컬스토리지를 비우고 업로드로 이동한다', async () => {
    seed([row()])
    renderResults()
    fireEvent.click(screen.getByRole('button', { name: '결과 삭제' }))
    fireEvent.click(screen.getByRole('button', { name: '삭제' }))
    await waitFor(() => {
      expect(screen.getByText('업로드 화면')).toBeTruthy()
    })
    expect(loadStoredAnalysis()).toBeNull()
  })

  it('엑셀 다운로드 버튼이 분석 결과를 서버로 전송한다', async () => {
    seed([row()])
    URL.createObjectURL = vi.fn(() => 'blob:test')
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['x']),
    } as Response)

    renderResults()
    fireEvent.click(screen.getByRole('button', { name: '엑셀 다운로드' }))

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/v1/analysis/excel',
        expect.objectContaining({ method: 'POST' }),
      )
    })
  })
})
