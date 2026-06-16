// 두 CSV 모두 이름 컬럼을 매칭 키로 사용한다 (TRD: 이름 기준 자동 매칭).
// 나머지 컬럼은 그대로 통과시켜 분석/엑셀에서 활용한다.
export const APPLICANT_REQUIRED_COLUMNS = ['이름']
export const INTERVIEW_REQUIRED_COLUMNS = ['이름']

export interface CsvInfo {
  columns: string[]
  rowCount: number
}

/** CSV 한 줄을 따옴표를 고려해 컬럼 배열로 분리한다. */
export function splitCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      // 연속 따옴표("")는 이스케이프된 따옴표
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
      continue
    }
    current += ch
  }
  result.push(current)
  return result
}

/** CSV 텍스트에서 헤더 컬럼과 데이터 행 수를 추출한다. BOM 제거. */
export function parseCsvInfo(text: string): CsvInfo {
  const cleaned = text.replace(/^﻿/, '')
  const lines = cleaned.split(/\r?\n/).filter(line => line.trim().length > 0)
  if (lines.length === 0) {
    return { columns: [], rowCount: 0 }
  }
  const columns = splitCsvLine(lines[0]).map(c => c.trim())
  return { columns, rowCount: lines.length - 1 }
}

/** File 텍스트를 읽는다. Blob.text 미지원 환경(구형 Safari·jsdom)에서는 FileReader로 폴백. */
export function readFileText(file: File): Promise<string> {
  if (typeof file.text === 'function') {
    return file.text()
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

/** File 객체를 읽어 CSV 정보를 반환한다. */
export async function readCsvInfo(file: File): Promise<CsvInfo> {
  const text = await readFileText(file)
  return parseCsvInfo(text)
}

/** required 중 columns에 없는 컬럼명 목록을 반환한다. */
export function findMissingColumns(columns: string[], required: readonly string[]): string[] {
  return required.filter(req => !columns.includes(req))
}
