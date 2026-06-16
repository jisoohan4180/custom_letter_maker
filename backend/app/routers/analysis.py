import json
import os
from datetime import date, datetime
from urllib.parse import quote

import anyio
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_auth
from ..services import analysis_service, course_service
from ..services.analysis_service import CourseInfo
from ..services.course_service import CourseNotFoundError

XLSX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
# 업로드 CSV 1개 최대 크기 (메모리 고갈/비용 폭증 방지)
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(5 * 1024 * 1024)))
# 엑셀 요청 행 수 상한
MAX_EXCEL_ROWS = int(os.getenv("MAX_EXCEL_ROWS", "2000"))


class ExcelRow(BaseModel):
    """엑셀 요청 1행 — 프론트엔드 AnalysisRow 계약과 일치."""

    cohort: str = ""
    name: str = ""
    phone: str = ""
    job_understanding: str = ""
    course_confidence: str = ""
    decision_state: str = ""
    real_constraint: str = ""
    churn_reason: str = ""
    message: str = ""
    failed: bool = False


class ExcelRequest(BaseModel):
    course_name: str = ""
    analyzed_at: str = ""
    rows: list[ExcelRow] = Field(max_length=MAX_EXCEL_ROWS)

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
    if len(applicant_bytes) > MAX_UPLOAD_BYTES or len(interview_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"CSV 파일이 너무 큽니다 (최대 {MAX_UPLOAD_BYTES // (1024 * 1024)}MB)",
        )

    analyze = analysis_service.make_claude_analyzer()

    async def event_stream():
        # iter_analysis_events 는 동기 제너레이터이고 내부에서 블로킹 Claude 호출을 한다.
        # 각 next() 를 워커 스레드로 오프로드해 이벤트 루프가 막히지 않게 한다 (architecture.md 5절).
        generator = analysis_service.iter_analysis_events(
            applicant_bytes, interview_bytes, course_info, analyze
        )
        sentinel = object()

        def next_event():
            return next(generator, sentinel)

        while True:
            event = await anyio.to_thread.run_sync(next_event)
            if event is sentinel:
                break
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


def _excel_date(analyzed_at: str) -> str:
    """ISO 일시 문자열에서 YYYYMMDD 를 뽑는다. 실패 시 오늘 날짜."""
    try:
        return datetime.fromisoformat(analyzed_at.replace("Z", "+00:00")).strftime("%Y%m%d")
    except (ValueError, AttributeError):
        return date.today().strftime("%Y%m%d")


@router.post("/excel")
async def download_excel(payload: ExcelRequest) -> Response:
    """분석 결과를 HRD_독려문자_{과정명}_{날짜}.xlsx 로 다운로드한다."""
    content = analysis_service.build_excel([row.model_dump() for row in payload.rows])
    course = payload.course_name.strip() or "과정"
    filename = f"HRD_독려문자_{course}_{_excel_date(payload.analyzed_at)}.xlsx"
    # 한글 파일명은 RFC 5987 (filename*) 로 인코딩
    disposition = f"attachment; filename=\"download.xlsx\"; filename*=UTF-8''{quote(filename)}"
    return Response(
        content=content,
        media_type=XLSX_MEDIA_TYPE,
        headers={"Content-Disposition": disposition},
    )
