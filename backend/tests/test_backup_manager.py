"""Tests for the local backup catalog and retention manager."""

import json
from datetime import datetime, timedelta
from pathlib import Path
from uuid import UUID

import pytest

from app.persistence.backup_manager import (
    BackupError,
    BackupManager,
    BackupNotFoundError,
    BackupNotRestorableError,
)
from app.persistence.document import DataDocument


NOW = datetime.fromisoformat("2026-11-15T10:00:00-05:00")


def write_main_file(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(DataDocument.empty(now=NOW).model_dump(mode="json")),
        encoding="utf-8",
    )


def test_create_backup_writes_uuid_metadata_outside_main_document(tmp_path):
    data_file = tmp_path / "data" / "datos_vacaciones.json"
    write_main_file(data_file)
    manager = BackupManager(data_file)

    record = manager.create_backup(backup_type="weekly", now=NOW)

    assert isinstance(record.backup_id, UUID)
    assert record.type == "weekly"
    assert record.validation_status == "valid"
    assert record.file_reference.endswith(f"{record.backup_id}.json")
    assert manager.manifest_path.is_file()
    assert len(manager.load_catalog().backups) == 1
    assert data_file.read_text(encoding="utf-8").find(str(record.backup_id)) == -1


def test_pre_write_backup_is_separate_from_weekly_listing(tmp_path):
    data_file = tmp_path / "data" / "datos_vacaciones.json"
    write_main_file(data_file)
    manager = BackupManager(data_file)

    pre_write = manager.create_backup(backup_type="pre_write", now=NOW)
    weekly = manager.create_backup(backup_type="weekly", now=NOW)

    assert pre_write.backup_id != weekly.backup_id
    assert [item.backup_id for item in manager.list_weekly()] == [weekly.backup_id]


def test_create_backup_rejects_corrupt_main_file(tmp_path):
    data_file = tmp_path / "datos_vacaciones.json"
    data_file.write_text("{broken", encoding="utf-8")
    manager = BackupManager(data_file)

    with pytest.raises(BackupNotRestorableError):
        manager.create_backup(backup_type="pre_write", now=NOW)

    assert list((tmp_path / "backups").glob("*.json")) == []


def test_missing_or_corrupt_manifest_is_rebuilt_from_files(tmp_path):
    data_file = tmp_path / "datos_vacaciones.json"
    write_main_file(data_file)
    manager = BackupManager(data_file)
    created = manager.create_backup(backup_type="weekly", now=NOW)

    manager.manifest_path.write_text("{invalid", encoding="utf-8")
    rebuilt = manager.load_catalog()

    assert len(rebuilt.backups) == 1
    assert rebuilt.backups[0].backup_id == created.backup_id
    assert rebuilt.backups[0].validation_status == "valid"


def test_rebuild_keeps_invalid_backup_file_and_marks_it_invalid(tmp_path):
    data_file = tmp_path / "datos_vacaciones.json"
    write_main_file(data_file)
    manager = BackupManager(data_file)
    manager.backup_dir.mkdir(parents=True)
    backup_id = "9a3b0a4f-0b6c-4c7f-9d1f-1e7b5a0b2c3d"
    invalid_file = manager.backup_dir / f"weekly__20261115T100000-0500__{backup_id}.json"
    invalid_file.write_text("{broken", encoding="utf-8")

    catalog = manager.rebuild_catalog()

    assert invalid_file.exists()
    assert len(catalog.backups) == 1
    assert catalog.backups[0].validation_status == "invalid"


def test_validate_backup_detects_tampered_file_and_keeps_it(tmp_path):
    data_file = tmp_path / "datos_vacaciones.json"
    write_main_file(data_file)
    manager = BackupManager(data_file)
    record = manager.create_backup(backup_type="weekly", now=NOW)
    backup_path = manager.backup_dir / record.file_reference
    backup_path.write_text("{tampered", encoding="utf-8")

    with pytest.raises(BackupNotRestorableError):
        manager.validate_backup(record.backup_id)

    assert backup_path.exists()
    assert manager.load_catalog().backups[0].validation_status == "invalid"


def test_validate_backup_raises_not_found_for_unknown_id(tmp_path):
    data_file = tmp_path / "datos_vacaciones.json"
    manager = BackupManager(data_file)

    with pytest.raises(BackupNotFoundError):
        manager.validate_backup("9a3b0a4f-0b6c-4c7f-9d1f-1e7b5a0b2c3d")


def test_weekly_creation_is_due_after_seven_days_and_only_once(tmp_path):
    data_file = tmp_path / "datos_vacaciones.json"
    write_main_file(data_file)
    manager = BackupManager(data_file)
    first = manager.create_weekly_if_due(now=NOW)

    assert first is not None
    assert manager.create_weekly_if_due(now=NOW + timedelta(days=6)) is None
    second = manager.create_weekly_if_due(now=NOW + timedelta(days=7))

    assert second is not None
    assert second.backup_id != first.backup_id


def test_weekly_startup_creates_only_one_backup_after_multiple_missed_weeks(tmp_path):
    data_file = tmp_path / "datos_vacaciones.json"
    write_main_file(data_file)
    manager = BackupManager(data_file)
    first = manager.create_weekly_if_due(now=NOW)
    assert first is not None

    overdue = NOW + timedelta(days=35)
    second = manager.create_weekly_if_due(now=overdue)

    assert second is not None
    assert len(manager.list_weekly()) == 2


def test_weekly_retention_keeps_latest_fifteen_and_preserves_pre_write(tmp_path):
    data_file = tmp_path / "datos_vacaciones.json"
    write_main_file(data_file)
    manager = BackupManager(data_file)
    pre_write = manager.create_backup(backup_type="pre_write", now=NOW)

    weekly_records = [
        manager.create_backup(
            backup_type="weekly",
            now=NOW + timedelta(days=7 * index),
        )
        for index in range(16)
    ]

    weekly = manager.list_weekly()
    catalog = manager.load_catalog()

    assert len(weekly) == 15
    assert weekly[0].backup_id == weekly_records[-1].backup_id
    assert pre_write.backup_id in {item.backup_id for item in catalog.backups}
    assert weekly_records[0].backup_id not in {item.backup_id for item in catalog.backups}
    assert not (manager.backup_dir / weekly_records[0].file_reference).exists()


def test_create_backup_rejects_source_outside_configured_data_file(tmp_path):
    data_file = tmp_path / "data" / "datos_vacaciones.json"
    other_file = tmp_path / "other.json"
    write_main_file(data_file)
    write_main_file(other_file)
    manager = BackupManager(data_file)

    with pytest.raises(BackupError, match="archivo principal configurado"):
        manager.create_backup(other_file, backup_type="pre_write", now=NOW)


def test_backup_manager_rejects_naive_datetime(tmp_path):
    data_file = tmp_path / "datos_vacaciones.json"
    write_main_file(data_file)
    manager = BackupManager(data_file)

    with pytest.raises(ValueError, match="zona horaria"):
        manager.create_backup(backup_type="weekly", now=datetime(2026, 11, 15, 10, 0))
