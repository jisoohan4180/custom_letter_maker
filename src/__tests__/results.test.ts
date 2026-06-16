import { describe, it, expect, beforeEach } from 'vitest'
import {
  loadStoredAnalysis,
  saveStoredAnalysis,
  clearStoredAnalysis,
  hasTodayResult,
  RESULTS_KEY,
} from '../lib/results'
import type { StoredAnalysis } from '../lib/analysis'

function sample(analyzedAt: string): StoredAnalysis {
  return {
    analyzed_at: analyzedAt,
    course_name: 'AIO1',
    rows: [
      {
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
      },
    ],
  }
}

describe('results 로컬스토리지', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('저장 후 동일하게 불러온다', () => {
    const a = sample('2026-06-17T09:00:00.000Z')
    saveStoredAnalysis(a)
    expect(loadStoredAnalysis()).toEqual(a)
  })

  it('clear 후에는 null', () => {
    saveStoredAnalysis(sample('2026-06-17T09:00:00.000Z'))
    clearStoredAnalysis()
    expect(loadStoredAnalysis()).toBeNull()
  })

  it('저장된 값이 없으면 null', () => {
    expect(loadStoredAnalysis()).toBeNull()
  })

  it('손상된 JSON이면 null', () => {
    localStorage.setItem(RESULTS_KEY, '{broken')
    expect(loadStoredAnalysis()).toBeNull()
  })

  it('hasTodayResult: 분석 일시가 오늘이면 true', () => {
    const now = new Date('2026-06-17T15:00:00')
    saveStoredAnalysis(sample(new Date('2026-06-17T09:00:00').toISOString()))
    expect(hasTodayResult(now)).toBe(true)
  })

  it('hasTodayResult: 분석 일시가 어제면 false', () => {
    const now = new Date('2026-06-17T15:00:00')
    saveStoredAnalysis(sample(new Date('2026-06-16T09:00:00').toISOString()))
    expect(hasTodayResult(now)).toBe(false)
  })

  it('hasTodayResult: 저장이 없으면 false', () => {
    expect(hasTodayResult(new Date('2026-06-17T15:00:00'))).toBe(false)
  })
})
