import type { StoredAnalysis } from './analysis'

// Epic 1 LoginPage가 분기 판단에 쓰는 키와 동일해야 한다.
export const RESULTS_KEY = 'hrd-analysis-results'

/** 로컬스토리지에서 최근 분석 결과를 읽는다. 없거나 손상 시 null. */
export function loadStoredAnalysis(): StoredAnalysis | null {
  const raw = localStorage.getItem(RESULTS_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as StoredAnalysis
    if (!parsed || !Array.isArray(parsed.rows)) return null
    return parsed
  } catch {
    return null
  }
}

/** 분석 결과를 로컬스토리지에 저장한다 (최근 1회분 덮어쓰기). */
export function saveStoredAnalysis(analysis: StoredAnalysis): void {
  localStorage.setItem(RESULTS_KEY, JSON.stringify(analysis))
}

/** 저장된 분석 결과를 삭제한다. */
export function clearStoredAnalysis(): void {
  localStorage.removeItem(RESULTS_KEY)
}

/** 저장된 결과의 분석 일시가 오늘(로컬 날짜)인지 여부. */
export function hasTodayResult(now: Date = new Date()): boolean {
  const stored = loadStoredAnalysis()
  if (!stored) return false
  const analyzed = new Date(stored.analyzed_at)
  return (
    analyzed.getFullYear() === now.getFullYear() &&
    analyzed.getMonth() === now.getMonth() &&
    analyzed.getDate() === now.getDate()
  )
}
