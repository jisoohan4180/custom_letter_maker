import os
import sys
from pathlib import Path

from dotenv import load_dotenv

_PROJECT_ROOT = Path(__file__).parent.parent.parent

# 프로젝트 루트의 .env 를 임포트 시점에 로드 (uvicorn/pytest 어디서 실행해도 동작)
load_dotenv(_PROJECT_ROOT / ".env")

_REQUIRED: dict[str, str] = {
    "APP_PASSWORD": "앱 접속 비밀번호",
    "SESSION_SECRET_KEY": "세션 서명 키",
    "CLAUDE_API_KEY": "Claude API 키",
}


def validate_env() -> None:
    """필수 환경변수를 검사하고 누락 시 에러 메시지 출력 후 종료한다."""
    missing = [key for key in _REQUIRED if not os.getenv(key)]
    if missing:
        for key in missing:
            print(f"[ERROR] 필수 환경변수 누락: {key} ({_REQUIRED[key]})", file=sys.stderr)
        print("[ERROR] .env.example 을 참고해 .env 파일을 만들어주세요.", file=sys.stderr)
        sys.exit(1)


def get_db_path() -> str:
    """DB 파일의 절대 경로를 반환한다.

    상대경로 DB_PATH(예: ./hrd.db)는 프로젝트 루트 기준으로 해석한다.
    alembic은 backend/, 앱은 루트에서 실행돼 cwd가 다르므로, cwd에 따라
    DB 파일이 달라지면 'no such table' 류 불일치가 발생한다 (cwd 비의존 필수).
    """
    raw = os.getenv("DB_PATH", "~/hrd-data/hrd.db")
    expanded = os.path.expanduser(raw)
    if not os.path.isabs(expanded):
        expanded = os.path.join(str(_PROJECT_ROOT), expanded)
    return os.path.abspath(expanded)
