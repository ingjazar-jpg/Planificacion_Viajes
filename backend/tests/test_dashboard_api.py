"""Contract and business-rule tests for the period dashboard."""
from datetime import datetime
from uuid import uuid4
from zoneinfo import ZoneInfo

from fastapi.testclient import TestClient

from app.main import create_app
from app.persistence.json_repository import JsonRepository
from app.services.alert_service import AlertService
from app.services.dashboard_service import DashboardService

BOGOTA = ZoneInfo("America/Bogota")
NOW = datetime(2026, 12, 20, 12, 0, tzinfo=BOGOTA)


def _client(tmp_path):
    return TestClient(create_app(repository=JsonRepository(tmp_path / "data.json")))


def _period(client):
    response = client.post("/api/v1/periods", json={
        "name": "Vacaciones 2026",
        "start_date": "2026-12-01",
        "end_date": "2027-01-31",
    })
    assert response.status_code == 201, response.text
    return response.json()["data"]


def _activity(client, period_id, *, name="Actividad", **overrides):
    payload = {
        "period_id": period_id, "name": name, "category": "Viajes",
        "start_date": "2026-12-10", "end_date": "2026-12-10",
        "start_time": "08:00", "end_time": "10:00", "priority": "Media",
    }
    payload.update(overrides)
    response = client.post("/api/v1/activities", json=payload)
    assert response.status_code == 201, response.text
    return response.json()["data"]


def _budget(client, period_id):
    return client.post(f"/api/v1/periods/{period_id}/budget", json={
        "total_budget": "1000.00",
        "category_budgets": [
            {"category": "Viajes", "amount": "600.00"},
            {"category": "Alojamiento", "amount": "200.00"},
        ],
    })


def _expense(client, period_id, amount="150.00", category="Alojamiento"):
    return client.post("/api/v1/expenses", json={
        "period_id": period_id, "concept": "Gasto de prueba",
        "amount": amount, "date": "2026-12-10", "category": category,
    })


def _dashboard(client, period_id):
    return client.get(f"/api/v1/periods/{period_id}/dashboard")


def test_dashboard_without_budget_returns_zero_budget_and_seven_categories(tmp_path, monkeypatch):
    client = _client(tmp_path)
    period = _period(client)
    _expense(client, period["id"], amount="25.50", category="Otros")
    monkeypatch.setattr(DashboardService, "now", staticmethod(lambda: NOW))

    response = _dashboard(client, period["id"])

    assert response.status_code == 200, response.text
    body = response.json()["data"]
    financial = body["financial"]
    assert financial["total_budget"] == "0.00"
    assert financial["total_expenses"] == "25.50"
    assert financial["balance"] == "-25.50"
    assert financial["execution_percentage"] == "0.00"
    assert len(financial["categories"]) == 7
    assert all(item["allocated_budget"] == "0.00" for item in financial["categories"])
    assert financial["categories"][-1]["expenses"] == "25.50"


def test_dashboard_calculates_financial_indicators_and_charts(tmp_path, monkeypatch):
    client = _client(tmp_path)
    period = _period(client)
    assert _budget(client, period["id"]).status_code == 201
    _expense(client, period["id"])
    monkeypatch.setattr(DashboardService, "now", staticmethod(lambda: NOW))

    response = _dashboard(client, period["id"])

    assert response.status_code == 200, response.text
    body = response.json()["data"]
    financial = body["financial"]
    assert financial["total_budget"] == "1000.00"
    assert financial["total_expenses"] == "150.00"
    assert financial["balance"] == "850.00"
    assert financial["execution_percentage"] == "15.00"
    lodging = next(x for x in financial["categories"] if x["category"] == "Alojamiento")
    assert lodging == {
        "category": "Alojamiento", "allocated_budget": "200.00",
        "expenses": "150.00", "balance": "50.00", "over_budget": False,
    }
    assert len(body["charts"]["budget_vs_expenses_by_category"]) == 7
    assert len(body["charts"]["expenses_by_category"]) == 7


