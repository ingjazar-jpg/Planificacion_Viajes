"""Response schema for calendar activity queries."""

from datetime import date, time
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.domain.enums import ActivityCategory, ActivityStatus, Priority


class CalendarActivityResponse(BaseModel):
    """Public activity representation enriched with a derived overdue flag."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    period_id: UUID
    name: str
    description: str | None
    category: ActivityCategory
    destination: str | None
    start_date: date
    end_date: date
    start_time: time
    end_time: time
    priority: Priority
    status: ActivityStatus
    is_overdue: bool
