"""과정(course) 비즈니스 로직 레이어.

architecture.md 7절 레이어 경계(라우터 → 서비스 → ORM)에 따라 과정 조회/생성/수정
로직을 라우터에서 분리한다. analysis 모듈(Epic 3)이 과정 데이터를 내부 함수 직접 호출로
가져올 수 있도록 재사용 가능한 진입점을 제공한다.
"""
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..models.course import Course
from ..schemas import CourseCreate, CourseUpdate

# 리스트 응답 상한 (과정은 소수지만 무한 반환 방지)
MAX_COURSES = 1000


class CourseNotFoundError(Exception):
    """요청한 과정이 존재하지 않을 때 발생."""


class DuplicateCourseNameError(Exception):
    """과정명이 이미 존재할 때 발생."""


def list_courses(db: Session) -> list[Course]:
    """과정 목록을 최신순으로 반환한다."""
    return (
        db.query(Course)
        .order_by(Course.created_at.desc())
        .limit(MAX_COURSES)
        .all()
    )


def get_course(db: Session, course_id: str) -> Course:
    """id 로 과정을 조회한다. 없으면 CourseNotFoundError."""
    course = db.get(Course, course_id)
    if course is None:
        raise CourseNotFoundError(course_id)
    return course


def get_course_by_name(db: Session, name: str) -> Course | None:
    """과정명으로 조회한다 (analysis 모듈 내부 호출용). 없으면 None."""
    return db.query(Course).filter(Course.name == name).first()


def create_course(db: Session, data: CourseCreate) -> Course:
    """새 과정을 생성한다. 과정명 중복 시 DuplicateCourseNameError."""
    if get_course_by_name(db, data.name) is not None:
        raise DuplicateCourseNameError(data.name)

    course = Course(
        name=data.name,
        description=data.description,
        front_msg=data.front_msg,
        back_msg=data.back_msg,
    )
    db.add(course)
    try:
        db.commit()
    except IntegrityError:
        # 동시 생성 등으로 unique 제약 위반 시 (사전 검사를 통과한 경우)
        db.rollback()
        raise DuplicateCourseNameError(data.name)
    db.refresh(course)
    return course


def update_course(db: Session, course_id: str, data: CourseUpdate) -> Course:
    """과정을 수정한다. 없으면 CourseNotFoundError, 다른 과정과 충돌 시 DuplicateCourseNameError."""
    course = db.get(Course, course_id)
    if course is None:
        raise CourseNotFoundError(course_id)

    duplicate = (
        db.query(Course)
        .filter(Course.name == data.name, Course.id != course_id)
        .first()
    )
    if duplicate is not None:
        raise DuplicateCourseNameError(data.name)

    course.name = data.name
    course.description = data.description
    course.front_msg = data.front_msg
    course.back_msg = data.back_msg
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise DuplicateCourseNameError(data.name)
    db.refresh(course)
    return course
