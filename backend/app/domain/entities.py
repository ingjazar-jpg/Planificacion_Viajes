"""Validated domain entities for periods and activities."""

from datetime import date, datetime, time
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.domain.enums import ActivityCategory, ActivityStatus, Priority


class DomainEntity(BaseModel):
    """Base model that rejects undeclared persisted attributes."""

    model_config = ConfigDict(extra="forbid", validate_assignment=True)


class Period(DomainEntity):
    id: UUID
    year: int = Field(ge=1)
    name: str = Field(min_length=1)
    start_date: date
    end_date: date
    created_at: datetime

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("El nombre del período no puede estar vacío.")
        return normalized

    @field_validator("created_at")
    @classmethod
    def require_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("created_at debe incluir zona horaria.")
        return value

    @model_validator(mode="after")
    def validate_period(self) -> "Period":
        if self.start_date > self.end_date:
            raise ValueError("start_date debe ser anterior o igual a end_date.")
        if self.year != self.start_date.year:
            raise ValueError("year debe corresponder al año de start_date.")
        return self


class Activity(DomainEntity):
    id: UUID
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
    status: ActivityStatus = ActivityStatus.PENDING
    created_at: datetime
    updated_at: datetime

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

    @field_validator("created_at", "updated_at")
    @classmethod
    def require_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("Los timestamps deben incluir zona horaria.")
        return value

    @model_validator(mode="after")
    def validate_schedule(self) -> "Activity":
        if self.start_date > self.end_date:
            raise ValueError("start_date debe ser anterior o igual a end_date.")
        if self.start_date == self.end_date and self.end_time <= self.start_time:
            raise ValueError(
                "Para actividades de un día, end_time debe ser posterior a start_time."
            )
        return self
