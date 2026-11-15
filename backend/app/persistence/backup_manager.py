"""Local backup catalog and file management for DATA-001 documents."""

from __future__ import annotations

import json
import os
import re
import tempfile
from datetime import datetime, timedelta
from pathlib import Path
from threading import RLock
from typing import Literal
from uuid import UUID, uuid4
from zoneinfo import ZoneInfo

from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator

from app.persistence.document import DataDocument


BUSINESS_TIMEZONE = ZoneInfo("America/Bogota")
BACKUP_TYPES = ("weekly", "pre_write")
VALIDATION_STATUSES = ("valid", "invalid", "not_validated")
_FILENAME_PATTERN = re.compile(
    r"^(?P<type>weekly|pre_write)__(?P<created>\d{8}T\d{6}[+-]\d{4})__"
    r"(?P<backup_id>[0-9a-fA-F-]{36})\.json$"
)


class BackupError(RuntimeError):
    """Base exception for backup management failures."""


class BackupNotFoundError(BackupError):
    """Raised when a backup identifier is not present in the catalog."""


class BackupNotRestorableError(BackupError):
    """Raised when a backup file is missing or fails document validation."""


class BackupRecord(BaseModel):
    """Administrative metadata for one backup file."""

    model_config = ConfigDict(extra="forbid")

    backup_id: UUID
    created_at: datetime
    type: Literal["weekly", "pre_write"]
    validation_status: Literal["valid", "invalid", "not_validated"]
    file_reference: str

    @field_validator("created_at")
    @classmethod
    def require_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("created_at debe incluir zona horaria.")
        return value

    @field_validator("file_reference")
    @classmethod
    def require_safe_relative_reference(cls, value: str) -> str:
        path = Path(value)
        if not value or path.is_absolute() or path.name != value or value in {".", ".."}:
            raise ValueError("file_reference debe ser un nombre de archivo relativo.")
        return value


class BackupCatalog(BaseModel):
    """Versioned manifest stored outside the main application document."""

    model_config = ConfigDict(extra="forbid")

    schema_version: Literal["1.0"] = "1.0"
    backups: list[BackupRecord] = Field(default_factory=list)


