import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

# config 임포트 시점에 .env 로드 + 환경변수 검증 (SessionMiddleware 설정 전에 실행)
from .config import validate_env
from .models import course as _course_models  # noqa: F401
from .routers import health, auth, courses

validate_env()

app = FastAPI(title="HRD 전환 어시스턴트")

app.add_middleware(
    SessionMiddleware,
    secret_key=os.environ["SESSION_SECRET_KEY"],
    max_age=8 * 3600,
    https_only=False,
    same_site="lax",
)

app.include_router(health.router, tags=["infra"])
app.include_router(auth.router)
app.include_router(courses.router)

_dist = Path(__file__).parent.parent.parent / "dist"
if _dist.exists():
    app.mount("/", StaticFiles(directory=str(_dist), html=True), name="static")
