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
