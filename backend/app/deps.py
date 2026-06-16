from fastapi import HTTPException, Request


def require_auth(request: Request) -> None:
    """세션에 인증 정보가 없으면 401을 반환하는 FastAPI 의존성.

    SessionMiddleware 가 설정된 앱에서만 동작한다 (main.py 에서 설정).
    보호가 필요한 라우터에 ``dependencies=[Depends(require_auth)]`` 로 적용한다.
    """
    if not request.session.get("authenticated"):
        raise HTTPException(status_code=401, detail="인증이 필요합니다")
