"""Pydantic schemas for alert endpoints."""

from datetime import date, datetime, time
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.domain.enums import (
    ActivityStatus,
    AlertEventType,
    AlertStatus,
    AlertType,
    Priority,
)


class AlertHistoryEventResponse(BaseModel):
    """Public representation of one alert history event."""

    model_config = ConfigDict(from_attributes=True)

    event_type: AlertEventType
    occurred_at: datetime


class AlertActivitySummary(BaseModel):
    """Read-only activity projection embedded in an alert response."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    start_date: date
    end_date: date
    start_time: time
    end_time: time
    priority: Priority
    status: ActivityStatus


class AlertResponse(BaseModel):
    """Public representation of an alert, including its activity and history."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    activity_id: UUID
    type: AlertType
    status: AlertStatus
    condition_active: bool
    created_at: datetime
    updated_at: datetime
    reviewed_at: datetime | None
    activity: AlertActivitySummary
    history: list[AlertHistoryEventResponse] = Field(default_factory=list)


class AlertEvaluateRequest(BaseModel):
    """Request body for POST /alerts/evaluate."""

    model_config = ConfigDict(extra="forbid")

    period_id: UUID


class AlertEvaluationResponse(BaseModel):
    """Summary returned after evaluating one period's alert conditions."""

    model_config = ConfigDict(from_attributes=True)

    period_id: UUID
    evaluated_at: datetime
    created_count: int = Field(ge=0)
    activated_count: int = Field(ge=0)
    deactivated_count: int = Field(ge=0)
    reactivated_count: int = Field(ge=0)
    active_count: int = Field(ge=0)
