"""Tests for activity domain invariants and initial status."""

from datetime import date, datetime, time, timezone
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.domain.entities import Activity
from app.domain.enums import ActivityCategory, ActivityStatus, Priority


@pytest.fixture
def valid_activity_data():
    now = datetime(2026, 11, 15, 10, 0, tzinfo=timezone.utc)
    return {
        "id": uuid4(),
        "period_id": uuid4(),
        "name": " Viaje familiar ",
        "description": " Viaje de vacaciones ",
        "category": ActivityCategory.TRAVEL,
        "destination": " Santa Marta ",
        "start_date": date(2026, 12, 22),
        "end_date": date(2026, 12, 27),
        "start_time": time(8, 0),
        "end_time": time(18, 0),
        "priority": Priority.HIGH,
        "created_at": now,
        "updated_at": now,
    }


def test_activity_defaults_to_pending(valid_activity_data):
    activity = Activity.model_validate(valid_activity_data)

    assert activity.status is ActivityStatus.PENDING
    assert activity.name == "Viaje familiar"
    assert activity.description == "Viaje de vacaciones"
    assert activity.destination == "Santa Marta"


def test_activity_rejects_client_managed_status(valid_activity_data):
    valid_activity_data["status"] = ActivityStatus.COMPLETED

    # Domain entities accept persisted status; the API create schema must reject it.
    activity = Activity.model_validate(valid_activity_data)
    assert activity.status is ActivityStatus.COMPLETED


def test_activity_rejects_reversed_dates(valid_activity_data):
    valid_activity_data["start_date"] = date(2026, 12, 27)
    valid_activity_data["end_date"] = date(2026, 12, 22)

    with pytest.raises(ValidationError):
        Activity.model_validate(valid_activity_data)


def test_same_day_activity_requires_end_after_start(valid_activity_data):
    valid_activity_data["end_date"] = valid_activity_data["start_date"]
    valid_activity_data["start_time"] = time(18, 0)
    valid_activity_data["end_time"] = time(8, 0)

    with pytest.raises(ValidationError):
        Activity.model_validate(valid_activity_data)


def test_activity_requires_timezone_aware_timestamps(valid_activity_data):
    valid_activity_data["updated_at"] = datetime(2026, 11, 15, 10, 0)

    with pytest.raises(ValidationError):
        Activity.model_validate(valid_activity_data)


def test_activity_rejects_unknown_category(valid_activity_data):
    valid_activity_data["category"] = "Compras"

    with pytest.raises(ValidationError):
        Activity.model_validate(valid_activity_data)


def test_activity_rejects_unknown_priority(valid_activity_data):
    valid_activity_data["priority"] = "Urgente"

    with pytest.raises(ValidationError):
        Activity.model_validate(valid_activity_data)


def test_activity_rejects_unknown_status(valid_activity_data):
    valid_activity_data["status"] = "En espera"

    with pytest.raises(ValidationError):
        Activity.model_validate(valid_activity_data)
