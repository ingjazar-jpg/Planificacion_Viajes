"""Pydantic schemas for budget endpoints."""

import re
from datetime import datetime
from decimal import Decimal, InvalidOperation
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.domain.enums import ActivityCategory

_MONEY_PATTERN = re.compile(r"^\d+(?:\.\d{1,2})?$")


def _parse_money_string(value: object, *, allow_zero: bool) -> Decimal:
    """Accept only decimal strings with at most two fractional digits."""
    if not isinstance(value, str) or not _MONEY_PATTERN.fullmatch(value):
        raise ValueError("El importe debe ser una cadena decimal con máximo dos decimales.")
    try:
        amount = Decimal(value)
    except InvalidOperation as exc:
        raise ValueError("El importe no es un decimal válido.") from exc
    if not amount.is_finite():
        raise ValueError("El importe debe ser finito.")
    if amount < 0 or (not allow_zero and amount == 0):
        qualifier = "no puede ser negativo" if allow_zero else "debe ser mayor que cero"
        raise ValueError(f"El importe {qualifier}.")
    return amount


class CategoryBudgetInput(BaseModel):
    """One category allocation accepted by POST/PUT budget."""

    model_config = ConfigDict(extra="forbid")

    category: ActivityCategory
    amount: Decimal

    @field_validator("amount", mode="before")
    @classmethod
    def validate_amount(cls, value: object) -> Decimal:
        return _parse_money_string(value, allow_zero=True)


class BudgetInput(BaseModel):
    """Complete editable budget payload for POST and PUT."""

    model_config = ConfigDict(extra="forbid")

    total_budget: Decimal
    category_budgets: list[CategoryBudgetInput]

    @field_validator("total_budget", mode="before")
    @classmethod
    def validate_total_budget(cls, value: object) -> Decimal:
        return _parse_money_string(value, allow_zero=True)

    @model_validator(mode="after")
    def validate_allocations(self) -> "BudgetInput":
        categories = [item.category for item in self.category_budgets]
        if len(categories) != len(set(categories)):
            raise ValueError("No se permiten categorías presupuestarias repetidas.")
        allocated = sum((item.amount for item in self.category_budgets), Decimal("0"))
        if allocated > self.total_budget:
            raise ValueError("La suma de asignaciones no puede superar el presupuesto general.")
        return self


class CategoryBudgetResponse(BaseModel):
    """One normalized category allocation in a budget response."""

    model_config = ConfigDict(from_attributes=True)

    category: ActivityCategory
    amount: Decimal


class CategoryBudgetExecutionResponse(BaseModel):
    """Category allocation and its calculated execution indicators."""

    model_config = ConfigDict(from_attributes=True)

    category: ActivityCategory
    allocated_amount: Decimal
    spent_amount: Decimal
    balance: Decimal
    over_budget: bool


class BudgetResponse(BaseModel):
    """Persisted budget representation."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    period_id: UUID
    total_budget: Decimal
    category_budgets: list[CategoryBudgetResponse]
    created_at: datetime
    updated_at: datetime


class BudgetExecutionResponse(BaseModel):
    """Budget plus calculated financial indicators returned by GET."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    period_id: UUID
    total_budget: Decimal
    total_expenses: Decimal
    general_balance: Decimal
    execution_percentage: Decimal
    category_budgets: list[CategoryBudgetExecutionResponse]
    created_at: datetime
    updated_at: datetime

 
class CategoryBudgetAmount(BaseModel):
    category: ActivityCategory
    amount: str


class BudgetCreateResponse(BaseModel):
    id: UUID
    period_id: UUID
    total_budget: str
    category_budgets: list[CategoryBudgetAmount]
    created_at: datetime
    updated_at: datetime
