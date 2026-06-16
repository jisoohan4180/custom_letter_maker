import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, Text, DateTime, func
from ..database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Course(Base):
    __tablename__ = "courses"

    id = Column(Text, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(Text, unique=True, nullable=False)
    description = Column(Text)
    front_msg = Column(Text)
    back_msg = Column(Text)
    created_at = Column(DateTime, default=_utcnow, server_default=func.now())
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow, server_default=func.now())
