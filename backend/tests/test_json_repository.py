"""Tests for validated and atomic JSON persistence."""

import json
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from uuid import uuid4

import pytest

from app.domain.entities import Budget, Period
from app.persistence.document import DataDocument
from app.persistence.json_repository import (
    DataCorruptionError,
    JsonRepository,
    RepositoryWriteError,
)


NOW = datetime(2026, 11, 15, 10, 0, tzinfo=timezone.utc)


def make_document() -> DataDocument:
    period = Period(
        id=uuid4(),
        year=2026,
        name="Vacaciones 2026",
        start_date="2026-12-20",
        end_date="2027-01-10",
        created_at=NOW,
    )
    budget = Budget(
        id=uuid4(),
        period_id=period.id,
        total_budget="1250.50",
        created_at=NOW,
        updated_at=NOW,
    )
    return DataDocument(
        metadata={"created_at": NOW, "updated_at": NOW},
        periods=[period],
        budgets=[budget],
    )


def test_load_returns_empty_document_when_file_does_not_exist(tmp_path):
    repository = JsonRepository(tmp_path / "datos_vacaciones.json")

    document = repository.load()

    assert document.schema_version == "1.0"
    assert document.periods == []
    assert document.metadata.created_at.tzinfo is not None


def test_save_and_load_round_trip_preserves_decimal_as_json_string(tmp_path):
    file_path = tmp_path / "data" / "datos_vacaciones.json"
    repository = JsonRepository(file_path)

    repository.save(make_document())
    loaded = repository.load()
    payload = json.loads(file_path.read_text(encoding="utf-8"))

    assert loaded.budgets[0].total_budget == Decimal("1250.50")
    assert payload["budgets"][0]["total_budget"] == "1250.50"
    assert payload["periods"][0]["id"] == str(loaded.periods[0].id)


def test_replacing_existing_file_creates_automatic_pre_write_backup(tmp_path):
    file_path = tmp_path / "datos_vacaciones.json"
    original_document = DataDocument.empty(now=NOW)
    file_path.write_text(
        json.dumps(original_document.model_dump(mode="json")),
        encoding="utf-8",
    )
    repository = JsonRepository(file_path)

    repository.save(make_document())

    catalog = repository.backup_manager.load_catalog()
    assert len(catalog.backups) == 1
    assert catalog.backups[0].type == "pre_write"
    backup_path = repository.backup_manager.backup_dir / catalog.backups[0].file_reference
    assert DataDocument.model_validate_json(backup_path.read_text(encoding="utf-8")).periods == []


def test_backup_callback_runs_before_existing_file_is_replaced(tmp_path):
    file_path = tmp_path / "datos_vacaciones.json"
    original_document = DataDocument.empty(now=NOW)
    file_path.write_text(
        json.dumps(original_document.model_dump(mode="json")),
        encoding="utf-8",
    )
    observed: list[Path] = []

    def backup(source: Path) -> None:
        observed.append(source)
        assert json.loads(source.read_text(encoding="utf-8"))["periods"] == []

    repository = JsonRepository(file_path, backup_before_write=backup)
    repository.save(make_document())

    assert observed == [file_path]
    assert len(repository.load().periods) == 1


def test_backup_failure_keeps_original_file_unchanged(tmp_path):
    file_path = tmp_path / "datos_vacaciones.json"
    file_path.write_text(
        json.dumps(DataDocument.empty(now=NOW).model_dump(mode="json")),
        encoding="utf-8",
    )
    original = file_path.read_text(encoding="utf-8")

    def fail_backup(_: Path) -> None:
        raise OSError("backup unavailable")

    repository = JsonRepository(file_path, backup_before_write=fail_backup)

    with pytest.raises(RepositoryWriteError, match="respaldo previo"):
        repository.save(make_document())

    assert file_path.read_text(encoding="utf-8") == original


def test_load_rejects_invalid_json_and_save_does_not_overwrite_it(tmp_path):
    file_path = tmp_path / "datos_vacaciones.json"
    corrupted = '{"schema_version":'
    file_path.write_text(corrupted, encoding="utf-8")
    repository = JsonRepository(file_path)

    with pytest.raises(DataCorruptionError):
        repository.load()
    with pytest.raises(DataCorruptionError):
        repository.save(make_document())

    assert file_path.read_text(encoding="utf-8") == corrupted


def test_atomic_replace_failure_preserves_original_file(tmp_path, monkeypatch):
    file_path = tmp_path / "datos_vacaciones.json"
    original_document = DataDocument.empty(now=NOW)
    original_text = json.dumps(original_document.model_dump(mode="json"))
    file_path.write_text(original_text, encoding="utf-8")
    repository = JsonRepository(file_path, backup_before_write=lambda _: None)

    def fail_replace(_: Path, __: Path) -> None:
        raise OSError("replace failed")

    monkeypatch.setattr("app.persistence.json_repository._atomic_replace", fail_replace)

    with pytest.raises(RepositoryWriteError, match="escritura segura"):
        repository.save(make_document())

    assert file_path.read_text(encoding="utf-8") == original_text
    assert list(tmp_path.glob(".datos_vacaciones.json.*.tmp")) == []


def test_save_rejects_non_document_input(tmp_path):
    repository = JsonRepository(tmp_path / "datos_vacaciones.json")

    with pytest.raises(TypeError, match="DataDocument"):
        repository.save({"schema_version": "1.0"})



def test_save_keeps_pre_write_backup_when_atomic_replacement_fails(tmp_path, monkeypatch):
    file_path = tmp_path / "datos_vacaciones.json"
    original_document = DataDocument.empty(now=NOW)
    original_text = json.dumps(original_document.model_dump(mode="json"))
    file_path.write_text(original_text, encoding="utf-8")
    repository = JsonRepository(file_path)

    def fail_replace(_: Path, __: Path) -> None:
        raise OSError("replace failed")

    monkeypatch.setattr("app.persistence.json_repository._atomic_replace", fail_replace)

    with pytest.raises(RepositoryWriteError):
        repository.save(make_document())

    catalog = repository.backup_manager.load_catalog()
    assert len(catalog.backups) == 1
    assert catalog.backups[0].type == "pre_write"
    assert file_path.read_text(encoding="utf-8") == original_text


def test_weekly_backup_check_delegates_to_backup_manager(tmp_path):
    file_path = tmp_path / "datos_vacaciones.json"
    file_path.write_text(
        json.dumps(DataDocument.empty(now=NOW).model_dump(mode="json")),
        encoding="utf-8",
    )
    repository = JsonRepository(file_path)

    first = repository.create_weekly_backup_if_due(now=NOW)
    second = repository.create_weekly_backup_if_due(
        now=NOW.replace(day=21)
    )

    assert first is not None
    assert second is None
