import type { AnalysisRow } from './analysis'

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** ISO 일시에서 YYYYMMDD. 파싱 실패 시 오늘 날짜. */
export function excelDate(analyzedAt: string): string {
  const d = new Date(analyzedAt)
  const target = isNaN(d.getTime()) ? new Date() : d
  return `${target.getFullYear()}${pad(target.getMonth() + 1)}${pad(target.getDate())}`
}

/** HRD_독려문자_{과정명}_{날짜}.xlsx 파일명 생성. */
export function defaultExcelName(courseName: string, analyzedAt: string): string {
  return `HRD_독려문자_${courseName || '과정'}_${excelDate(analyzedAt)}.xlsx`
}

/** 분석 결과를 서버에서 엑셀로 만들어 다운로드한다. */
export async function downloadExcel(
  rows: AnalysisRow[],
  courseName: string,
  analyzedAt: string,
): Promise<void> {
  const res = await fetch('/api/v1/analysis/excel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows, course_name: courseName, analyzed_at: analyzedAt }),
  })
  if (!res.ok) {
    throw new Error('엑셀 다운로드에 실패했습니다')
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = defaultExcelName(courseName, analyzedAt)
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
