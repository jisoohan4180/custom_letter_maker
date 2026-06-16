import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_auth
from ..services import analysis_service, course_service
from ..services.analysis_service import CourseInfo
from ..services.course_service import CourseNotFoundError

router = APIRouter(
    prefix="/api/v1/analysis",
    tags=["analysis"],
    dependencies=[Depends(require_auth)],
)


@router.post("/start")
async def start_analysis(
    course_id: str = Form(...),
    applicant_csv: UploadFile = File(...),
    interview_csv: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    """CSV 두 개를 받아 지원자별로 분석하고 진행률을 SSE로 스트리밍한다."""
    try:
        course = course_service.get_course(db, course_id)
    except CourseNotFoundError:
        raise HTTPException(status_code=404, detail="과정을 찾을 수 없습니다")

    # DB 세션과 분리된 스냅샷으로 변환 (스트리밍 중 세션 의존 제거)
    course_info = CourseInfo(
        name=course.name or "",
        description=course.description or "",
        front_msg=course.front_msg or "",
        back_msg=course.back_msg or "",
    )

    applicant_bytes = await applicant_csv.read()
    interview_bytes = await interview_csv.read()
    analyze = analysis_service.make_claude_analyzer()

    async def event_stream():
        for event in analysis_service.iter_analysis_events(
            applicant_bytes, interview_bytes, course_info, analyze
        ):
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
