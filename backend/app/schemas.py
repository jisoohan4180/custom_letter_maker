import os
from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator


class CourseOut(BaseModel):
    """과정 응답 스키마. SQLAlchemy Course 객체에서 직렬화한다."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str = ""
    front_msg: str = ""
    back_msg: str = ""
    created_at: datetime | None = None
    updated_at: datetime | None = None

    @field_validator("description", "front_msg", "back_msg", mode="before")
    @classmethod
    def _none_to_empty(cls, value: str | None) -> str:
        # DB 의 NULL 값을 빈 문자열로 정규화 (프론트엔드는 항상 문자열을 기대)
        return value or ""


# 과정 설명 최대 길이 — 웹에서 긁어온 내용을 붙여넣을 수 있도록 넉넉하게.
# 환경변수 COURSE_DESCRIPTION_MAX 로 조정 가능 (기본 5000자).
DESCRIPTION_MAX = int(os.getenv("COURSE_DESCRIPTION_MAX", "5000"))
# 앞/뒤 고정 멘트 최대 길이 (무제한 입력으로 인한 저장 abuse 방지)
MESSAGE_MAX = 2000


class CourseCreate(BaseModel):
    """과정 추가/수정 요청 스키마."""

    name: str
    description: str = ""
    front_msg: str = ""
    back_msg: str = ""

    @field_validator("description", "front_msg", "back_msg", mode="before")
    @classmethod
    def _none_to_empty(cls, value: str | None) -> str:
        return value or ""

    @field_validator("name")
    @classmethod
    def _name_required(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("과정명을 입력해주세요")
        return value

    @field_validator("description")
    @classmethod
    def _description_max(cls, value: str) -> str:
        if len(value) > DESCRIPTION_MAX:
            raise ValueError(f"과정 설명은 {DESCRIPTION_MAX}자 이내여야 합니다")
        return value

    @field_validator("front_msg", "back_msg")
    @classmethod
    def _message_max(cls, value: str) -> str:
        if len(value) > MESSAGE_MAX:
            raise ValueError(f"고정 멘트는 {MESSAGE_MAX}자 이내여야 합니다")
        return value


class CourseUpdate(CourseCreate):
    """과정 수정 요청 스키마 (생성과 동일 필드)."""
