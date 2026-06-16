import hmac
import os

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from ..auth_lockout import lockout_tracker

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


class LoginRequest(BaseModel):
    password: str


@router.post("/login")
async def login(req: LoginRequest, request: Request) -> JSONResponse:
    if lockout_tracker.is_locked():
        return JSONResponse(
            status_code=429,
            content={
                "ok": False,
                "message": "잠시 후 다시 시도해주세요",
                "retry_after": lockout_tracker.seconds_remaining(),
            },
        )

    app_password = os.getenv("APP_PASSWORD", "")
    if app_password and hmac.compare_digest(req.password, app_password):
        lockout_tracker.record_success()
        request.session["authenticated"] = True
        return JSONResponse({"ok": True})

    lockout_tracker.record_failure()

    if lockout_tracker.is_locked():
        return JSONResponse(
            status_code=429,
            content={
                "ok": False,
                "message": "잠시 후 다시 시도해주세요",
                "retry_after": lockout_tracker.seconds_remaining(),
            },
        )

    return JSONResponse(
        status_code=401,
        content={"ok": False, "message": "비밀번호가 맞지 않습니다"},
    )


@router.post("/logout")
async def logout(request: Request) -> JSONResponse:
    request.session.clear()
    return JSONResponse({"ok": True})


@router.get("/me")
async def me(request: Request) -> JSONResponse:
    if request.session.get("authenticated"):
        return JSONResponse({"authenticated": True})
    return JSONResponse(status_code=401, content={"authenticated": False})
