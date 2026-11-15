"""API and lifecycle tests for internal alerts."""

from datetime import datetime
from uuid import uuid4
from zoneinfo import ZoneInfo

from fastapi.testclient import TestClient

from app.domain.enums import AlertEventType, AlertStatus, AlertType
from app.main import create_app
from app.persistence.json_repository import JsonRepository
from app.services.alert_service import AlertService


TZ = ZoneInfo("America/Bogota")
FIXED_NOW = datetime(2026, 11, 15, 10, 0, tzinfo=TZ)


def _client(tmp_path):
    repository = JsonRepository(tmp_path / "data.json")
    return TestClient(create_app(repository=repository)), repository


def _period(client, start="2026-11-01", end="2026-12-31"):
    response = client.post("/api/v1/periods", json={
        "name": "Vacaciones 2026", "start_date": start, "end_date": end
    })
    assert response.status_code == 201
    return response.json()["data"]


def _activity(client, period_id, **overrides):
    payload = {
        "period_id": period_id,
        "name": "Actividad de prueba",
        "category": "Viajes",
        "start_date": "2026-11-16",
        "end_date": "2026-11-16",
        "start_time": "09:00",
        "end_time": "12:00",
        "priority": "Media",
    }
    payload.update(overrides)
    response = client.post("/api/v1/activities", json=payload)
    assert response.status_code == 201, response.text
    return response.json()["data"]


def _evaluate_at(repository, period_id, now=FIXED_NOW):
    document = repository.load()
    updated, counts = AlertService.evaluate_document(document, period_id, now=now)
    repository.save(updated)
    return counts


def test_evaluation_creates_upcoming_overdue_and_high_priority_alerts(tmp_path):
    client, repository = _client(tmp_path)
    period = _period(client)
    upcoming = _activity(
        client, period["id"], name="Próxima",
        start_date="2026-11-16", end_date="2026-11-16",
        start_time="09:00", end_time="10:00",
    )
    overdue_high = _activity(
        client, period["id"], name="Vencida y prioritaria",
        start_date="2026-11-14", end_date="2026-11-14",
        start_time="08:00", end_time="10:00", priority="Alta",
    )

    counts = _evaluate_at(repository, period["id"])

    assert counts["created_count"] == 3
    assert counts["active_count"] == 3
    document = repository.load()
    assert {(a.activity_id, a.type) for a in document.alerts} == {
        (upcoming["id"], AlertType.UPCOMING),
        (overdue_high["id"], AlertType.OVERDUE),
        (overdue_high["id"], AlertType.HIGH_PRIORITY),
    }
    assert all(a.status == AlertStatus.PENDING for a in document.alerts)
    assert all(a.history[0].event_type == AlertEventType.CREATED for a in document.alerts)


def test_evaluation_is_idempotent_and_does_not_duplicate_events(tmp_path):
    client, repository = _client(tmp_path)
    period = _period(client)
    _activity(client, period["id"], priority="Alta")

    first = _evaluate_at(repository, period["id"])
    before = repository.load().alerts
    second = _evaluate_at(repository, period["id"])
    after = repository.load().alerts

    assert first["created_count"] == 1
    assert second["created_count"] == 0
    assert second["activated_count"] == 0
    assert [(a.id, a.history) for a in before] == [(a.id, a.history) for a in after]


def test_completed_and_cancelled_activities_do_not_generate_overdue_or_high_alerts(tmp_path):
    client, repository = _client(tmp_path)
    period = _period(client)
    completed = _activity(
        client, period["id"], name="Completada", priority="Alta",
        start_date="2026-11-14", end_date="2026-11-14",
    )
    cancelled = _activity(
        client, period["id"], name="Cancelada", priority="Alta",
        start_date="2026-11-14", end_date="2026-11-14",
        start_time="11:00", end_time="13:00",
    )
    document = repository.load()
    from app.domain.enums import ActivityStatus
    activities = [
        item.model_copy(update={"status": ActivityStatus.COMPLETED})
        if str(item.id) == completed["id"] else
        item.model_copy(update={"status": ActivityStatus.CANCELLED})
        if str(item.id) == cancelled["id"] else item
        for item in document.activities
    ]
    from app.persistence.document import DataDocument
    repository.save(DataDocument.model_validate({
        **document.model_dump(mode="python"), "activities": activities
    }))

    counts = _evaluate_at(repository, period["id"])

    assert counts["created_count"] == 0
    assert repository.load().alerts == []


def test_review_is_idempotent_and_preserves_condition_state(tmp_path):
    client, repository = _client(tmp_path)
    period = _period(client)
    activity = _activity(client, period["id"], priority="Alta")
    _evaluate_at(repository, period["id"])

    alert = repository.load().alerts[0]
    first = client.patch(f"/api/v1/alerts/{alert.id}/review")
    assert first.status_code == 200
    body = first.json()["data"]
    assert body["status"] == "Revisada"
    assert body["condition_active"] is True
    assert [event["event_type"] for event in body["history"]] == ["created", "reviewed"]

    reviewed_at = body["reviewed_at"]
    second = client.patch(f"/api/v1/alerts/{alert.id}/review")
    assert second.status_code == 200
    assert second.json()["data"]["reviewed_at"] == reviewed_at
    assert [event["event_type"] for event in second.json()["data"]["history"]] == ["created", "reviewed"]


