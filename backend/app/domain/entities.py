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

# Additional entities defined by DATA-001.

from decimal import Decimal
from typing import Any

from pydantic import field_validator

from app.domain.enums import (
    AlertEventType,
    AlertStatus,
    AlertType,
    ExpenseModificationType,
)


def _validate_money(value: Any, *, allow_zero: bool) -> Decimal:
    """Accept decimal strings or Decimal values; never accept binary floats."""
    if isinstance(value, bool) or isinstance(value, float):
        raise ValueError("Los importes deben proporcionarse como cadenas decimales.")
    if not isinstance(value, (str, Decimal)):
        raise ValueError("El importe debe ser una cadena decimal.")
    try:
        amount = Decimal(value)
    except Exception as exc:
        raise ValueError("El importe no es un decimal válido.") from exc
    if not amount.is_finite():
        raise ValueError("El importe debe ser un número decimal finito.")
    if amount.as_tuple().exponent < -2:
        raise ValueError("El importe no puede tener más de dos decimales.")
    if amount < 0 or (not allow_zero and amount == 0):
        qualifier = "cero o positivo" if allow_zero else "mayor que cero"
        raise ValueError(f"El importe debe ser {qualifier}.")
    return amount


class AlertHistoryEvent(DomainEntity):
    event_type: AlertEventType
    occurred_at: datetime

    @field_validator("occurred_at")
    @classmethod
    def require_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("occurred_at debe incluir zona horaria.")
        return value


class Alert(DomainEntity):
    id: UUID
    activity_id: UUID
    type: AlertType
    status: AlertStatus = AlertStatus.PENDING
    condition_active: bool
    created_at: datetime
    updated_at: datetime
    reviewed_at: datetime | None = None
    history: list[AlertHistoryEvent] = Field(default_factory=list)

    @field_validator("created_at", "updated_at", "reviewed_at")
    @classmethod
    def require_timezone(cls, value: datetime | None) -> datetime | None:
        if value is not None and (value.tzinfo is None or value.utcoffset() is None):
            raise ValueError("Los timestamps de alerta deben incluir zona horaria.")
        return value


class CategoryBudget(DomainEntity):
    category: ActivityCategory
    amount: Decimal

    @field_validator("amount", mode="before")
    @classmethod
    def validate_amount(cls, value: Any) -> Decimal:
        return _validate_money(value, allow_zero=True)


class Budget(DomainEntity):
    id: UUID
    period_id: UUID
    total_budget: Decimal
    category_budgets: list[CategoryBudget] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    @field_validator("total_budget", mode="before")
    @classmethod
    def validate_total_budget(cls, value: Any) -> Decimal:
        return _validate_money(value, allow_zero=True)

    @field_validator("created_at", "updated_at")
    @classmethod
    def require_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("Los timestamps de presupuesto deben incluir zona horaria.")
        return value

    @model_validator(mode="after")
    def validate_category_distribution(self) -> "Budget":
        allocated = sum(
            (item.amount for item in self.category_budgets),
            start=Decimal("0"),
        )
        if allocated > self.total_budget:
            raise ValueError(
                "La suma de presupuestos por categoría no puede superar el presupuesto general."
            )
        return self


class Expense(DomainEntity):
    id: UUID
    period_id: UUID
    concept: str = Field(min_length=1)
    description: str | None = None
    amount: Decimal
    date: date
    category: ActivityCategory
    activity_id: UUID | None = None
    observations: str | None = None
    created_at: datetime
    updated_at: datetime

    @field_validator("concept")
    @classmethod
    def normalize_concept(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("El concepto del gasto no puede estar vacío.")
        return normalized

    @field_validator("description", "observations")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @field_validator("amount", mode="before")
    @classmethod
    def validate_amount(cls, value: Any) -> Decimal:
        return _validate_money(value, allow_zero=False)

    @field_validator("created_at", "updated_at")
    @classmethod
    def require_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("Los timestamps del gasto deben incluir zona horaria.")
        return value


class ExpenseHistory(DomainEntity):
    id: UUID
    expense_id: UUID
    modification_type: ExpenseModificationType
    previous_values: dict[str, Any] | None = None
    new_values: dict[str, Any] | None = None
    modified_at: datetime

    @field_validator("modified_at")
    @classmethod
    def require_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("modified_at debe incluir zona horaria.")
        return value
