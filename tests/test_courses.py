import os
import uuid

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# 모듈(main) 임포트 전에 환경변수 설정 필수 (validate_env 통과용)
os.environ.setdefault("APP_PASSWORD", "test-password-123")
os.environ.setdefault("SESSION_SECRET_KEY", "test-secret-key-at-least-32-chars!!")
os.environ.setdefault("CLAUDE_API_KEY", "sk-ant-test-key")


@pytest.fixture
def test_engine():
    """테스트별 격리된 인메모리 SQLite 엔진 (StaticPool 로 단일 연결 공유)."""
    from backend.app.database import Base
    from backend.app.models import course as _  # noqa: F401 — Course 를 Base 에 등록

    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return engine


@pytest.fixture
def client(test_engine):
    """get_db 를 테스트 엔진으로 오버라이드한 TestClient."""
    from fastapi.testclient import TestClient

    from backend.app.database import get_db
    from backend.app.main import app

    TestSession = sessionmaker(bind=test_engine, autocommit=False, autoflush=False)

    def override_get_db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def auth_client(client):
    """로그인 세션이 설정된 client."""
    client.post("/api/v1/auth/login", json={"password": "test-password-123"})
    return client


@pytest.fixture
def seed_course(test_engine):
    """테스트 엔진에 과정을 직접 삽입하고 id 를 반환하는 헬퍼."""
    from backend.app.models.course import Course

    TestSession = sessionmaker(bind=test_engine)

    def _seed(name: str, description: str = "", front_msg: str = "", back_msg: str = "") -> str:
        session = TestSession()
        course = Course(
            id=str(uuid.uuid4()),
            name=name,
            description=description,
            front_msg=front_msg,
            back_msg=back_msg,
        )
        session.add(course)
        session.commit()
        course_id = course.id
        session.close()
        return course_id

    return _seed


def test_list_courses_requires_auth(client):
    """세션 없이 과정 목록 조회 시 401"""
    res = client.get("/api/v1/courses")
    assert res.status_code == 401


def test_list_courses_empty(auth_client):
    """과정이 없으면 빈 배열을 반환한다"""
    res = auth_client.get("/api/v1/courses")
    assert res.status_code == 200
    assert res.json() == {"courses": []}


def test_list_courses_returns_seeded(auth_client, seed_course):
    """등록된 과정이 목록에 포함되고 필수 필드가 직렬화된다"""
    seed_course(name="AIO1", description="AI 오케스트레이션 1기")
    res = auth_client.get("/api/v1/courses")
    assert res.status_code == 200
    courses = res.json()["courses"]
    assert len(courses) == 1
    course = courses[0]
    assert course["name"] == "AIO1"
    assert course["description"] == "AI 오케스트레이션 1기"
    # 빈 멘트는 null 이 아닌 빈 문자열로 정규화돼야 한다
    assert course["front_msg"] == ""
    assert course["back_msg"] == ""
    assert "id" in course


def test_list_courses_multiple(auth_client, seed_course):
    """여러 과정을 모두 반환한다"""
    seed_course(name="과정A")
    seed_course(name="과정B")
    res = auth_client.get("/api/v1/courses")
    names = {c["name"] for c in res.json()["courses"]}
    assert names == {"과정A", "과정B"}
