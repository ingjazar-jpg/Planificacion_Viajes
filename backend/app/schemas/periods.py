"""Pydantic schemas for period endpoints."""

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class PeriodInput(BaseModel):
    """Fields accepted from clients when creating or replacing a period."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    start_date: date
    end_date: date

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("El nombre del período no puede estar vacío.")
        return normalized

    @model_validator(mode="after")
    def validate_date_range(self) -> "PeriodInput":
        if self.start_date > self.end_date:
            raise ValueError("start_date debe ser anterior o igual a end_date.")
        return self


class PeriodCreate(PeriodInput):
    """Request body for POST /periods."""


class PeriodUpdate(PeriodInput):
    """Request body for PUT /periods/{period_id}."""


class PeriodResponse(BaseModel):
    """Public representation of a period."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    year: int
    name: str
    start_date: date
    end_date: date
    created_at: datetime
