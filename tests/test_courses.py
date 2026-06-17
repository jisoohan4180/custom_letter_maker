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


# --- Story 2.2: 상세 조회 / 추가 / 수정 ---


def test_get_course_by_id(auth_client, seed_course):
    """id 로 과정 상세를 조회한다"""
    course_id = seed_course(name="AIO1", description="설명", front_msg="앞멘트")
    res = auth_client.get(f"/api/v1/courses/{course_id}")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == course_id
    assert data["name"] == "AIO1"
    assert data["front_msg"] == "앞멘트"


def test_get_course_not_found(auth_client):
    """없는 과정 조회 시 404"""
    res = auth_client.get("/api/v1/courses/nonexistent-id")
    assert res.status_code == 404


def test_create_course(auth_client):
    """과정을 추가하면 201 + 생성된 과정 반환"""
    res = auth_client.post(
        "/api/v1/courses",
        json={"name": "신규과정", "description": "설명", "front_msg": "앞", "back_msg": "뒤"},
    )
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "신규과정"
    assert "id" in data
    # 실제로 목록에 반영됐는지 확인
    listed = auth_client.get("/api/v1/courses").json()["courses"]
    assert any(c["name"] == "신규과정" for c in listed)


def test_create_course_minimal(auth_client):
    """과정명만으로도 추가할 수 있고 멘트는 빈 문자열로 채워진다"""
    res = auth_client.post("/api/v1/courses", json={"name": "최소과정"})
    assert res.status_code == 201
    data = res.json()
    assert data["description"] == ""
    assert data["front_msg"] == ""


def test_create_course_duplicate_name(auth_client, seed_course):
    """중복 과정명으로 추가 시 409"""
    seed_course(name="중복과정")
    res = auth_client.post("/api/v1/courses", json={"name": "중복과정"})
    assert res.status_code == 409
    assert "이미 있는" in res.json()["detail"]


def test_create_course_empty_name_rejected(auth_client):
    """빈 과정명은 422"""
    res = auth_client.post("/api/v1/courses", json={"name": "   "})
    assert res.status_code == 422


def test_create_course_description_too_long(auth_client):
    """과정 설명이 상한(DESCRIPTION_MAX)을 초과하면 422"""
    from backend.app.schemas import DESCRIPTION_MAX

    res = auth_client.post(
        "/api/v1/courses", json={"name": "긴설명", "description": "가" * (DESCRIPTION_MAX + 1)}
    )
    assert res.status_code == 422


def test_create_course_description_at_max_accepted(auth_client):
    """과정 설명 정확히 상한 길이는 허용(포함 경계)되고 그대로 저장된다"""
    from backend.app.schemas import DESCRIPTION_MAX

    desc = "가" * DESCRIPTION_MAX
    res = auth_client.post("/api/v1/courses", json={"name": "경계최대", "description": desc})
    assert res.status_code == 201
    assert res.json()["description"] == desc


def test_create_course_message_too_long(auth_client):
    """앞/뒤 고정 멘트가 상한(2000자)을 초과하면 422"""
    res = auth_client.post(
        "/api/v1/courses", json={"name": "긴멘트", "front_msg": "가" * 2001}
    )
    assert res.status_code == 422


def test_update_course(auth_client, seed_course):
    """과정을 수정하면 변경 내용이 반영된다"""
    course_id = seed_course(name="원본", description="원본설명")
    res = auth_client.put(
        f"/api/v1/courses/{course_id}",
        json={"name": "수정됨", "description": "수정설명", "front_msg": "", "back_msg": ""},
    )
    assert res.status_code == 200
    assert res.json()["name"] == "수정됨"
    # 재조회로 영속 확인
    again = auth_client.get(f"/api/v1/courses/{course_id}").json()
    assert again["name"] == "수정됨"
    assert again["description"] == "수정설명"


def test_update_course_not_found(auth_client):
    """없는 과정 수정 시 404"""
    res = auth_client.put("/api/v1/courses/nope", json={"name": "x"})
    assert res.status_code == 404


def test_update_course_duplicate_name(auth_client, seed_course):
    """다른 과정과 이름이 충돌하면 409"""
    seed_course(name="과정A")
    target_id = seed_course(name="과정B")
    res = auth_client.put(f"/api/v1/courses/{target_id}", json={"name": "과정A"})
    assert res.status_code == 409


def test_update_course_same_name_allowed(auth_client, seed_course):
    """자기 자신의 이름은 그대로 두고 수정 가능 (자기 충돌 아님)"""
    course_id = seed_course(name="유지과정", description="old")
    res = auth_client.put(
        f"/api/v1/courses/{course_id}", json={"name": "유지과정", "description": "new"}
    )
    assert res.status_code == 200
    assert res.json()["description"] == "new"


def test_update_course_description_too_long(auth_client, seed_course):
    """수정 경로(PUT)에서도 과정 설명이 상한 초과 시 422 (검증 회귀 방지)"""
    from backend.app.schemas import DESCRIPTION_MAX

    course_id = seed_course(name="수정길이", description="old")
    res = auth_client.put(
        f"/api/v1/courses/{course_id}",
        json={"name": "수정길이", "description": "가" * (DESCRIPTION_MAX + 1)},
    )
    assert res.status_code == 422


def test_create_course_requires_auth(client):
    """세션 없이 과정 추가 시 401"""
    res = client.post("/api/v1/courses", json={"name": "무인증"})
    assert res.status_code == 401


def test_update_course_requires_auth(client, seed_course):
    """세션 없이 과정 수정 시 401"""
    course_id = seed_course(name="보호과정")
    res = client.put(f"/api/v1/courses/{course_id}", json={"name": "x"})
    assert res.status_code == 401


def test_get_course_requires_auth(client, seed_course):
    """세션 없이 과정 상세 조회 시 401"""
    course_id = seed_course(name="보호상세")
    res = client.get(f"/api/v1/courses/{course_id}")
    assert res.status_code == 401
