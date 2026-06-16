from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from .config import validate_env
from .database import engine, Base
from .models import course as _course_models  # noqa: F401 — registers Course on Base
from .routers import health


@asynccontextmanager
async def lifespan(app: FastAPI):
    validate_env()
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="HRD 전환 어시스턴트", lifespan=lifespan)

app.include_router(health.router, tags=["infra"])

# React 빌드 파일 서빙 (npm run build 후에만 존재)
_dist = Path(__file__).parent.parent.parent / "dist"
if _dist.exists():
    app.mount("/", StaticFiles(directory=str(_dist), html=True), name="static")
