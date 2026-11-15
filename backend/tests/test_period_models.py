"""Tests for the first backend domain slice: periods."""

from datetime import date, datetime, timezone
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.domain.entities import Period
from app.schemas.periods import PeriodCreate, PeriodResponse, PeriodUpdate


@pytest.fixture
 def valid_period_data():
    return {
        "id": uuid4(),
        "year": 2026,
        "name": " Vacaciones decembrinas 2026 ",
        "start_date": date(2026, 12, 20),
        "end_date": date(2027, 1, 10),
        "created_at": datetime(2026, 11, 15, 10, 0, tzinfo=timezone.utc),
    }


def test_period_accepts_cross_year_range(valid_period_data):
    period = Period.model_validate(valid_period_data)

    assert period.year == 2026
    assert period.start_date.year != period.end_date.year
    assert period.name == "Vacaciones decembrinas 2026"


def test_period_rejects_year_different_from_start_date(valid_period_data):
    valid_period_data["year"] = 2027

    with pytest.raises(ValidationError):
        Period.model_validate(valid_period_data)


def test_period_rejects_reversed_dates(valid_period_data):
    valid_period_data["start_date"] = date(2027, 1, 10)
    valid_period_data["end_date"] = date(2026, 12, 20)

    with pytest.raises(ValidationError):
        Period.model_validate(valid_period_data)


def test_period_requires_timezone_aware_timestamp(valid_period_data):
    valid_period_data["created_at"] = datetime(2026, 11, 15, 10, 0)

    with pytest.raises(ValidationError):
        Period.model_validate(valid_period_data)


def test_period_create_rejects_server_managed_fields():
    with pytest.raises(ValidationError):
        PeriodCreate(
            name="Vacaciones 2026",
            start_date="2026-12-20",
            end_date="2027-01-10",
            year=2026,
        )


def test_period_create_rejects_reversed_dates():
    with pytest.raises(ValidationError):
        PeriodCreate(
            name="Vacaciones 2026",
            start_date="2027-01-10",
            end_date="2026-12-20",
        )


def test_period_update_requires_complete_editable_payload():
    with pytest.raises(ValidationError):
        PeriodUpdate(name="Vacaciones 2026", start_date="2026-12-20")


def test_period_response_serializes_public_contract(valid_period_data):
    period = Period.model_validate(valid_period_data)
    response = PeriodResponse.model_validate(period)

    assert response.id == period.id
    assert response.year == 2026
