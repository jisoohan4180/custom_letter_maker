import type { AnalysisRow } from './analysis'

export type AnalysisEvent =
  | { type: 'progress'; current: number; total: number }
  | { type: 'done'; rows: AnalysisRow[] }
  | { type: 'error'; message: string }

export interface StreamHandlers {
  onProgress: (current: number, total: number) => void
  onDone: (rows: AnalysisRow[]) => void
  onError: (message: string) => void
}

/** SSE 청크("data: {...}") 하나를 파싱한다. 데이터가 없거나 깨졌으면 null. */
export function parseSseChunk(chunk: string): AnalysisEvent | null {
  const line = chunk.split('\n').find(l => l.startsWith('data:'))
  if (!line) return null
  try {
    return JSON.parse(line.slice(line.indexOf(':') + 1).trim()) as AnalysisEvent
  } catch {
    return null
  }
}

/** 분석 시작 요청을 보내고 SSE 스트림을 읽어 핸들러로 전달한다. */
export async function runAnalysisStream(
  body: FormData,
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  let res: Response
  try {
    res = await fetch('/api/v1/analysis/start', { method: 'POST', body, signal })
  } catch (err) {
    if ((err as Error).name !== 'AbortError') handlers.onError('서버에 연결할 수 없습니다')
    return
  }

  if (res.status === 404) {
    handlers.onError('과정을 찾을 수 없습니다')
    return
  }
  if (!res.ok || !res.body) {
    handlers.onError('분석을 시작하지 못했습니다')
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let gotTerminal = false

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const chunks = buffer.split('\n\n')
      buffer = chunks.pop() ?? ''
      for (const chunk of chunks) {
        const event = parseSseChunk(chunk)
        if (!event) continue
        if (event.type === 'progress') {
          handlers.onProgress(event.current, event.total)
        } else if (event.type === 'done') {
          gotTerminal = true
          handlers.onDone(event.rows)
        } else if (event.type === 'error') {
          gotTerminal = true
          handlers.onError(event.message)
        }
      }
    }
    // 스트림이 done/error 없이 끊기면 무한 스피너 방지
    if (!gotTerminal) handlers.onError('분석이 완료되지 않았습니다. 다시 시도해주세요')
  } catch (err) {
    if ((err as Error).name !== 'AbortError') handlers.onError('분석 중 오류가 발생했습니다')
  }
}
