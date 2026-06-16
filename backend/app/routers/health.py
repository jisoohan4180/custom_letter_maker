from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter()


@router.get("/healthz")
async def healthz():
    return JSONResponse({"status": "ok"})


@router.get("/readyz")
async def readyz():
    return JSONResponse({"status": "ready"})
