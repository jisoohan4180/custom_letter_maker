"""실행 환경(소스 실행 vs PyInstaller exe)에 따라 경로를 일관되게 해석한다.

- writable_base: 사용자가 만들고 수정하는 파일(.env, hrd.db)의 기준 디렉토리.
  exe로 패키징되면 exe가 놓인 폴더(쓰기 가능), 소스 실행이면 프로젝트 루트.
- bundle_base: 읽기 전용 번들 리소스(dist, backend/alembic)의 기준 디렉토리.
  exe면 PyInstaller 추출 경로(sys._MEIPASS), 소스 실행이면 프로젝트 루트.
"""
import sys
from pathlib import Path

_SOURCE_ROOT = Path(__file__).resolve().parent.parent.parent


def is_frozen() -> bool:
    return bool(getattr(sys, "frozen", False))


def writable_base() -> Path:
    """사용자 편집/기록 파일(.env, hrd.db)의 기준 디렉토리."""
    if is_frozen():
        return Path(sys.executable).resolve().parent
    return _SOURCE_ROOT


def bundle_base() -> Path:
    """읽기 전용 번들 리소스(dist, alembic)의 기준 디렉토리."""
    if is_frozen():
        return Path(getattr(sys, "_MEIPASS", _SOURCE_ROOT))
    return _SOURCE_ROOT
