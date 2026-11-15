"""Validated root document for the local JSON persistence layer."""

from datetime import datetime
from typing import Any, ClassVar
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.domain.entities import (
    Activity,
    Alert,
    Budget,
    Expense,
    ExpenseHistory,
    Period,
)


class DataMetadata(BaseModel):
    """Administrative timestamps stored beside the domain collections."""

    model_config = ConfigDict(extra="forbid")

    created_at: datetime
    updated_at: datetime

    @field_validator("created_at", "updated_at")
    @classmethod
    def require_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("Los timestamps de metadata deben incluir zona horaria.")
        return value


class DataDocument(BaseModel):
    """Complete, integrity-checked representation of datos_vacaciones.json."""

    model_config = ConfigDict(extra="forbid")

    SCHEMA_VERSION: ClassVar[str] = "1.0"

    schema_version: str = SCHEMA_VERSION
    metadata: DataMetadata
    periods: list[Period] = Field(default_factory=list)
    activities: list[Activity] = Field(default_factory=list)
    alerts: list[Alert] = Field(default_factory=list)
    budgets: list[Budget] = Field(default_factory=list)
    expenses: list[Expense] = Field(default_factory=list)
    expense_history: list[ExpenseHistory] = Field(default_factory=list)

    @field_validator("schema_version")
    @classmethod
    def validate_schema_version(cls, value: str) -> str:
        if value != cls.SCHEMA_VERSION:
            raise ValueError(f"Versión de esquema no compatible: {value}.")
        return value

    @model_validator(mode="after")
    def validate_document_integrity(self) -> "DataDocument":
        collections: tuple[tuple[str, list[Any]], ...] = (
            ("periods", self.periods),
            ("activities", self.activities),
            ("alerts", self.alerts),
            ("budgets", self.budgets),
            ("expenses", self.expenses),
            ("expense_history", self.expense_history),
        )

        all_ids: set[UUID] = set()
        for collection_name, records in collections:
            for record in records:
                if record.id in all_ids:
                    raise ValueError(
                        f"El identificador {record.id} está duplicado en el documento."
                    )
                all_ids.add(record.id)

        periods_by_id = {item.id: item for item in self.periods}
        activities_by_id = {item.id: item for item in self.activities}
        expenses_by_id = {item.id: item for item in self.expenses}

        years = [item.year for item in self.periods]
        if len(years) != len(set(years)):
            raise ValueError("Solo puede existir un período por año.")

        for activity in self.activities:
            period = periods_by_id.get(activity.period_id)
            if period is None:
                raise ValueError("Toda actividad debe referenciar un período existente.")
            if (
                activity.start_date < period.start_date
                or activity.end_date > period.end_date
            ):
                raise ValueError("La actividad debe permanecer dentro de su período.")

        alert_keys = [(item.activity_id, item.type) for item in self.alerts]
        if len(alert_keys) != len(set(alert_keys)):
            raise ValueError("No puede repetirse una alerta por actividad y tipo.")
        for alert in self.alerts:
            if alert.activity_id not in activities_by_id:
                raise ValueError("Toda alerta debe referenciar una actividad existente.")

        budget_period_ids = [item.period_id for item in self.budgets]
        if len(budget_period_ids) != len(set(budget_period_ids)):
            raise ValueError("Solo puede existir un presupuesto por período.")
        for budget in self.budgets:
            if budget.period_id not in periods_by_id:
                raise ValueError("Todo presupuesto debe referenciar un período existente.")

        for expense in self.expenses:
            if expense.period_id not in periods_by_id:
                raise ValueError("Todo gasto debe referenciar un período existente.")
            if expense.activity_id is not None:
                activity = activities_by_id.get(expense.activity_id)
                if activity is None:
                    raise ValueError("La actividad asociada al gasto no existe.")
                if activity.period_id != expense.period_id:
                    raise ValueError(
                        "La actividad asociada al gasto debe pertenecer al mismo período."
                    )

        for history in self.expense_history:
            if history.expense_id not in expenses_by_id:
                raise ValueError("Todo historial debe referenciar un gasto existente.")

        return self

    @classmethod
    def empty(cls, *, now: datetime) -> "DataDocument":
        """Build an empty document using the supplied timezone-aware timestamp."""
        return cls(
            metadata=DataMetadata(created_at=now, updated_at=now),
        )
