import pytest


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
