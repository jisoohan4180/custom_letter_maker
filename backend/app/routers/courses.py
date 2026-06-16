from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_auth
from ..models.course import Course
from ..schemas import CourseCreate, CourseOut, CourseUpdate

# 모든 과정 엔드포인트는 인증 필요
router = APIRouter(
    prefix="/api/v1/courses",
    tags=["courses"],
    dependencies=[Depends(require_auth)],
)

# 리스트 응답 상한 (과정은 소수지만 무한 반환 방지)
MAX_COURSES = 1000


def _serialize(course: Course) -> dict:
    return CourseOut.model_validate(course).model_dump(mode="json")


@router.get("")
async def list_courses(db: Session = Depends(get_db)) -> dict:
    """등록된 과정 목록을 최신순으로 반환한다."""
    courses = (
        db.query(Course)
        .order_by(Course.created_at.desc())
        .limit(MAX_COURSES)
        .all()
    )
    return {"courses": [_serialize(c) for c in courses]}


@router.get("/{course_id}")
async def get_course(course_id: str, db: Session = Depends(get_db)) -> dict:
    """과정 상세를 조회한다. 없으면 404."""
    course = db.get(Course, course_id)
    if course is None:
        raise HTTPException(status_code=404, detail="과정을 찾을 수 없습니다")
    return _serialize(course)


@router.post("", status_code=201)
async def create_course(payload: CourseCreate, db: Session = Depends(get_db)) -> dict:
    """새 과정을 추가한다. 과정명 중복 시 409."""
    existing = db.query(Course).filter(Course.name == payload.name).first()
    if existing is not None:
        raise HTTPException(status_code=409, detail="이미 있는 과정명입니다")

    course = Course(
        name=payload.name,
        description=payload.description,
        front_msg=payload.front_msg,
        back_msg=payload.back_msg,
    )
    db.add(course)
    try:
        db.commit()
    except IntegrityError:
        # 동시 생성 등으로 unique 제약 위반 시 (사전 검사를 통과한 경우)
        db.rollback()
        raise HTTPException(status_code=409, detail="이미 있는 과정명입니다")
    db.refresh(course)
    return _serialize(course)


@router.put("/{course_id}")
async def update_course(
    course_id: str, payload: CourseUpdate, db: Session = Depends(get_db)
) -> dict:
    """과정을 수정한다. 없으면 404, 다른 과정과 이름 충돌 시 409."""
    course = db.get(Course, course_id)
    if course is None:
        raise HTTPException(status_code=404, detail="과정을 찾을 수 없습니다")

    duplicate = (
        db.query(Course)
        .filter(Course.name == payload.name, Course.id != course_id)
        .first()
    )
    if duplicate is not None:
        raise HTTPException(status_code=409, detail="이미 있는 과정명입니다")

    course.name = payload.name
    course.description = payload.description
    course.front_msg = payload.front_msg
    course.back_msg = payload.back_msg
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="이미 있는 과정명입니다")
    db.refresh(course)
    return _serialize(course)
