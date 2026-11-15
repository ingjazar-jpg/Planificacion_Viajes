"""Contract tests for weekly backup API endpoints."""

from datetime import datetime
from uuid import uuid4
from zoneinfo import ZoneInfo

from fastapi.testclient import TestClient

from app.main import create_app
from app.persistence.document import DataDocument
from app.persistence.json_repository import JsonRepository


NOW = datetime(2026, 11, 14, 10, 0, tzinfo=ZoneInfo("America/Bogota"))


def _repository(tmp_path):
    repository = JsonRepository(tmp_path / "datos_vacaciones.json")
    repository.save(DataDocument.empty(now=NOW))
    return repository


def test_get_backups_returns_only_public_weekly_metadata(tmp_path):
    repository = _repository(tmp_path)
    weekly = repository.backup_manager.create_backup(backup_type="weekly", now=NOW)
    repository.backup_manager.create_backup(
        backup_type="pre_write",
        now=NOW.replace(hour=11),
    )
    client = TestClient(create_app(repository=repository))

    response = client.get("/api/v1/backups")

    assert response.status_code == 200
    assert response.json() == {
        "data": [
            {
                "backup_id": str(weekly.backup_id),
                "created_at": NOW.isoformat(),
                "type": "weekly",
                "validation_status": "valid",
            }
        ]
    }
    assert "file_reference" not in response.text
    assert "datos_vacaciones.json" not in response.text


def test_get_backups_returns_empty_list_when_no_weekly_backups(tmp_path):
    repository = JsonRepository(tmp_path / "datos_vacaciones.json")
    client = TestClient(create_app(repository=repository))

    response = client.get("/api/v1/backups")

    assert response.status_code == 200
    assert response.json() == {"data": []}


def test_get_backups_rejects_unknown_query_parameters(tmp_path):
    client = TestClient(create_app(repository=_repository(tmp_path)))

    response = client.get("/api/v1/backups?page=1")

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_restore_backup_requires_explicit_true_confirmation(tmp_path):
    client = TestClient(create_app(repository=_repository(tmp_path)))

    response = client.post(
        "/api/v1/backups/restore",
        json={"backup_id": str(uuid4()), "confirmed": False},
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "RESTORE_CONFIRMATION_REQUIRED"


def test_restore_backup_restores_weekly_snapshot_and_returns_contract(tmp_path):
    repository = _repository(tmp_path)
    weekly = repository.backup_manager.create_backup(backup_type="weekly", now=NOW)
    later = DataDocument.empty(now=NOW.replace(hour=12))
    repository.save(later)
    client = TestClient(create_app(repository=repository))

    response = client.post(
        "/api/v1/backups/restore",
        json={"backup_id": str(weekly.backup_id), "confirmed": True},
    )

    assert response.status_code == 200
    body = response.json()["data"]
    assert body["status"] == "restored"
    assert body["backup_id"] == str(weekly.backup_id)
    assert body["restored_at"].endswith("-05:00")
    assert body["message"] == "La copia de seguridad se restauró correctamente."
    assert repository.load().metadata.created_at == NOW


def test_restore_backup_returns_not_found_for_unknown_identifier(tmp_path):
    client = TestClient(create_app(repository=_repository(tmp_path)))

    response = client.post(
        "/api/v1/backups/restore",
        json={"backup_id": str(uuid4()), "confirmed": True},
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "BACKUP_NOT_FOUND"


def test_restore_backup_rejects_invalid_weekly_file_without_changing_current_data(tmp_path):
    repository = _repository(tmp_path)
    weekly = repository.backup_manager.create_backup(backup_type="weekly", now=NOW)
    current = DataDocument.empty(now=NOW.replace(hour=13))
    repository.save(current)
    backup_path = repository.backup_manager.backup_dir / weekly.file_reference
    backup_path.write_text("{invalid json", encoding="utf-8")
    client = TestClient(create_app(repository=repository))

    response = client.post(
        "/api/v1/backups/restore",
        json={"backup_id": str(weekly.backup_id), "confirmed": True},
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "BACKUP_NOT_RESTORABLE"
    assert repository.load().metadata.created_at == current.metadata.created_at


def test_restore_backup_rejects_missing_confirmation_with_specific_error(tmp_path):
    client = TestClient(create_app(repository=_repository(tmp_path)))

    response = client.post(
        "/api/v1/backups/restore",
        json={"backup_id": str(uuid4())},
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "RESTORE_CONFIRMATION_REQUIRED"


def test_restore_backup_rejects_malformed_payload_with_uniform_error(tmp_path):
    client = TestClient(create_app(repository=_repository(tmp_path)))

    response = client.post("/api/v1/backups/restore", json={"backup_id": "invalid"})

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"
