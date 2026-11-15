"""Tests for the validated JSON document root."""

from datetime import date, datetime, time, timezone
from decimal import Decimal
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.domain.entities import Activity, Budget, Expense, Period
from app.domain.enums import ActivityCategory, Priority
from app.persistence.document import DataDocument


NOW = datetime(2026, 11, 15, 10, 0, tzinfo=timezone.utc)


@pytest.fixture
def period():
    return Period(
        id=uuid4(),
        year=2026,
        name="Vacaciones 2026",
        start_date=date(2026, 12, 20),
        end_date=date(2027, 1, 10),
        created_at=NOW,
    )


@pytest.fixture
def activity(period):
    return Activity(
        id=uuid4(),
        period_id=period.id,
        name="Viaje",
        category=ActivityCategory.TRAVEL,
        start_date=date(2026, 12, 22),
        end_date=date(2026, 12, 24),
        start_time=time(8, 0),
        end_time=time(18, 0),
        priority=Priority.HIGH,
        created_at=NOW,
        updated_at=NOW,
    )


def test_empty_document_has_schema_version_and_empty_collections():
    document = DataDocument.empty(now=NOW)

    assert document.schema_version == "1.0"
    assert document.periods == []
    assert document.expenses == []


def test_document_accepts_valid_cross_year_period_and_activity(period, activity):
    document = DataDocument(
        metadata={"created_at": NOW, "updated_at": NOW},
        periods=[period],
        activities=[activity],
    )

    assert document.activities[0].period_id == period.id


def test_document_rejects_unknown_schema_version():
    with pytest.raises(ValidationError):
        DataDocument(
            schema_version="2.0",
            metadata={"created_at": NOW, "updated_at": NOW},
        )


def test_document_rejects_duplicate_ids_across_collections(period, activity):
    activity.id = period.id

    with pytest.raises(ValidationError, match="identificador"):
        DataDocument(
            metadata={"created_at": NOW, "updated_at": NOW},
            periods=[period],
            activities=[activity],
        )


def test_document_rejects_duplicate_period_year(period):
    second = period.model_copy(update={"id": uuid4()})

    with pytest.raises(ValidationError, match="período por año"):
        DataDocument(
            metadata={"created_at": NOW, "updated_at": NOW},
            periods=[period, second],
        )


def test_document_rejects_activity_outside_period(period, activity):
    outside_activity = activity.model_copy(
        update={
            "start_date": date(2027, 1, 11),
            "end_date": date(2027, 1, 12),
        }
    )

    with pytest.raises(ValidationError, match="dentro de su período"):
        DataDocument(
            metadata={"created_at": NOW, "updated_at": NOW},
            periods=[period],
            activities=[outside_activity],
        )


def test_document_rejects_alert_without_activity(period):
    from app.domain.entities import Alert
    from app.domain.enums import AlertType

    alert = Alert(
        id=uuid4(),
        activity_id=uuid4(),
        type=AlertType.UPCOMING,
        condition_active=True,
        created_at=NOW,
        updated_at=NOW,
    )
    with pytest.raises(ValidationError, match="actividad existente"):
        DataDocument(
            metadata={"created_at": NOW, "updated_at": NOW},
            periods=[period],
            alerts=[alert],
        )


def test_document_rejects_budget_without_period():
    budget = Budget(
        id=uuid4(),
        period_id=uuid4(),
        total_budget="1000.00",
        created_at=NOW,
        updated_at=NOW,
    )
    with pytest.raises(ValidationError, match="período existente"):
        DataDocument(
            metadata={"created_at": NOW, "updated_at": NOW},
            periods=[],
            budgets=[budget],
        )


def test_document_rejects_expense_activity_from_another_period(period, activity):
    from datetime import timedelta

    other_period = Period(
        id=uuid4(),
        year=2028,
        name="Vacaciones 2028",
        start_date=date(2028, 12, 20),
        end_date=date(2029, 1, 10),
        created_at=NOW,
    )
    expense = Expense(
        id=uuid4(),
        period_id=other_period.id,
        concept="Transporte",
        amount="100.00",
        date=date(2028, 12, 21),
        category=ActivityCategory.TRANSPORT,
        activity_id=activity.id,
        created_at=NOW,
        updated_at=NOW,
    )
    with pytest.raises(ValidationError, match="mismo período"):
        DataDocument(
            metadata={"created_at": NOW, "updated_at": NOW},
            periods=[period, other_period],
            activities=[activity],
            expenses=[expense],
        )


def test_document_serializes_decimal_as_json_string(period):
    budget = Budget(
        id=uuid4(),
        period_id=period.id,
        total_budget="1250.50",
        created_at=NOW,
        updated_at=NOW,
    )
    document = DataDocument(
        metadata={"created_at": NOW, "updated_at": NOW},
        periods=[period],
        budgets=[budget],
    )

    payload = document.model_dump(mode="json")

    assert payload["budgets"][0]["total_budget"] == "1250.50"
    assert isinstance(document.budgets[0].total_budget, Decimal)
