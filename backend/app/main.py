import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from .config import validate_env
from .database import engine, Base
from .models import course as _course_models  # noqa: F401
from .routers import health, auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    validate_env()
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="HRD 전환 어시스턴트", lifespan=lifespan)

app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET_KEY", "dev-only-insecure-change-me"),
    max_age=8 * 3600,
    https_only=False,
    same_site="lax",
)

app.include_router(health.router, tags=["infra"])
app.include_router(auth.router)

_dist = Path(__file__).parent.parent.parent / "dist"
if _dist.exists():
    app.mount("/", StaticFiles(directory=str(_dist), html=True), name="static")
