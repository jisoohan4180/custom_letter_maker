import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parseSseChunk, runAnalysisStream } from '../lib/analysisStream'

function sseBody(events: object[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const e of events) controller.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`))
      controller.close()
    },
  })
}

describe('parseSseChunk', () => {
  it('data 라인을 파싱한다', () => {
    expect(parseSseChunk('data: {"type":"progress","current":1,"total":3}')).toEqual({
      type: 'progress',
      current: 1,
      total: 3,
    })
  })

  it('data 라인이 없으면 null', () => {
    expect(parseSseChunk('event: ping')).toBeNull()
  })

  it('깨진 JSON이면 null', () => {
    expect(parseSseChunk('data: {broken')).toBeNull()
  })
})

describe('runAnalysisStream', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('progress와 done 핸들러를 호출한다', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      body: sseBody([
        { type: 'progress', current: 1, total: 2 },
        { type: 'progress', current: 2, total: 2 },
        { type: 'done', rows: [] },
      ]),
    } as Response)

    const onProgress = vi.fn()
    const onDone = vi.fn()
    const onError = vi.fn()
    await runAnalysisStream(new FormData(), { onProgress, onDone, onError })

    expect(onProgress).toHaveBeenCalledWith(1, 2)
    expect(onProgress).toHaveBeenCalledWith(2, 2)
    expect(onDone).toHaveBeenCalledWith([])
    expect(onError).not.toHaveBeenCalled()
  })

  it('404 응답이면 onError를 호출한다', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
      body: null,
    } as Response)

    const onError = vi.fn()
    await runAnalysisStream(new FormData(), { onProgress: vi.fn(), onDone: vi.fn(), onError })
    expect(onError).toHaveBeenCalledWith('과정을 찾을 수 없습니다')
  })

  it('error 이벤트를 onError로 라우팅한다', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      body: sseBody([{ type: 'error', message: 'CSV 형식을 확인해주세요' }]),
    } as Response)

    const onError = vi.fn()
    const onDone = vi.fn()
    await runAnalysisStream(new FormData(), { onProgress: vi.fn(), onDone, onError })
    expect(onError).toHaveBeenCalledWith('CSV 형식을 확인해주세요')
    expect(onDone).not.toHaveBeenCalled()
  })

  it('done 없이 스트림이 끝나면 onError를 호출한다 (무한 스피너 방지)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      body: sseBody([{ type: 'progress', current: 1, total: 2 }]), // done 없음
    } as Response)

    const onError = vi.fn()
    const onDone = vi.fn()
    await runAnalysisStream(new FormData(), { onProgress: vi.fn(), onDone, onError })
    expect(onDone).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledWith('분석이 완료되지 않았습니다. 다시 시도해주세요')
  })

  it('AbortError(취소)는 onError를 호출하지 않는다', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      Object.assign(new Error('aborted'), { name: 'AbortError' }),
    )

    const onError = vi.fn()
    await runAnalysisStream(new FormData(), { onProgress: vi.fn(), onDone: vi.fn(), onError })
    expect(onError).not.toHaveBeenCalled()
  })
})
