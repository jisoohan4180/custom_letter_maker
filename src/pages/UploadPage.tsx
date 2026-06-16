import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { NavBar } from '../components/NavBar'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { CsvDropZone } from '../components/CsvDropZone'
import { listCourses, type Course } from '../lib/courses'
import {
  readCsvInfo,
  findMissingColumns,
  APPLICANT_REQUIRED_COLUMNS,
  INTERVIEW_REQUIRED_COLUMNS,
} from '../lib/csv'
import { hasTodayResult } from '../lib/results'

interface Slot {
  file: File | null
  fileName: string | null
  rowCount: number | null
  error: string | null
}

const EMPTY_SLOT: Slot = { file: null, fileName: null, rowCount: null, error: null }

type Confirm = 'emptyMsg' | 'overwrite' | null

export function UploadPage() {
  const navigate = useNavigate()
  const [courses, setCourses] = useState<Course[]>([])
  const [coursesLoaded, setCoursesLoaded] = useState(false)
  const [courseId, setCourseId] = useState('')
  const [applicant, setApplicant] = useState<Slot>(EMPTY_SLOT)
  const [interview, setInterview] = useState<Slot>(EMPTY_SLOT)
  const [confirm, setConfirm] = useState<Confirm>(null)

  useEffect(() => {
    let active = true
    listCourses()
      .then(list => {
        if (!active) return
        setCourses(list)
        setCoursesLoaded(true)
      })
      .catch(() => {
        if (active) setCoursesLoaded(true)
      })
    return () => {
      active = false
    }
  }, [])

  const selectedCourse = courses.find(c => c.id === courseId) ?? null
  const noCourses = coursesLoaded && courses.length === 0

  async function handleFile(
    file: File,
    required: readonly string[],
    set: (s: Slot) => void,
  ) {
    const info = await readCsvInfo(file)
    const missing = findMissingColumns(info.columns, required)
    if (missing.length > 0) {
      set({ file: null, fileName: null, rowCount: null, error: `${missing.join(', ')} 컬럼이 없습니다` })
      return
    }
    if (info.rowCount === 0) {
      set({ file: null, fileName: null, rowCount: null, error: '분석할 지원자가 없습니다' })
      return
    }
    set({ file, fileName: file.name, rowCount: info.rowCount, error: null })
  }

  const filesReady = applicant.file !== null && interview.file !== null
  const canStart = filesReady && courseId !== '' && confirm === null

  function proceedToAnalysis() {
    setConfirm(null)
    navigate('/analysis', {
      state: {
        applicantFile: applicant.file,
        interviewFile: interview.file,
        course: selectedCourse,
      },
    })
  }

  function checkOverwriteThenStart() {
    if (hasTodayResult()) {
      setConfirm('overwrite')
      return
    }
    proceedToAnalysis()
  }

  function handleStartClick() {
    if (!canStart || !selectedCourse) return
    if (!selectedCourse.front_msg && !selectedCourse.back_msg) {
      setConfirm('emptyMsg')
      return
    }
    checkOverwriteThenStart()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-2xl mx-auto p-6">
        <h1 className="text-lg font-semibold text-gray-800 mb-6">CSV 업로드 · 분석 시작</h1>

        <div className="space-y-5 bg-white rounded-lg border border-gray-200 p-6">
          <CsvDropZone
            label="신청자 CSV"
            fileName={applicant.fileName}
            rowCount={applicant.rowCount}
            error={applicant.error}
            onFile={f => handleFile(f, APPLICANT_REQUIRED_COLUMNS, setApplicant)}
          />
          <CsvDropZone
            label="인터뷰 평가표 CSV"
            fileName={interview.fileName}
            rowCount={interview.rowCount}
            error={interview.error}
            onFile={f => handleFile(f, INTERVIEW_REQUIRED_COLUMNS, setInterview)}
          />

          <div>
            <label htmlFor="course-select" className="block text-sm font-medium text-gray-700 mb-1.5">
              과정 선택
            </label>
            {noCourses ? (
              <p className="text-sm text-gray-500">
                먼저 과정을 등록해주세요.{' '}
                <Link to="/courses" className="text-blue-600 hover:underline">
                  과정·멘트 관리로 이동
                </Link>
              </p>
            ) : (
              <select
                id="course-select"
                value={courseId}
                onChange={e => setCourseId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">과정을 선택하세요</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleStartClick}
              disabled={!canStart}
              className={[
                'px-5 py-2 rounded-md text-white font-medium',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                'bg-blue-600 hover:bg-blue-700 transition-colors',
              ].join(' ')}
            >
              분석 시작
            </button>
          </div>
        </div>
      </main>

      <ConfirmDialog
        open={confirm === 'emptyMsg'}
        message={`${selectedCourse?.name ?? ''} 과정의 앞/뒤 고정 멘트가 비어있습니다. 그대로 진행하시겠습니까?`}
        confirmLabel="그대로 진행"
        cancelLabel="취소"
        onConfirm={checkOverwriteThenStart}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === 'overwrite'}
        message="이전 결과를 덮어씁니다. 먼저 다운로드하셨습니까?"
        confirmLabel="진행"
        cancelLabel="취소"
        onConfirm={proceedToAnalysis}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