class BackupManager:
    """Create, validate, catalogue and retain local JSON backups.

    The manager never exposes physical paths through its public listing method.
    Weekly retention is independent from pre-write backup management.
    """

    RETENTION_LIMIT = 15
    WEEKLY_INTERVAL = timedelta(days=7)

    def __init__(
        self,
        data_file: str | Path,
        *,
        backup_dir: str | Path | None = None,
    ) -> None:
        self.data_file = Path(data_file)
        self.backup_dir = (
            Path(backup_dir) if backup_dir is not None else self.data_file.parent / "backups"
        )
        self.manifest_path = self.backup_dir / "manifest.json"
        self._lock = RLock()

    def load_catalog(self) -> BackupCatalog:
        """Load the manifest, rebuilding it from backup files when necessary."""
        with self._lock:
            try:
                with self.manifest_path.open("r", encoding="utf-8") as source:
                    catalog = BackupCatalog.model_validate(json.load(source))
                self._validate_catalog_references(catalog)
                return catalog
            except (OSError, UnicodeDecodeError, json.JSONDecodeError, ValidationError, BackupError):
                return self.rebuild_catalog()

    def rebuild_catalog(self) -> BackupCatalog:
        """Recreate metadata from recognized backup filenames and validate each file."""
        with self._lock:
            records: list[BackupRecord] = []
            if self.backup_dir.exists():
                for path in sorted(self.backup_dir.glob("*.json")):
                    if path.name == self.manifest_path.name:
                        continue
                    match = _FILENAME_PATTERN.fullmatch(path.name)
                    if match is None:
                        # Unknown files are deliberately preserved and not trusted.
                        continue
                    try:
                        backup_id = UUID(match.group("backup_id"))
                        created_at = datetime.strptime(
                            match.group("created"), "%Y%m%dT%H%M%S%z"
                        )
                    except (ValueError, TypeError):
                        continue
                    status = "valid" if self._is_valid_document_file(path) else "invalid"
                    records.append(
                        BackupRecord(
                            backup_id=backup_id,
                            created_at=created_at,
                            type=match.group("type"),
                            validation_status=status,
                            file_reference=path.name,
                        )
                    )
            catalog = BackupCatalog(backups=records)
            self._write_catalog(catalog)
            return catalog

    def create_backup(
        self,
        source_file: str | Path | None = None,
        *,
        backup_type: Literal["weekly", "pre_write"],
        now: datetime | None = None,
    ) -> BackupRecord:
        """Create and catalogue a validated snapshot of the current data file."""
        with self._lock:
            source = Path(source_file) if source_file is not None else self.data_file
            if source.resolve() != self.data_file.resolve():
                raise BackupError("Solo se permite respaldar el archivo principal configurado.")
            if backup_type not in BACKUP_TYPES:
                raise ValueError("Tipo de respaldo no admitido.")
            if not source.is_file():
                raise BackupError("No existe el archivo principal para respaldar.")

            try:
                payload = source.read_bytes()
                self._validate_document_bytes(payload)
            except (OSError, ValueError, UnicodeDecodeError, json.JSONDecodeError, ValidationError) as exc:
                raise BackupNotRestorableError(
                    "El archivo principal no es válido; no se creó el respaldo."
                ) from exc

            created_at = now or datetime.now(BUSINESS_TIMEZONE)
            if created_at.tzinfo is None or created_at.utcoffset() is None:
                raise ValueError("now debe incluir zona horaria.")

            # Load or rebuild the existing catalog before creating the new file.
            # Otherwise a first-run rebuild would discover the just-created file
            # and the subsequent append would duplicate its backup_id.
            catalog = self.load_catalog()
            backup_id = uuid4()
            stamp = created_at.strftime("%Y%m%dT%H%M%S%z")
            filename = f"{backup_type}__{stamp}__{backup_id}.json"
            target = self.backup_dir / filename
            self.backup_dir.mkdir(parents=True, exist_ok=True)
            self._atomic_write(target, payload)

            if not self._is_valid_document_file(target):
                target.unlink(missing_ok=True)
                raise BackupNotRestorableError("La copia creada no superó la validación.")

            record = BackupRecord(
                backup_id=backup_id,
                created_at=created_at,
                type=backup_type,
                validation_status="valid",
                file_reference=filename,
            )
            catalog.backups.append(record)
            if backup_type == "weekly":
                catalog = self._apply_weekly_retention(catalog)
            self._write_catalog(catalog)
            return record

    def validate_backup(self, backup_id: UUID | str) -> BackupRecord:
        """Revalidate one catalogued backup and persist its latest status."""
        identifier = UUID(str(backup_id))
        with self._lock:
            catalog = self.load_catalog()
            records = list(catalog.backups)
            for index, record in enumerate(records):
                if record.backup_id != identifier:
                    continue
                path = self._path_for_record(record)
                status = "valid" if self._is_valid_document_file(path) else "invalid"
                updated = record.model_copy(update={"validation_status": status})
                records[index] = updated
                self._write_catalog(BackupCatalog(backups=records))
                if status != "valid":
                    raise BackupNotRestorableError("La copia existe, pero no es válida.")
                return updated
            raise BackupNotFoundError("No existe una copia con el backup_id indicado.")

    def list_weekly(self) -> list[BackupRecord]:
        """Return weekly metadata only, newest first, capped at the API limit."""
        catalog = self.load_catalog()
        weekly = [item for item in catalog.backups if item.type == "weekly"]
        weekly.sort(key=lambda item: item.created_at, reverse=True)
        return weekly[: self.RETENTION_LIMIT]

    def create_weekly_if_due(self, *, now: datetime | None = None) -> BackupRecord | None:
        """Create one overdue weekly snapshot at startup; never backfill multiple weeks."""
        with self._lock:
            if not self.data_file.is_file():
                return None
            current = now or datetime.now(BUSINESS_TIMEZONE)
            if current.tzinfo is None or current.utcoffset() is None:
                raise ValueError("now debe incluir zona horaria.")
            catalog = self.load_catalog()
            weekly = [item for item in catalog.backups if item.type == "weekly"]
            if weekly:
                latest = max(weekly, key=lambda item: item.created_at)
                if current - latest.created_at < self.WEEKLY_INTERVAL:
                    return None
            return self.create_backup(backup_type="weekly", now=current)

    def _apply_weekly_retention(self, catalog: BackupCatalog) -> BackupCatalog:
        weekly = [item for item in catalog.backups if item.type == "weekly"]
        weekly.sort(key=lambda item: item.created_at, reverse=True)
        keep_ids = {item.backup_id for item in weekly[: self.RETENTION_LIMIT]}
        retained: list[BackupRecord] = []
        for record in catalog.backups:
            if record.type != "weekly" or record.backup_id in keep_ids:
                retained.append(record)
                continue
            try:
                self._path_for_record(record).unlink(missing_ok=True)
            except OSError:
                # Keep undeleted files represented in the manifest for diagnosis.
                retained.append(record)
        return BackupCatalog(backups=retained)

    def _validate_catalog_references(self, catalog: BackupCatalog) -> None:
        identifiers: set[UUID] = set()
        for record in catalog.backups:
            if record.backup_id in identifiers:
                raise BackupError("El manifiesto contiene backup_id duplicados.")
            identifiers.add(record.backup_id)
            backup_path = self._path_for_record(record)
            if not backup_path.is_file():
                raise BackupError("El manifiesto referencia un archivo de respaldo inexistente.")

    def _path_for_record(self, record: BackupRecord) -> Path:
        reference = Path(record.file_reference)
        if reference.is_absolute() or reference.name != record.file_reference:
            raise BackupError("Referencia de archivo de respaldo no segura.")
        return self.backup_dir / reference

    def _is_valid_document_file(self, path: Path) -> bool:
        try:
            self._validate_document_bytes(path.read_bytes())
            return True
        except (OSError, ValueError, UnicodeDecodeError, json.JSONDecodeError, ValidationError):
            return False

    @staticmethod
    def _validate_document_bytes(payload: bytes) -> DataDocument:
        decoded = payload.decode("utf-8")
        return DataDocument.model_validate(json.loads(decoded))

    def _write_catalog(self, catalog: BackupCatalog) -> None:
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        serialized = json.dumps(
            catalog.model_dump(mode="json"),
            ensure_ascii=False,
            indent=2,
            allow_nan=False,
        ) + "\n"
        self._atomic_write(self.manifest_path, serialized.encode("utf-8"))

    @staticmethod
    def _atomic_write(target: Path, payload: bytes) -> None:
        target.parent.mkdir(parents=True, exist_ok=True)
        temporary_path: Path | None = None
        try:
            with tempfile.NamedTemporaryFile(
                mode="wb",
                dir=target.parent,
                prefix=f".{target.name}.",
                suffix=".tmp",
                delete=False,
            ) as temporary:
                temporary_path = Path(temporary.name)
                temporary.write(payload)
                temporary.flush()
                os.fsync(temporary.fileno())
            os.replace(temporary_path, target)
            temporary_path = None
        finally:
            if temporary_path is not None:
                try:
                    temporary_path.unlink(missing_ok=True)
                except OSError:
                    pass
