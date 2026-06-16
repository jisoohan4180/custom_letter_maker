from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_auth
from ..models.course import Course
from ..schemas import CourseOut

# 모든 과정 엔드포인트는 인증 필요
router = APIRouter(
    prefix="/api/v1/courses",
    tags=["courses"],
    dependencies=[Depends(require_auth)],
)

# 리스트 응답 상한 (과정은 소수지만 무한 반환 방지)
MAX_COURSES = 1000


@router.get("")
async def list_courses(db: Session = Depends(get_db)) -> dict:
    """등록된 과정 목록을 최신순으로 반환한다."""
    courses = (
        db.query(Course)
        .order_by(Course.created_at.desc())
        .limit(MAX_COURSES)
        .all()
    )
    return {"courses": [CourseOut.model_validate(c).model_dump(mode="json") for c in courses]}
