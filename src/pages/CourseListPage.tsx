import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NavBar } from '../components/NavBar'
import { listCourses, type Course } from '../lib/courses'

type Status = 'loading' | 'loaded' | 'error'

export function CourseListPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<Status>('loading')
  const [courses, setCourses] = useState<Course[]>([])

  useEffect(() => {
    let active = true
    listCourses()
      .then(list => {
        if (!active) return
        setCourses(list)
        setStatus('loaded')
      })
      .catch(() => {
        if (active) setStatus('error')
      })
    return () => {
      active = false
    }
  }, [])

  const isEmpty = status === 'loaded' && courses.length === 0

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-3xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-semibold text-gray-800">과정·멘트 관리</h1>
          {status === 'loaded' && !isEmpty && (
            <button
              onClick={() => navigate('/courses/new')}
              className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              과정 추가
            </button>
          )}
        </div>

        {status === 'loading' && <SkeletonList />}

        {status === 'error' && (
          <p className="text-red-500 text-sm">
            과정 목록을 불러오지 못했습니다. 새로고침해주세요
          </p>
        )}

        {isEmpty && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-gray-500 mb-6">
              아직 등록된 과정이 없습니다. 과정을 먼저 등록해주세요
            </p>
            <button
              onClick={() => navigate('/courses/new')}
              className="px-6 py-3 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
            >
              과정 추가
            </button>
          </div>
        )}

        {status === 'loaded' && !isEmpty && (
          <ul className="space-y-3">
            {courses.map(course => (
              <li
                key={course.id}
                className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 truncate">{course.name}</p>
                  <p className="text-sm text-gray-400 truncate">
                    {course.description.split('\n')[0] || '설명 없음'}
                  </p>
                </div>
                <button
                  onClick={() => navigate(`/courses/${course.id}`)}
                  className="shrink-0 ml-4 px-3 py-1.5 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
                >
                  수정
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}

function SkeletonList() {
  return (
    <ul className="space-y-3" aria-label="로딩 중">
      {[0, 1, 2].map(i => (
        <li key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
          <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
          <div className="h-3 w-48 bg-gray-100 rounded" />
        </li>
      ))}
    </ul>
  )
}
