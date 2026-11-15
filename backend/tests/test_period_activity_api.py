"""Contract and business-rule tests for period and activity endpoints."""

from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi.testclient import TestClient

from app.main import create_app
from app.persistence.json_repository import JsonRepository


NOW = datetime(2026, 11, 15, 10, 0, tzinfo=ZoneInfo("America/Bogota"))


def _client(tmp_path):
    return TestClient(create_app(repository=JsonRepository(tmp_path / "data.json")))


def _create_period(client, *, start="2026-12-01", end="2027-01-31"):
    response = client.post("/api/v1/periods", json={
        "name": "Vacaciones 2026", "start_date": start, "end_date": end
    })
    assert response.status_code == 201
    return response.json()["data"]


def _activity_payload(period_id, **overrides):
    payload = {
        "period_id": period_id,
        "name": "Viaje familiar",
        "description": "Descanso",
        "category": "Viajes",
        "destination": "Santa Marta",
        "start_date": "2026-12-10",
        "end_date": "2026-12-10",
        "start_time": "08:00",
        "end_time": "10:00",
        "priority": "Alta",
    }
    payload.update(overrides)
    return payload


def test_create_period_derives_year_and_returns_created_resource(tmp_path):
    client = _client(tmp_path)
    response = client.post("/api/v1/periods", json={
        "name": "  Navidad 2026  ",
        "start_date": "2026-12-20",
        "end_date": "2027-01-10",
    })
    assert response.status_code == 201
    body = response.json()["data"]
    assert body["year"] == 2026
    assert body["name"] == "Navidad 2026"
    assert body["created_at"].endswith("-05:00")
    assert "id" in body


def test_period_rejects_duplicate_start_year(tmp_path):
    client = _client(tmp_path)
    _create_period(client)
    response = client.post("/api/v1/periods", json={
        "name": "Otro período", "start_date": "2026-11-01", "end_date": "2026-12-01"
    })
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "PERIOD_YEAR_ALREADY_EXISTS"


def test_period_list_paginates_and_requires_both_parameters(tmp_path):
    client = _client(tmp_path)
    _create_period(client)
    response = client.get("/api/v1/periods?page=1&page_size=1")
    assert response.status_code == 200
    assert response.json()["meta"] == {"total": 1, "page": 1, "page_size": 1, "total_pages": 1}
    assert client.get("/api/v1/periods?page=1").status_code == 422


def test_period_update_rejects_range_excluding_existing_activity(tmp_path):
    client = _client(tmp_path)
    period = _create_period(client)
    created = client.post("/api/v1/activities", json=_activity_payload(period["id"]))
    assert created.status_code == 201
    response = client.put(f"/api/v1/periods/{period['id']}", json={
        "name": "Rango reducido", "start_date": "2026-12-11", "end_date": "2027-01-31"
    })
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "PERIOD_RANGE_CONFLICT"


def test_period_cannot_be_deleted_and_unknown_fields_are_rejected(tmp_path):
    client = _client(tmp_path)
    response = client.post("/api/v1/periods", json={
        "name": "Vacaciones", "start_date": "2026-12-01", "end_date": "2027-01-31",
        "year": 2026
    })
    assert response.status_code == 422
    assert client.delete("/api/v1/periods/00000000-0000-0000-0000-000000000000").status_code == 405


def test_create_activity_assigns_pending_and_server_managed_fields(tmp_path):
    client = _client(tmp_path)
    period = _create_period(client)
    response = client.post("/api/v1/activities", json=_activity_payload(period["id"]))
    assert response.status_code == 201
    body = response.json()["data"]
    assert body["status"] == "Pendiente"
    assert body["period_id"] == period["id"]
    assert body["created_at"] == body["updated_at"]


def test_create_activity_rejects_client_managed_status(tmp_path):
    client = _client(tmp_path)
    period = _create_period(client)
    response = client.post("/api/v1/activities", json=_activity_payload(period["id"], status="Completada"))
    assert response.status_code == 422


