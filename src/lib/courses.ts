export interface Course {
  id: string
  name: string
  description: string
  front_msg: string
  back_msg: string
  created_at?: string
  updated_at?: string
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
