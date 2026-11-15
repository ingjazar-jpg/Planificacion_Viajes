"""Contract tests for alert, budget and expense API schemas."""

from datetime import date, datetime, time, timezone
from decimal import Decimal
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.domain.enums import ActivityCategory, AlertEventType, AlertStatus, AlertType
from app.schemas.alerts import AlertEvaluateRequest, AlertEvaluationResponse
from app.schemas.budgets import BudgetInput, CategoryBudgetInput
from app.schemas.expenses import ExpenseCreate, ExpensePatch, ExpensePut

PERIOD_ID = uuid4()
ACTIVITY_ID = uuid4()


def test_alert_evaluation_requires_period_id():
    request = AlertEvaluateRequest(period_id=str(PERIOD_ID))
    assert request.period_id == PERIOD_ID


def test_alert_evaluation_rejects_unknown_fields():
    with pytest.raises(ValidationError):
        AlertEvaluateRequest(period_id=str(PERIOD_ID), extra="not-allowed")


def test_alert_evaluation_response_accepts_non_negative_counters():
    response = AlertEvaluationResponse(
        period_id=PERIOD_ID,
        evaluated_at=datetime.now(timezone.utc),
        created_count=1,
        activated_count=0,
        deactivated_count=2,
        reactivated_count=0,
        active_count=3,
    )
    assert response.active_count == 3


def test_alert_evaluation_response_rejects_negative_counters():
    with pytest.raises(ValidationError):
        AlertEvaluationResponse(
            period_id=PERIOD_ID,
            evaluated_at=datetime.now(timezone.utc),
            created_count=-1,
            activated_count=0,
            deactivated_count=0,
            reactivated_count=0,
            active_count=0,
        )


def test_category_budget_accepts_decimal_string():
    item = CategoryBudgetInput(category="Viajes", amount="1250.50")
    assert item.amount == Decimal("1250.50")


@pytest.mark.parametrize("value", [1250, 1250.5, "1,250.00", "1.234", "-1.00", "NaN", "Infinity"])
def test_category_budget_rejects_invalid_money(value):
    with pytest.raises(ValidationError):
        CategoryBudgetInput(category="Viajes", amount=value)


def test_budget_accepts_partial_category_distribution():
    budget = BudgetInput(
        total_budget="5000.00",
        category_budgets=[
            {"category": "Viajes", "amount": "2500.00"},
            {"category": "Alojamiento", "amount": "1500.00"},
        ],
    )
    assert len(budget.category_budgets) == 2
    assert budget.total_budget == Decimal("5000.00")


def test_budget_accepts_zero_total_and_empty_distribution():
    budget = BudgetInput(total_budget="0.00", category_budgets=[])
    assert budget.total_budget == Decimal("0.00")
    assert budget.category_budgets == []


def test_budget_rejects_allocations_above_total():
    with pytest.raises(ValidationError):
        BudgetInput(
            total_budget="100.00",
            category_budgets=[{"category": "Viajes", "amount": "100.01"}],
        )


def test_budget_rejects_duplicate_categories():
    with pytest.raises(ValidationError):
        BudgetInput(
            total_budget="100.00",
            category_budgets=[
                {"category": "Viajes", "amount": "20.00"},
                {"category": "Viajes", "amount": "30.00"},
            ],
        )


def test_budget_rejects_unknown_fields():
    with pytest.raises(ValidationError):
        BudgetInput(total_budget="100.00", category_budgets=[], period_id=str(PERIOD_ID))


def test_expense_create_accepts_optional_fields_omitted():
    expense = ExpenseCreate(
        period_id=str(PERIOD_ID),
        concept="  Transporte  ",
        amount="25000.00",
        date="2026-12-20",
        category="Transporte",
    )
    assert expense.concept == "Transporte"
    assert expense.description is None
    assert expense.activity_id is None
    assert expense.observations is None


def test_expense_create_normalizes_optional_text():
    expense = ExpenseCreate(
        period_id=PERIOD_ID,
        concept="Hospedaje",
        description="  ",
        amount="100.00",
        date=date(2026, 12, 20),
        category=ActivityCategory.LODGING,
        observations="  nota  ",
    )
    assert expense.description is None
    assert expense.observations == "nota"


@pytest.mark.parametrize("value", [0, 0.0, "0", "-1.00", "1.234", "NaN", "Infinity", "1,000.00"])
def test_expense_create_rejects_invalid_amount(value):
    with pytest.raises(ValidationError):
        ExpenseCreate(
            period_id=PERIOD_ID,
            concept="Gasto",
            amount=value,
            date="2026-12-20",
            category="Otros",
        )


def test_expense_create_rejects_empty_concept():
    with pytest.raises(ValidationError):
        ExpenseCreate(
            period_id=PERIOD_ID,
            concept="  ",
            amount="10.00",
            date="2026-12-20",
            category="Otros",
        )


def test_expense_create_rejects_unknown_fields():
    with pytest.raises(ValidationError):
        ExpenseCreate(
            period_id=PERIOD_ID,
            concept="Gasto",
            amount="10.00",
            date="2026-12-20",
            category="Otros",
            id=str(uuid4()),
        )


def test_expense_put_requires_all_editable_fields():
    with pytest.raises(ValidationError):
        ExpensePut(concept="Gasto", amount="10.00")


def test_expense_put_accepts_explicit_null_optional_fields():
    expense = ExpensePut(
        concept="Gasto",
        description=None,
        amount="10.00",
        date="2026-12-20",
        category="Otros",
        activity_id=None,
        observations=None,
    )
    assert expense.activity_id is None
    assert expense.description is None


def test_expense_patch_requires_at_least_one_field():
    with pytest.raises(ValidationError):
        ExpensePatch()


def test_expense_patch_accepts_one_editable_field():
    patch = ExpensePatch(amount="150.00")
    assert patch.amount == Decimal("150.00")
    assert patch.model_fields_set == {"amount"}


def test_expense_patch_allows_null_for_optional_text_and_activity():
    patch = ExpensePatch(description=None, activity_id=None, observations=None)
    assert patch.description is None
    assert patch.activity_id is None


@pytest.mark.parametrize("payload", [
    {"concept": None},
    {"amount": None},
    {"date": None},
    {"category": None},
])
def test_expense_patch_rejects_null_for_required_fields(payload):
    with pytest.raises(ValidationError):
        ExpensePatch(**payload)


def test_expense_patch_rejects_immutable_period_id():
    with pytest.raises(ValidationError):
        ExpensePatch(period_id=str(PERIOD_ID))


def test_expense_patch_rejects_invalid_money_string():
    with pytest.raises(ValidationError):
        ExpensePatch(amount="100.999")


def test_expense_create_accepts_activity_id_as_uuid():
    expense = ExpenseCreate(
        period_id=PERIOD_ID,
        concept="Actividad",
        amount="1.00",
        date="2026-12-20",
        category="Viajes",
        activity_id=ACTIVITY_ID,
    )
    assert expense.activity_id == ACTIVITY_ID
