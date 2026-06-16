import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NavBar } from '../components/NavBar'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { loadStoredAnalysis, clearStoredAnalysis } from '../lib/results'
import { downloadExcel } from '../lib/excel'
import type { AnalysisRow, StoredAnalysis } from '../lib/analysis'

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

type Confirm = 'new' | 'delete' | null

export function ResultsPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<StoredAnalysis | null>(null)
  const [missing, setMissing] = useState(false)
  const [selected, setSelected] = useState<AnalysisRow | null>(null)
  const [confirm, setConfirm] = useState<Confirm>(null)
  const [downloadError, setDownloadError] = useState('')

  useEffect(() => {
    const stored = loadStoredAnalysis()
    if (!stored || stored.rows.length === 0) {
      setMissing(true)
      const timer = setTimeout(() => navigate('/upload', { replace: true }), 1500)
      return () => clearTimeout(timer)
    }
    setData(stored)
  }, [navigate])

  if (missing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">아직 분석 결과가 없습니다. 업로드 화면으로 이동합니다…</p>
      </div>
    )
  }
  if (!data) return null

  const failedCount = data.rows.filter(row => row.failed).length

  async function handleDownload() {
    setDownloadError('')
    try {
      await downloadExcel(data!.rows, data!.course_name, data!.analyzed_at)
    } catch {
      setDownloadError('엑셀 다운로드에 실패했습니다. 다시 시도해주세요')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-4xl mx-auto p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold text-gray-800">분석 결과</h1>
            <p className="text-sm text-gray-500 mt-1">
              {formatDateTime(data.analyzed_at)} · {data.course_name}
            </p>
          </div>
          <button
            onClick={handleDownload}
            className="px-4 py-2 rounded-md bg-green-600 text-white text-sm font-medium hover:bg-green-700"
          >
            엑셀 다운로드
          </button>
        </div>

        {downloadError && <p className="text-red-500 text-sm mb-4">{downloadError}</p>}

        {failedCount > 0 && (
          <p className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-md px-4 py-2 mb-4">
            {failedCount}명 분석 실패 — 해당 지원자는 수동으로 확인해주세요
          </p>
        )}

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left px-4 py-2 font-medium w-28">이름</th>
                <th className="text-left px-4 py-2 font-medium w-48">이탈 사유</th>
                <th className="text-left px-4 py-2 font-medium">권장 멘트</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, i) => (
                <tr
                  key={`${row.name}-${i}`}
                  className={['border-t border-gray-100', row.failed ? 'bg-red-50' : ''].join(' ')}
                >
                  <td className="px-4 py-2 text-gray-800">{row.name}</td>
                  <td className="px-4 py-2 text-gray-600">{row.churn_reason}</td>
                  <td className="px-4 py-2">
                    {row.failed || !row.message ? (
                      <span className="text-gray-400">—</span>
                    ) : (
                      <button
                        onClick={() => setSelected(row)}
                        className="text-left text-blue-600 hover:underline truncate max-w-full"
                      >
                        {row.message.slice(0, 30)}
                        {row.message.length > 30 ? '…' : ''}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center mt-6">
          <button
            onClick={() => setConfirm('delete')}
            className="text-sm text-gray-400 hover:text-red-500 underline"
          >
            결과 삭제
          </button>
          <button
            onClick={() => setConfirm('new')}
            className="px-4 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
          >
            새 분석 시작
          </button>
        </div>
      </main>

      {selected && <MessageModal row={selected} onClose={() => setSelected(null)} />}

      <ConfirmDialog
        open={confirm === 'new'}
        message="이전 결과를 덮어씁니다. 다운로드하셨습니까?"
        confirmLabel="새 분석"
        cancelLabel="취소"
        onConfirm={() => {
          setConfirm(null)
          navigate('/upload')
        }}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === 'delete'}
        message="삭제하면 복구할 수 없습니다. 삭제하시겠습니까?"
        confirmLabel="삭제"
        cancelLabel="취소"
        onConfirm={() => {
          clearStoredAnalysis()
          setConfirm(null)
          navigate('/upload')
        }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}

function MessageModal({ row, onClose }: { row: AnalysisRow; onClose: () => void }) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg p-6 w-full max-w-md"
        role="dialog"
        aria-modal="true"
        aria-label={`${row.name} 멘트 전문`}
        onClick={e => e.stopPropagation()}
      >
        <h2 className="font-semibold text-gray-800 mb-4">{row.name} · 멘트 전문</h2>
        <p className="text-sm text-gray-700 whitespace-pre-line mb-6">{row.message}</p>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
