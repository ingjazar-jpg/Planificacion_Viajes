"""Contract and business-rule tests for the calendar endpoint."""

from datetime import datetime
from uuid import uuid4
from zoneinfo import ZoneInfo

from fastapi.testclient import TestClient

from app.main import create_app
from app.persistence.json_repository import JsonRepository
from app.services.calendar_service import CalendarService


BOGOTA = ZoneInfo("America/Bogota")


def _client(tmp_path):
    return TestClient(create_app(repository=JsonRepository(tmp_path / "data.json")))


def _period(client):
    response = client.post("/api/v1/periods", json={
        "name": "Vacaciones 2026",
        "start_date": "2026-12-01",
        "end_date": "2027-01-31",
    })
    assert response.status_code == 201
    return response.json()["data"]


def _activity(client, period_id, **overrides):
    payload = {
        "period_id": period_id,
        "name": "Actividad calendario",
        "description": "Detalle",
        "category": "Viajes",
        "destination": "Santa Marta",
        "start_date": "2026-12-10",
        "end_date": "2026-12-10",
        "start_time": "08:00",
        "end_time": "10:00",
        "priority": "Alta",
    }
    payload.update(overrides)
    response = client.post("/api/v1/activities", json=payload)
    assert response.status_code == 201, response.text
    return response.json()["data"]


def _query(period_id, start="2026-12-01", end="2026-12-31", **filters):
    return {
        "period_id": period_id,
        "start_date": start,
        "end_date": end,
        **filters,
    }


def test_calendar_requires_period_and_date_range_parameters(tmp_path):
    client = _client(tmp_path)
    period = _period(client)
    response = client.get("/api/v1/calendar", params={"period_id": period["id"]})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_calendar_rejects_unknown_parameters_and_pagination(tmp_path):
    client = _client(tmp_path)
    period = _period(client)
    params = _query(period["id"], page=1, page_size=10)
    response = client.get("/api/v1/calendar", params=params)
    assert response.status_code == 422


def test_calendar_rejects_reversed_or_invalid_date_range(tmp_path):
    client = _client(tmp_path)
    period = _period(client)
    reversed_range = client.get(
        "/api/v1/calendar",
        params=_query(period["id"], start="2026-12-20", end="2026-12-10"),
    )
    invalid_date = client.get(
        "/api/v1/calendar",
        params=_query(period["id"], start="not-a-date"),
    )
    assert reversed_range.status_code == 422
    assert invalid_date.status_code == 422


