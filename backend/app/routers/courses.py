from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_auth
from ..models.course import Course
from ..schemas import CourseCreate, CourseOut, CourseUpdate
from ..services import course_service
from ..services.course_service import CourseNotFoundError, DuplicateCourseNameError

# 모든 과정 엔드포인트는 인증 필요
router = APIRouter(
    prefix="/api/v1/courses",
    tags=["courses"],
    dependencies=[Depends(require_auth)],
)


def _serialize(course: Course) -> dict:
    return CourseOut.model_validate(course).model_dump(mode="json")


@router.get("")
async def list_courses(db: Session = Depends(get_db)) -> dict:
    """등록된 과정 목록을 최신순으로 반환한다."""
    courses = course_service.list_courses(db)
    return {"courses": [_serialize(c) for c in courses]}


@router.get("/{course_id}")
async def get_course(course_id: str, db: Session = Depends(get_db)) -> dict:
    """과정 상세를 조회한다. 없으면 404."""
    try:
        course = course_service.get_course(db, course_id)
    except CourseNotFoundError:
        raise HTTPException(status_code=404, detail="과정을 찾을 수 없습니다")
    return _serialize(course)


@router.post("", status_code=201)
async def create_course(payload: CourseCreate, db: Session = Depends(get_db)) -> dict:
    """새 과정을 추가한다. 과정명 중복 시 409."""
    try:
        course = course_service.create_course(db, payload)
    except DuplicateCourseNameError:
        raise HTTPException(status_code=409, detail="이미 있는 과정명입니다")
    return _serialize(course)


@router.put("/{course_id}")
async def update_course(
    course_id: str, payload: CourseUpdate, db: Session = Depends(get_db)
) -> dict:
    """과정을 수정한다. 없으면 404, 다른 과정과 이름 충돌 시 409."""
    try:
        course = course_service.update_course(db, course_id, payload)
    except CourseNotFoundError:
        raise HTTPException(status_code=404, detail="과정을 찾을 수 없습니다")
    except DuplicateCourseNameError:
        raise HTTPException(status_code=409, detail="이미 있는 과정명입니다")
    return _serialize(course)
