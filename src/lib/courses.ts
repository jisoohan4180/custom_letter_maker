export interface Course {
  id: string
  name: string
  description: string
  front_msg: string
  back_msg: string
  created_at?: string
  updated_at?: string
}

export interface CourseInput {
  name: string
  description: string
  front_msg: string
  back_msg: string
}

/** 과정명 중복(409) 을 구분하기 위한 에러 타입. */
export class DuplicateNameError extends Error {
  constructor(message = '이미 있는 과정명입니다') {
    super(message)
    this.name = 'DuplicateNameError'
  }
}

/** 등록된 과정 목록을 조회한다. 실패 시 예외를 던진다. */
export async function listCourses(): Promise<Course[]> {
  const res = await fetch('/api/v1/courses')
  if (!res.ok) {
    throw new Error('과정 목록을 불러오지 못했습니다')
  }
  const data = (await res.json()) as { courses: Course[] }
  return data.courses
}

/** id 로 과정 상세를 조회한다. */
export async function getCourse(id: string): Promise<Course> {
  const res = await fetch(`/api/v1/courses/${id}`)
  if (res.status === 404) {
    throw new Error('과정을 찾을 수 없습니다')
  }
  if (!res.ok) {
    throw new Error('과정을 불러오지 못했습니다')
  }
  return (await res.json()) as Course
}

/** 새 과정을 추가한다. 중복 과정명이면 DuplicateNameError 를 던진다. */
export async function createCourse(input: CourseInput): Promise<Course> {
  const res = await fetch('/api/v1/courses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (res.status === 409) {
    throw new DuplicateNameError()
  }
  if (!res.ok) {
    throw new Error('저장에 실패했습니다. 다시 시도해주세요')
  }
  return (await res.json()) as Course
}

/** 기존 과정을 수정한다. 중복 과정명이면 DuplicateNameError 를 던진다. */
export async function updateCourse(id: string, input: CourseInput): Promise<Course> {
  const res = await fetch(`/api/v1/courses/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (res.status === 409) {
    throw new DuplicateNameError()
  }
  if (!res.ok) {
    throw new Error('저장에 실패했습니다. 다시 시도해주세요')
  }
  return (await res.json()) as Course
}