def test_dashboard_counts_status_completion_and_overdue_correctly(tmp_path, monkeypatch):
    client = _client(tmp_path)
    period = _period(client)
    _activity(client, period["id"], name="Pendiente")
    progress = _activity(
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
    assert client.patch(f"/api/v1/activities/{progress['id']}", json={"status": "En progreso"}).status_code == 200
    assert client.patch(f"/api/v1/activities/{completed['id']}", json={"status": "En progreso"}).status_code == 200
    assert client.patch(f"/api/v1/activities/{completed['id']}", json={"status": "Completada"}).status_code == 200
    assert client.patch(f"/api/v1/activities/{cancelled['id']}", json={"status": "Cancelada"}).status_code == 200
    monkeypatch.setattr(DashboardService, "now", staticmethod(lambda: NOW))

    body = _dashboard(client, period["id"]).json()["data"]
    assert body["activities"]["total"] == 4
    assert {x["status"]: x["count"] for x in body["activities"]["by_status"]} == {
        "Pendiente": 1, "En progreso": 1, "Completada": 1, "Cancelada": 1,
    }
    assert body["activities"]["completion_percentage"] == "33.33"
    assert body["activities"]["overdue_count"] == 2
    assert body["charts"]["completion_percentage"] == "33.33"


def test_dashboard_completion_is_zero_when_every_activity_is_cancelled(tmp_path):
    client = _client(tmp_path)
    period = _period(client)
    activity = _activity(client, period["id"])
    assert client.patch(
        f"/api/v1/activities/{activity['id']}", json={"status": "Cancelada"}
    ).status_code == 200
    body = _dashboard(client, period["id"]).json()["data"]
    assert body["activities"]["completion_percentage"] == "0.00"


def test_dashboard_counts_only_pending_active_alerts(tmp_path, monkeypatch):
    client = _client(tmp_path)
    period = _period(client)
    upcoming = _activity(
        client, period["id"], name="Próxima",
        start_date="2026-12-21", end_date="2026-12-21", priority="Alta",
    )
    _activity(
        client, period["id"], name="Vencida",
        start_date="2026-12-10", end_date="2026-12-10",
    )
    monkeypatch.setattr(AlertService, "now", staticmethod(lambda: NOW))
    monkeypatch.setattr(DashboardService, "now", staticmethod(lambda: NOW))
    evaluated = client.post("/api/v1/alerts/evaluate", json={"period_id": period["id"]})
    assert evaluated.status_code == 200, evaluated.text

    alerts = client.get("/api/v1/alerts", params={"period_id": period["id"]}).json()["data"]
    upcoming_alert = next(x for x in alerts if x["activity"]["id"] == upcoming["id"] and x["type"] == "Próxima")
    assert client.patch(f"/api/v1/alerts/{upcoming_alert['id']}/review").status_code == 200

    body = _dashboard(client, period["id"]).json()["data"]
    assert body["alerts"] == {
        "upcoming_pending": 0, "overdue_pending": 1, "high_priority_pending": 1,
    }


def test_dashboard_returns_404_for_unknown_period_and_422_for_invalid_uuid(tmp_path):
    client = _client(tmp_path)
    missing = _dashboard(client, str(uuid4()))
    invalid = client.get("/api/v1/periods/not-a-uuid/dashboard")
    assert missing.status_code == 404
    assert missing.json()["error"]["code"] == "PERIOD_NOT_FOUND"
    assert invalid.status_code == 422
    assert invalid.json()["error"]["code"] == "VALIDATION_ERROR"


def test_dashboard_rejects_query_parameters_and_pagination(tmp_path):
    client = _client(tmp_path)
    period = _period(client)
    assert client.get(
        f"/api/v1/periods/{period['id']}/dashboard?page=1&page_size=10"
    ).status_code == 422
    assert client.get(
        f"/api/v1/periods/{period['id']}/dashboard?unexpected=true"
    ).status_code == 422