def test_calendar_returns_not_found_for_unknown_period(tmp_path):
    client = _client(tmp_path)
    response = client.get(
        "/api/v1/calendar",
        params=_query(str(uuid4())),
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "PERIOD_NOT_FOUND"


def test_calendar_includes_intersecting_multiday_activity_once_with_original_dates(tmp_path):
    client = _client(tmp_path)
    period = _period(client)
    activity = _activity(
        client,
        period["id"],
        start_date="2026-12-09",
        end_date="2026-12-13",
    )

    response = client.get(
        "/api/v1/calendar",
        params=_query(period["id"], start="2026-12-11", end="2026-12-11"),
    )

    assert response.status_code == 200
    assert len(response.json()["data"]) == 1
    item = response.json()["data"][0]
    assert item["id"] == activity["id"]
    assert item["start_date"] == "2026-12-09"
    assert item["end_date"] == "2026-12-13"
    assert "created_at" not in item
    assert "updated_at" not in item


def test_calendar_applies_combined_category_priority_and_status_filters(tmp_path):
    client = _client(tmp_path)
    period = _period(client)
    matching = _activity(client, period["id"])
    _activity(
        client,
        period["id"],
        name="Otra categoría",
        category="Turismo",
        start_date="2026-12-11",
        end_date="2026-12-11",
    )
    _activity(
        client,
        period["id"],
        name="Otra prioridad",
        priority="Baja",
        start_date="2026-12-12",
        end_date="2026-12-12",
    )

    response = client.get(
        "/api/v1/calendar",
        params=_query(
            period["id"],
            category="Viajes",
            priority="Alta",
            status="Pendiente",
        ),
    )

    assert response.status_code == 200
    assert [item["id"] for item in response.json()["data"]] == [matching["id"]]


def test_calendar_includes_cancelled_activities_when_status_filter_is_omitted(tmp_path):
    client = _client(tmp_path)
    period = _period(client)
    activity = _activity(client, period["id"])
    cancelled = client.patch(
        f"/api/v1/activities/{activity['id']}",
        json={"status": "Cancelada"},
    )
    assert cancelled.status_code == 200

    included = client.get("/api/v1/calendar", params=_query(period["id"]))
    excluded = client.get(
        "/api/v1/calendar",
        params=_query(period["id"], status="Pendiente"),
    )

    assert included.status_code == 200
    assert [item["id"] for item in included.json()["data"]] == [activity["id"]]
    assert included.json()["data"][0]["status"] == "Cancelada"
    assert excluded.json()["data"] == []


def test_calendar_overdue_flag_uses_end_of_final_date_and_active_statuses(
    tmp_path, monkeypatch
):
    client = _client(tmp_path)
    period = _period(client)
    pending = _activity(
        client, period["id"], name="Pendiente",
        start_date="2026-12-10", end_date="2026-12-10",
    )
    in_progress = _activity(
        client, period["id"], name="En progreso",
        start_date="2026-12-11", end_date="2026-12-11",
    )
    completed = _activity(
        client, period["id"], name="Completada",
        start_date="2026-12-12", end_date="2026-12-12",
    )
    cancelled = _activity(
        client, period["id"], name="Cancelada",
        start_date="2026-12-13", end_date="2026-12-13",
    )
    assert client.patch(
        f"/api/v1/activities/{in_progress['id']}",
        json={"status": "En progreso"},
    ).status_code == 200
    assert client.patch(
        f"/api/v1/activities/{completed['id']}",
        json={"status": "En progreso"},
    ).status_code == 200
    assert client.patch(
        f"/api/v1/activities/{completed['id']}",
        json={"status": "Completada"},
    ).status_code == 200
    assert client.patch(
        f"/api/v1/activities/{cancelled['id']}",
        json={"status": "Cancelada"},
    ).status_code == 200

    monkeypatch.setattr(
        CalendarService,
        "now",
        staticmethod(lambda: datetime(2026, 12, 20, 12, 0, tzinfo=BOGOTA)),
    )
    response = client.get(
        "/api/v1/calendar",
        params=_query(period["id"], start="2026-12-10", end="2026-12-13"),
    )

    assert response.status_code == 200
    overdue_by_id = {item["id"]: item["is_overdue"] for item in response.json()["data"]}
    assert overdue_by_id == {
        pending["id"]: True,
        in_progress["id"]: True,
        completed["id"]: False,
        cancelled["id"]: False,
    }


def test_calendar_overdue_boundary_is_midnight_after_final_date(tmp_path, monkeypatch):
    client = _client(tmp_path)
    period = _period(client)
    activity = _activity(client, period["id"])

    monkeypatch.setattr(
        CalendarService,
        "now",
        staticmethod(lambda: datetime(2026, 12, 10, 23, 59, tzinfo=BOGOTA)),
    )
    before = client.get(
        "/api/v1/calendar",
        params=_query(period["id"]),
    )
    assert before.json()["data"][0]["is_overdue"] is False

    monkeypatch.setattr(
        CalendarService,
        "now",
        staticmethod(lambda: datetime(2026, 12, 11, 0, 0, tzinfo=BOGOTA)),
    )
    at_boundary = client.get(
        "/api/v1/calendar",
        params=_query(period["id"]),
    )
    assert at_boundary.json()["data"][0]["is_overdue"] is True