def test_activity_rejects_overlap_but_allows_adjacent_half_open_interval(tmp_path):
    client = _client(tmp_path)
    period = _create_period(client)
    first = client.post("/api/v1/activities", json=_activity_payload(period["id"]))
    assert first.status_code == 201
    adjacent = client.post("/api/v1/activities", json=_activity_payload(
        period["id"], name="Actividad siguiente", start_time="10:00", end_time="12:00"
    ))
    assert adjacent.status_code == 201
    overlap = client.post("/api/v1/activities", json=_activity_payload(
        period["id"], name="Actividad superpuesta", start_time="09:59", end_time="11:00"
    ))
    assert overlap.status_code == 409
    assert overlap.json()["error"]["code"] == "ACTIVITY_TIME_OVERLAP"


def test_activity_rejects_dates_outside_period(tmp_path):
    client = _client(tmp_path)
    period = _create_period(client)
    response = client.post("/api/v1/activities", json=_activity_payload(
        period["id"], start_date="2026-11-30", end_date="2026-11-30"
    ))
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "ACTIVITY_OUTSIDE_PERIOD"


def test_activity_patch_and_status_transition_rules(tmp_path):
    client = _client(tmp_path)
    period = _create_period(client)
    activity = client.post("/api/v1/activities", json=_activity_payload(period["id"])).json()["data"]
    patch = client.patch(f"/api/v1/activities/{activity['id']}", json={"description": "Actualizada"})
    assert patch.status_code == 200
    assert patch.json()["data"]["description"] == "Actualizada"
    progress = client.patch(f"/api/v1/activities/{activity['id']}", json={"status": "En progreso"})
    assert progress.status_code == 200
    completed = client.patch(f"/api/v1/activities/{activity['id']}", json={"status": "Completada"})
    assert completed.status_code == 200
    backwards = client.patch(f"/api/v1/activities/{activity['id']}", json={"status": "En progreso"})
    assert backwards.status_code == 409
    assert backwards.json()["error"]["code"] == "INVALID_ACTIVITY_STATUS_TRANSITION"


def test_activity_list_filters_before_pagination_and_get_detail(tmp_path):
    client = _client(tmp_path)
    period = _create_period(client)
    first = client.post("/api/v1/activities", json=_activity_payload(period["id"])).json()["data"]
    client.post("/api/v1/activities", json=_activity_payload(
        period["id"], name="Otra", start_date="2026-12-11", end_date="2026-12-11",
        start_time="08:00", end_time="09:00", category="Turismo"
    ))
    response = client.get("/api/v1/activities", params={
        "period_id": period["id"], "category": "Viajes", "page": 1, "page_size": 10
    })
    assert response.status_code == 200
    assert response.json()["meta"]["total"] == 1
    assert response.json()["data"][0]["id"] == first["id"]
    assert client.get(f"/api/v1/activities/{first['id']}").status_code == 200


def test_activity_delete_removes_resource_and_returns_204(tmp_path):
    client = _client(tmp_path)
    period = _create_period(client)
    activity = client.post("/api/v1/activities", json=_activity_payload(period["id"])).json()["data"]
    response = client.delete(f"/api/v1/activities/{activity['id']}")
    assert response.status_code == 204
    assert response.content == b""
    assert client.get(f"/api/v1/activities/{activity['id']}").status_code == 404


def test_activity_patch_rejects_immutable_period_and_null_required_field(tmp_path):
    client = _client(tmp_path)
    period = _create_period(client)
    activity = client.post("/api/v1/activities", json=_activity_payload(period["id"])).json()["data"]
    assert client.patch(f"/api/v1/activities/{activity['id']}", json={"period_id": period["id"]}).status_code == 422
    assert client.patch(f"/api/v1/activities/{activity['id']}", json={"category": None}).status_code == 422
