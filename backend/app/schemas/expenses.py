"""Pydantic schemas for expense and expense-history endpoints."""

import re
from datetime import date as Date, datetime
from decimal import Decimal, InvalidOperation
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.domain.enums import ActivityCategory, ExpenseModificationType

_MONEY_PATTERN = re.compile(r"^\d+(?:\.\d{1,2})?$")


def _parse_expense_amount(value: object) -> Decimal:
    """Accept only positive decimal strings with at most two fractional digits."""
    if not isinstance(value, str) or not _MONEY_PATTERN.fullmatch(value):
        raise ValueError("El importe debe ser una cadena decimal con máximo dos decimales.")
    try:
        amount = Decimal(value)
    except InvalidOperation as exc:
        raise ValueError("El importe no es un decimal válido.") from exc
    if not amount.is_finite() or amount <= 0:
        raise ValueError("El importe del gasto debe ser mayor que cero.")
    return amount


def _normalize_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    return normalized or None


class ExpenseCreate(BaseModel):
    """Request body for POST /expenses."""

    model_config = ConfigDict(extra="forbid")

    period_id: UUID
    concept: str = Field(min_length=1)
    description: str | None = None
    amount: Decimal
    date: Date
    category: ActivityCategory
    activity_id: UUID | None = None
    observations: str | None = None

    @field_validator("concept")
    @classmethod
    def normalize_concept(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("El concepto del gasto no puede estar vacío.")
        return normalized

    @field_validator("description", "observations")
    @classmethod
    def normalize_optional_fields(cls, value: str | None) -> str | None:
        return _normalize_optional_text(value)

    @field_validator("amount", mode="before")
    @classmethod
    def validate_amount(cls, value: object) -> Decimal:
        return _parse_expense_amount(value)


class ExpensePut(BaseModel):
    """Complete editable payload for PUT /expenses/{expense_id}."""

    model_config = ConfigDict(extra="forbid")

    concept: str = Field(min_length=1)
    description: str | None
    amount: Decimal
    date: Date
    category: ActivityCategory
    activity_id: UUID | None
    observations: str | None
    period_id: UUID | None = None

    @field_validator("concept")
    @classmethod
    def normalize_concept(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("El concepto del gasto no puede estar vacío.")
        return normalized

    @field_validator("description", "observations")
    @classmethod
    def normalize_optional_fields(cls, value: str | None) -> str | None:
        return _normalize_optional_text(value)

    @field_validator("amount", mode="before")
    @classmethod
    def validate_amount(cls, value: object) -> Decimal:
        return _parse_expense_amount(value)


class ExpensePatch(BaseModel):
    """Partial editable payload for PATCH /expenses/{expense_id}."""

    model_config = ConfigDict(extra="forbid")

    concept: str | None = None
    description: str | None = None
    amount: Decimal | None = None
    date: Date | None = None
    category: ActivityCategory | None = None
    activity_id: UUID | None = None
    observations: str | None = None
    period_id: UUID | None = None

    @field_validator("concept")
    @classmethod
    def normalize_concept(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if not normalized:
            raise ValueError("El concepto del gasto no puede estar vacío.")
        return normalized

    @field_validator("description", "observations")
    @classmethod
    def normalize_optional_fields(cls, value: str | None) -> str | None:
        return _normalize_optional_text(value)

    @field_validator("amount", mode="before")
    @classmethod
    def validate_amount(cls, value: object) -> Decimal | None:
        if value is None:
            return None
        return _parse_expense_amount(value)

    @model_validator(mode="after")
    def validate_patch_fields(self) -> "ExpensePatch":
        if not self.model_fields_set:
            raise ValueError("Debe enviarse al menos un campo editable.")
        non_nullable = {"concept", "amount", "date", "category"}
        for field_name in non_nullable & self.model_fields_set:
            if getattr(self, field_name) is None:
                raise ValueError(f"{field_name} no admite null.")
        if "period_id" in self.model_fields_set:
            raise ValueError("period_id es inmutable y no puede enviarse en PATCH.")
        return self


class ExpenseResponse(BaseModel):
    """Public representation of an expense."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    period_id: UUID
    concept: str
    description: str | None
    amount: Decimal
    date: Date
    category: ActivityCategory
    activity_id: UUID | None
    observations: str | None
    created_at: datetime
    updated_at: datetime


class ExpenseHistoryResponse(BaseModel):
    """Public representation of one expense history event."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    expense_id: UUID
    modification_type: ExpenseModificationType
    previous_values: dict[str, Any] | None
    new_values: dict[str, Any] | None
    modified_at: datetime
