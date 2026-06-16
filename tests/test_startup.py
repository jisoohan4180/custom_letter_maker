import os

import pytest


def test_get_db_path_relative_is_cwd_independent(monkeypatch):
    """상대경로 DB_PATH(./hrd.db)는 cwd와 무관하게 프로젝트 루트 기준으로 해석된다.

    alembic(backend/)과 앱(루트)의 cwd가 달라도 같은 파일을 가리켜야 한다
    (회귀: 2026-06-17 'no such table: courses').
    """
    monkeypatch.setenv("DB_PATH", "./hrd.db")
    from backend.app.config import _PROJECT_ROOT, get_db_path

    result = get_db_path()
    assert os.path.isabs(result)
    assert result == os.path.abspath(os.path.join(str(_PROJECT_ROOT), "hrd.db"))


def test_get_db_path_absolute_preserved(monkeypatch, tmp_path):
    """절대경로 DB_PATH는 그대로(abspath) 사용된다"""
    abs_db = str(tmp_path / "x.db")
    monkeypatch.setenv("DB_PATH", abs_db)
    from backend.app.config import get_db_path

    assert get_db_path() == os.path.abspath(abs_db)


def test_validate_env_raises_on_missing_vars(monkeypatch):
    """필수 환경변수 없으면 SystemExit(1) 발생"""
    monkeypatch.delenv("APP_PASSWORD", raising=False)
    monkeypatch.delenv("SESSION_SECRET_KEY", raising=False)
    monkeypatch.delenv("CLAUDE_API_KEY", raising=False)

    from backend.app.config import validate_env

    with pytest.raises(SystemExit) as exc_info:
        validate_env()
    assert exc_info.value.code == 1


def test_validate_env_passes_with_all_vars(monkeypatch):
    """필수 환경변수 모두 있으면 정상 통과"""
    monkeypatch.setenv("APP_PASSWORD", "test-pass")
    monkeypatch.setenv("SESSION_SECRET_KEY", "test-secret-key-long")
    monkeypatch.setenv("CLAUDE_API_KEY", "sk-ant-test-key")

    from backend.app.config import validate_env

    validate_env()  # 예외 없이 통과해야 함


def test_validate_env_partial_missing_raises(monkeypatch):
    """일부 환경변수만 있어도 누락 항목 있으면 SystemExit"""
    monkeypatch.setenv("APP_PASSWORD", "test-pass")
    monkeypatch.delenv("SESSION_SECRET_KEY", raising=False)
    monkeypatch.delenv("CLAUDE_API_KEY", raising=False)

    from backend.app.config import validate_env

    with pytest.raises(SystemExit) as exc_info:
        validate_env()
    assert exc_info.value.code == 1
