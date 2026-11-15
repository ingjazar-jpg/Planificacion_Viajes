"""Pydantic schemas for activity endpoints."""

from datetime import date, datetime, time
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.domain.enums import ActivityCategory, ActivityStatus, Priority


class ActivityCreate(BaseModel):
    """Request body for POST /activities; status and IDs are server-managed."""

    model_config = ConfigDict(extra="forbid")

    period_id: UUID
    name: str = Field(min_length=1)
    description: str | None = None
    category: ActivityCategory
    destination: str | None = None
    start_date: date
    end_date: date
    start_time: time
    end_time: time
    priority: Priority

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("El nombre de la actividad no puede estar vacío.")
        return normalized

    @field_validator("description", "destination")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @model_validator(mode="after")
    def validate_schedule(self) -> "ActivityCreate":
        if self.start_date > self.end_date:
            raise ValueError("start_date debe ser anterior o igual a end_date.")
        if self.start_date == self.end_date and self.end_time <= self.start_time:
            raise ValueError(
                "Para actividades de un día, end_time debe ser posterior a start_time."
            )
        return self


class ActivityResponse(BaseModel):
    """Public representation of an activity."""

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
    created_at: datetime
    updated_at: datetime
