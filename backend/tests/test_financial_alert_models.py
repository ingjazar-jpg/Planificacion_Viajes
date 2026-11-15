"""Tests for alerts, budgets, expenses and their audit records."""

from datetime import datetime, timezone
from decimal import Decimal
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.domain.entities import Alert, Budget, Expense, ExpenseHistory
from app.domain.enums import (
    ActivityCategory,
    AlertEventType,
    AlertStatus,
    AlertType,
    ExpenseModificationType,
)


@pytest.fixture
def timestamps():
    now = datetime(2026, 11, 15, 10, 0, tzinfo=timezone.utc)
    return {"created_at": now, "updated_at": now}


def test_alert_defaults_to_pending_and_keeps_event_history(timestamps):
    alert = Alert(
        id=uuid4(),
        activity_id=uuid4(),
        type=AlertType.UPCOMING,
        condition_active=True,
        **timestamps,
        history=[
            {
                "event_type": AlertEventType.CREATED,
                "occurred_at": timestamps["created_at"],
            }
        ],
    )

    assert alert.status is AlertStatus.PENDING
    assert len(alert.history) == 1
    assert alert.history[0].event_type is AlertEventType.CREATED


def test_alert_rejects_naive_audit_timestamp(timestamps):
    timestamps["updated_at"] = datetime(2026, 11, 15, 10, 0)
    with pytest.raises(ValidationError):
        Alert(
            id=uuid4(),
            activity_id=uuid4(),
            type=AlertType.OVERDUE,
            condition_active=True,
            **timestamps,
        )


def test_budget_accepts_partial_category_distribution(timestamps):
    budget = Budget(
        id=uuid4(),
        period_id=uuid4(),
        total_budget="1000000.00",
        category_budgets=[
            {"category": ActivityCategory.TRAVEL, "amount": "400000"},
            {"category": ActivityCategory.LODGING, "amount": "250000.50"},
        ],
        **timestamps,
    )

    assert budget.total_budget == Decimal("1000000.00")
    assert sum(item.amount for item in budget.category_budgets) == Decimal("650000.50")


def test_budget_rejects_distribution_above_total(timestamps):
    with pytest.raises(ValidationError):
        Budget(
            id=uuid4(),
            period_id=uuid4(),
            total_budget="100000",
            category_budgets=[
                {"category": ActivityCategory.TRAVEL, "amount": "60000"},
                {"category": ActivityCategory.TRANSPORT, "amount": "50000"},
            ],
            **timestamps,
        )


@pytest.mark.parametrize("amount", ["10.001", "NaN", "Infinity", "-1", 10.0])
def test_budget_rejects_invalid_money_values(timestamps, amount):
    with pytest.raises(ValidationError):
        Budget(
            id=uuid4(),
            period_id=uuid4(),
            total_budget=amount,
            **timestamps,
        )


def test_expense_accepts_optional_activity_and_normalizes_text(timestamps):
    expense = Expense(
        id=uuid4(),
        period_id=uuid4(),
        concept="  Transporte aeropuerto  ",
        description="  Traslado  ",
        amount="125000.50",
        date="2026-12-22",
        category=ActivityCategory.TRANSPORT,
        activity_id=None,
        observations="   ",
        **timestamps,
    )

    assert expense.concept == "Transporte aeropuerto"
    assert expense.description == "Traslado"
    assert expense.observations is None
    assert expense.amount == Decimal("125000.50")
    assert expense.activity_id is None


@pytest.mark.parametrize("amount", ["0", "0.00", "1.001", "-2", 25.5])
def test_expense_rejects_invalid_money_values(timestamps, amount):
    with pytest.raises(ValidationError):
        Expense(
            id=uuid4(),
            period_id=uuid4(),
            concept="Hospedaje",
            amount=amount,
            date="2026-12-22",
            category=ActivityCategory.LODGING,
            **timestamps,
        )


def test_expense_rejects_blank_concept(timestamps):
    with pytest.raises(ValidationError):
        Expense(
            id=uuid4(),
            period_id=uuid4(),
            concept="   ",
            amount="100",
            date="2026-12-22",
            category=ActivityCategory.LODGING,
            **timestamps,
        )


def test_expense_history_accepts_creation_snapshot(timestamps):
    history = ExpenseHistory(
        id=uuid4(),
        expense_id=uuid4(),
        modification_type=ExpenseModificationType.CREATION,
        previous_values=None,
        new_values={"concept": "Hotel", "amount": "250000.00"},
        modified_at=timestamps["created_at"],
    )

    assert history.modification_type is ExpenseModificationType.CREATION
    assert history.previous_values is None
    assert history.new_values["amount"] == "250000.00"


def test_expense_history_rejects_naive_timestamp(timestamps):
    with pytest.raises(ValidationError):
        ExpenseHistory(
            id=uuid4(),
            expense_id=uuid4(),
            modification_type=ExpenseModificationType.EDITION,
            previous_values={"concept": "Hotel"},
            new_values={"concept": "Hotel centro"},
            modified_at=datetime(2026, 11, 15, 10, 0),
        )
