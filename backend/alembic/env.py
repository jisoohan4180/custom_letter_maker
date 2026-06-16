import os
import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import engine_from_config, pool

# 프로젝트 루트(..)를 sys.path에 추가해 backend 패키지를 임포트 가능하게 함
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

# .env 로딩
_env_file = Path(__file__).parent.parent.parent / ".env"
if _env_file.exists():
    from dotenv import load_dotenv

    load_dotenv(_env_file)

# 모델 임포트 (autogenerate 지원)
from backend.app.config import get_db_path  # noqa: E402
from backend.app.database import Base  # noqa: E402
from backend.app.models import course as _  # noqa: E402, F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def _get_url() -> str:
    # 앱(backend.app.config.get_db_path)과 동일한 경로 해석을 단일 소스로 사용해
    # alembic(backend/)과 앱(루트)의 cwd 차이로 인한 DB 불일치를 방지한다.
    path = get_db_path()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    return f"sqlite:///{path}"


def run_migrations_offline() -> None:
    context.configure(
        url=_get_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    cfg = config.get_section(config.config_ini_section, {})
    cfg["sqlalchemy.url"] = _get_url()
    connectable = engine_from_config(cfg, prefix="sqlalchemy.", poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
