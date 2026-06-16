import { describe, it, expect, vi, beforeEach } from 'vitest'
import { excelDate, defaultExcelName, downloadExcel } from '../lib/excel'

describe('excelDate / defaultExcelName', () => {
  it('ISO 일시에서 YYYYMMDD를 추출한다', () => {
    expect(excelDate('2026-06-17T09:23:00')).toBe('20260617')
  })

  it('파일명을 HRD_독려문자_{과정}_{날짜}.xlsx 형식으로 만든다', () => {
    expect(defaultExcelName('AIO1', '2026-06-17T09:23:00')).toBe('HRD_독려문자_AIO1_20260617.xlsx')
  })

  it('과정명이 비면 기본값 "과정"을 사용한다', () => {
    expect(defaultExcelName('', '2026-06-17T09:23:00')).toBe('HRD_독려문자_과정_20260617.xlsx')
  })
})

describe('downloadExcel', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    URL.createObjectURL = vi.fn(() => 'blob:test')
    URL.revokeObjectURL = vi.fn()
  })

  it('성공 시 엑셀 엔드포인트로 POST하고 다운로드를 트리거한다', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['x']),
    } as Response)
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    await downloadExcel([], 'AIO1', '2026-06-17T09:23:00')

    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/analysis/excel',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(clickSpy).toHaveBeenCalledOnce()
  })

  it('실패 응답이면 예외를 던진다', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false } as Response)
    await expect(downloadExcel([], 'AIO1', '')).rejects.toThrow('엑셀 다운로드에 실패했습니다')
  })
})
