import uuid
import pytest
from sqlalchemy import create_engine, inspect
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session


def _make_test_engine():
    from backend.app.database import Base
    from backend.app.models import course as _  # noqa: F401 — registers Course on Base

    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    return engine


def test_courses_table_has_required_columns():
    """COURSES 테이블에 7개 필수 컬럼이 모두 있어야 한다"""
    engine = _make_test_engine()
    inspector = inspect(engine)
    columns = {col["name"] for col in inspector.get_columns("courses")}
    expected = {"id", "name", "description", "front_msg", "back_msg", "created_at", "updated_at"}
    assert expected.issubset(columns), f"누락 컬럼: {expected - columns}"


def test_name_column_is_unique():
    """name 컬럼은 UNIQUE 제약이 걸려 있어야 한다"""
    from backend.app.models.course import Course

    engine = _make_test_engine()

    with Session(engine) as session:
        session.add(Course(id=str(uuid.uuid4()), name="중복과정"))
        session.commit()

        session.add(Course(id=str(uuid.uuid4()), name="중복과정"))
        with pytest.raises(IntegrityError):
            session.commit()


def test_id_is_primary_key():
    """id 컬럼은 PK여야 한다"""
    engine = _make_test_engine()
    inspector = inspect(engine)
    pk_cols = inspector.get_pk_constraint("courses")["constrained_columns"]
    assert "id" in pk_cols
