"""Pydantic schemas for activity endpoints."""

from datetime import date, datetime, time
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.domain.enums import ActivityCategory, ActivityStatus, Priority


class ActivityFields(BaseModel):
    """Shared editable activity fields."""

    model_config = ConfigDict(extra="forbid")

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
    def validate_schedule(self):
        if self.start_date > self.end_date:
            raise ValueError("start_date debe ser anterior o igual a end_date.")
        if self.start_date == self.end_date and self.end_time <= self.start_time:
            raise ValueError("end_time debe ser posterior a start_time para actividades de un día.")
        return self


class ActivityCreate(ActivityFields):
    """Request body for POST /activities; status and IDs are server-managed."""

    period_id: UUID


class ActivityPut(ActivityFields):
    """Complete editable payload for PUT /activities/{activity_id}."""

    status: ActivityStatus


class ActivityPatch(BaseModel):
    """Partial editable payload for PATCH /activities/{activity_id}."""

    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1)
    description: str | None = None
    category: ActivityCategory | None = None
    destination: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    start_time: time | None = None
    end_time: time | None = None
    priority: Priority | None = None
    status: ActivityStatus | None = None

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
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
    def require_fields(self):
        if not self.model_fields_set:
            raise ValueError("PATCH debe incluir al menos un campo editable.")
        required_when_present = {
            "name", "category", "start_date", "end_date",
            "start_time", "end_time", "priority", "status",
        }
        for field in required_when_present & self.model_fields_set:
            if getattr(self, field) is None:
                raise ValueError(f"{field} no admite null.")
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
