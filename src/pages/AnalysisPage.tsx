import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { runAnalysisStream } from '../lib/analysisStream'
import { saveStoredAnalysis } from '../lib/results'
import type { Course } from '../lib/courses'

interface AnalysisNavState {
  applicantFile: File
  interviewFile: File
  course: Course
}

export function AnalysisPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as AnalysisNavState | null

  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [error, setError] = useState('')
  const [showCancel, setShowCancel] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!state || !state.applicantFile || !state.interviewFile || !state.course) {
      navigate('/upload', { replace: true })
      return
    }

    const controller = new AbortController()
    abortRef.current = controller

    const body = new FormData()
    body.append('course_id', state.course.id)
    body.append('applicant_csv', state.applicantFile)
    body.append('interview_csv', state.interviewFile)

    runAnalysisStream(
      body,
      {
        onProgress: (current, total) => setProgress({ current, total }),
        onDone: rows => {
          saveStoredAnalysis({
            analyzed_at: new Date().toISOString(),
            course_name: state.course.name,
            rows,
          })
          navigate('/results', { replace: true })
        },
        onError: message => setError(message),
      },
      controller.signal,
    )

    return () => controller.abort()
    // 마운트 시 1회만 실행 (StrictMode 재마운트 시 첫 스트림은 abort 후 새로 시작)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleConfirmCancel() {
    abortRef.current?.abort()
    navigate('/upload', { replace: true })
  }

  if (!state) return null

  const { current, total } = progress
  const remaining = total > 0 ? total - current : 0

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        {error ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 max-w-sm">
            <p className="text-red-500 mb-6">{error}</p>
            <button
              onClick={() => navigate('/upload', { replace: true })}
              className="px-5 py-2 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700"
            >
              업로드 화면으로
            </button>
          </div>
        ) : (
          <>
            <div
              className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-6"
              role="status"
              aria-label="분석 중"
            />
            <p className="text-lg font-medium text-gray-800">
              {total > 0 ? `${total}명 중 ${current}번째 분석 중...` : '분석을 준비하고 있습니다...'}
            </p>
            {total > 0 && (
              <p className="text-sm text-gray-400 mt-2">
                남은 지원자 약 {remaining}명 · 잠시만 기다려주세요
              </p>
            )}
            <button
              onClick={() => setShowCancel(true)}
              className="mt-8 text-sm text-gray-400 hover:text-gray-600 underline"
            >
              분석 취소
            </button>
          </>
        )}
      </div>

      <ConfirmDialog
        open={showCancel}
        message="취소하면 처음부터 다시 해야 합니다. 취소하시겠습니까?"
        confirmLabel="취소하기"
        cancelLabel="계속 진행"
        onConfirm={handleConfirmCancel}
        onCancel={() => setShowCancel(false)}
      />
    </div>
  )
}