def test_review_unknown_alert_returns_404(tmp_path):
    client, _ = _client(tmp_path)
    response = client.patch(f"/api/v1/alerts/{uuid4()}/review")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "ALERT_NOT_FOUND"


def test_reviewed_alert_is_deactivated_and_reactivated_without_losing_review(tmp_path):
    client, repository = _client(tmp_path)
    period = _period(client)
    _activity(client, period["id"], priority="Alta")
    _evaluate_at(repository, period["id"])
    alert = repository.load().alerts[0]
    assert client.patch(f"/api/v1/alerts/{alert.id}/review").status_code == 200

    document = repository.load()
    from app.domain.enums import Priority
    from app.persistence.document import DataDocument
    activities = [
        item.model_copy(update={"priority": Priority.MEDIUM})
        for item in document.activities
    ]
    repository.save(DataDocument.model_validate({
        **document.model_dump(mode="python"), "activities": activities
    }))
    deactivated = _evaluate_at(repository, period["id"])
    assert deactivated["deactivated_count"] == 1
    inactive = repository.load().alerts[0]
    assert inactive.condition_active is False
    assert inactive.status == AlertStatus.REVIEWED
    assert inactive.history[-1].event_type == AlertEventType.DEACTIVATED

    document = repository.load()
    activities = [
        item.model_copy(update={"priority": Priority.HIGH})
        for item in document.activities
    ]
    repository.save(DataDocument.model_validate({
        **document.model_dump(mode="python"), "activities": activities
    }))
    reactivated = _evaluate_at(repository, period["id"])
    assert reactivated["reactivated_count"] == 1
    restored = repository.load().alerts[0]
    assert restored.condition_active is True
    assert restored.status == AlertStatus.REVIEWED
    assert [event.event_type for event in restored.history] == [
        AlertEventType.CREATED, AlertEventType.REVIEWED,
        AlertEventType.DEACTIVATED, AlertEventType.REACTIVATED,
    ]


def test_get_alerts_filters_and_paginates_with_activity_and_history(tmp_path):
    client, repository = _client(tmp_path)
    period = _period(client)
    activity = _activity(client, period["id"], priority="Alta")
    _evaluate_at(repository, period["id"])

    response = client.get("/api/v1/alerts", params={
        "period_id": period["id"], "type": "Prioridad alta",
        "condition_active": "true", "page": 1, "page_size": 10,
    })
    assert response.status_code == 200
    body = response.json()
    assert body["meta"] == {"total": 1, "page": 1, "page_size": 10, "total_pages": 1}
    assert body["data"][0]["activity"]["id"] == activity["id"]
    assert body["data"][0]["history"][0]["event_type"] == "created"


def test_get_alerts_returns_active_and_inactive_by_default_and_rejects_partial_paging(tmp_path):
    client, repository = _client(tmp_path)
    period = _period(client)
    _activity(client, period["id"], priority="Alta")
    _evaluate_at(repository, period["id"])

    assert client.get("/api/v1/alerts").status_code == 200
    assert client.get("/api/v1/alerts?page=1").status_code == 422
    assert client.get("/api/v1/alerts?unknown=1").status_code == 422


def test_evaluate_endpoint_requires_existing_period_and_returns_contract(tmp_path):
    client, repository = _client(tmp_path)
    period = _period(client)
    _activity(client, period["id"], priority="Alta")

    response = client.post("/api/v1/alerts/evaluate", json={"period_id": period["id"]})
    assert response.status_code == 200
    body = response.json()["data"]
    assert body["period_id"] == period["id"]
    assert body["created_count"] == 1
    assert body["active_count"] == 1
    assert body["evaluated_at"].endswith("-05:00")

    missing = client.post("/api/v1/alerts/evaluate", json={"period_id": str(uuid4())})
    assert missing.status_code == 404
    assert missing.json()["error"]["code"] == "PERIOD_NOT_FOUND"


def test_activity_creation_and_modification_reevaluate_alerts_automatically(tmp_path):
    client, repository = _client(tmp_path)
    period = _period(client)
    activity = _activity(client, period["id"], priority="Media")
    assert repository.load().alerts == []

    response = client.patch(f"/api/v1/activities/{activity['id']}", json={"priority": "Alta"})
    assert response.status_code == 200
    alerts = repository.load().alerts
    assert len(alerts) == 1
    assert alerts[0].type == AlertType.HIGH_PRIORITY
    assert alerts[0].condition_active is True


def test_alert_evaluation_rejects_missing_and_extra_request_fields(tmp_path):
    client, _ = _client(tmp_path)
    assert client.post("/api/v1/alerts/evaluate", json={}).status_code == 422
    assert client.post("/api/v1/alerts/evaluate", json={
        "period_id": str(uuid4()), "extra": True
    }).status_code == 422
