import os

import pytest

# 모듈 임포트 전에 환경변수 설정 필수
os.environ.setdefault("APP_PASSWORD", "test-password-123")
os.environ.setdefault("SESSION_SECRET_KEY", "test-secret-key-at-least-32-chars!!")
os.environ.setdefault("CLAUDE_API_KEY", "sk-ant-test-key")


@pytest.fixture(autouse=True)
def reset_lockout():
    """각 테스트 전후로 잠금 카운터 초기화"""
    from backend.app.auth_lockout import lockout_tracker

    lockout_tracker.reset()
    yield
    lockout_tracker.reset()


@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    from backend.app.main import app

    return TestClient(app)


def test_login_correct_password(client):
    """올바른 비밀번호로 로그인하면 200 OK"""
    res = client.post("/api/v1/auth/login", json={"password": "test-password-123"})
    assert res.status_code == 200
    assert res.json()["ok"] is True


def test_login_wrong_password(client):
    """틀린 비밀번호로 로그인하면 401 + 에러 메시지"""
    res = client.post("/api/v1/auth/login", json={"password": "wrong-password"})
    assert res.status_code == 401
    data = res.json()
    assert data["ok"] is False
    assert "비밀번호" in data["message"]


def test_lockout_after_5_failures(client):
    """5회 연속 실패 시 429 잠금 응답"""
    for _ in range(5):
        client.post("/api/v1/auth/login", json={"password": "wrong"})
    res = client.post("/api/v1/auth/login", json={"password": "wrong"})
    assert res.status_code == 429
    data = res.json()
    assert data["ok"] is False
    assert data["retry_after"] > 0


def test_me_unauthenticated(client):
    """세션 없이 /auth/me 접근하면 401"""
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401


def test_me_authenticated(client):
    """로그인 성공 후 /auth/me 접근하면 200"""
    client.post("/api/v1/auth/login", json={"password": "test-password-123"})
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 200
    assert res.json()["authenticated"] is True


def test_logout_clears_session(client):
    """로그아웃 후 /auth/me 접근하면 401"""
    client.post("/api/v1/auth/login", json={"password": "test-password-123"})
    client.post("/api/v1/auth/logout")
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401


def test_success_resets_failure_counter(client):
    """3회 실패 후 성공하면 카운터가 리셋돼 추가 5회 실패 후 잠금"""
    for _ in range(3):
        client.post("/api/v1/auth/login", json={"password": "wrong"})
    # 성공 → 카운터 리셋
    client.post("/api/v1/auth/login", json={"password": "test-password-123"})
    # 4회 더 실패 (아직 잠금 없음)
    for _ in range(4):
        res = client.post("/api/v1/auth/login", json={"password": "wrong"})
        assert res.status_code == 401
    # 5번째 실패 → 잠금
    res = client.post("/api/v1/auth/login", json={"password": "wrong"})
    assert res.status_code == 429
