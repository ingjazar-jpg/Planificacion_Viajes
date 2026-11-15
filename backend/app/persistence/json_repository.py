"""Thread-safe JSON repository with validated and atomic persistence."""

from __future__ import annotations

import json
import os
import tempfile
from datetime import datetime
from pathlib import Path
from threading import RLock
from typing import Callable
from zoneinfo import ZoneInfo

from pydantic import ValidationError

from app.persistence.backup_manager import (
    BackupManager,
    BackupNotFoundError,
    BackupNotRestorableError,
    BackupRecord,
)
from app.persistence.document import DataDocument


BackupCallback = Callable[[Path], None]
_LOCKS_GUARD = RLock()
_PATH_LOCKS: dict[Path, RLock] = {}


class PersistenceError(RuntimeError):
    """Base exception for persistence failures."""


class DataCorruptionError(PersistenceError):
    """Raised when the existing JSON file cannot be parsed or validated."""


class RepositoryWriteError(PersistenceError):
    """Raised when a validated document cannot be committed safely."""


class RepositoryConfigurationError(PersistenceError):
    """Raised when a required persistence dependency is not configured."""


class RestoreConfirmationRequiredError(PersistenceError):
    """Raised when a restore operation lacks explicit user confirmation."""


class RepositoryRestoreError(PersistenceError):
    """Raised when a validated backup cannot safely replace the main document."""


def _atomic_replace(source: Path, target: Path) -> None:
    """Atomically replace a repository file without coupling backup writes."""
    os.replace(source, target)


def _lock_for(path: Path) -> RLock:
    """Return one shared in-process lock for each resolved data-file path."""
    key = path.resolve()
    with _LOCKS_GUARD:
        return _PATH_LOCKS.setdefault(key, RLock())


class JsonRepository:
    """Read and atomically replace one DATA-001 JSON document.

    Replacing an existing file automatically creates and catalogues a validated
    pre-write backup. A callback can be injected for controlled integrations/tests.
    """

    def __init__(
        self,
        file_path: str | Path,
        *,
        backup_before_write: BackupCallback | None = None,
        backup_manager: BackupManager | None = None,
    ) -> None:
        self.file_path = Path(file_path)
        self.backup_manager = backup_manager or BackupManager(self.file_path)
        self.backup_before_write = backup_before_write or self._create_pre_write_backup
        self._lock = _lock_for(self.file_path)

    def _create_pre_write_backup(self, source: Path) -> None:
        """Create a validated pre-write backup through the configured manager."""
        self.backup_manager.create_backup(source, backup_type="pre_write")

    def create_weekly_backup_if_due(
        self, *, now: datetime | None = None
    ) -> BackupRecord | None:
        """Create the scheduled weekly backup when the application starts.

        The application lifecycle should call this once during startup. If the
        weekly interval elapsed while the application was closed, one backup is
        created; missed weeks are not backfilled.
        """
        return self.backup_manager.create_weekly_if_due(now=now)

    def load(self) -> DataDocument:
        """Load and validate the document, or return an empty document if absent."""
        with self._lock:
            if not self.file_path.exists():
                now = datetime.now(ZoneInfo("America/Bogota"))
                return DataDocument.empty(now=now)

            try:
                with self.file_path.open("r", encoding="utf-8") as source:
                    payload = json.load(source)
                return DataDocument.model_validate(payload)
            except (OSError, UnicodeDecodeError, json.JSONDecodeError, ValidationError) as exc:
                raise DataCorruptionError(
                    f"No fue posible leer o validar el archivo de datos: {self.file_path.name}."
                ) from exc

    def save(self, document: DataDocument) -> None:
        """Validate, back up the current file, and atomically persist a document."""
        if not isinstance(document, DataDocument):
            raise TypeError("save() requiere una instancia de DataDocument.")

        with self._lock:
            self.file_path.parent.mkdir(parents=True, exist_ok=True)

            if self.file_path.exists():
                # Never overwrite a damaged or incompatible file.
                self.load()
                try:
                    self.backup_before_write(self.file_path)
                except Exception as exc:
                    raise RepositoryWriteError(
                        "No se pudo crear el respaldo previo; el archivo principal no fue modificado."
                    ) from exc

            payload = document.model_dump(mode="json")
            serialized = json.dumps(
                payload,
                ensure_ascii=False,
                indent=2,
                allow_nan=False,
            ) + "\n"

            temporary_path: Path | None = None
            try:
                with tempfile.NamedTemporaryFile(
                    mode="w",
                    encoding="utf-8",
                    newline="\n",
                    dir=self.file_path.parent,
                    prefix=f".{self.file_path.name}.",
                    suffix=".tmp",
                    delete=False,
                ) as temporary:
                    temporary_path = Path(temporary.name)
                    temporary.write(serialized)
                    temporary.flush()
                    os.fsync(temporary.fileno())

                # Validate the exact bytes that are about to replace the source.
                with temporary_path.open("r", encoding="utf-8") as candidate:
                    DataDocument.model_validate(json.load(candidate))

                _atomic_replace(temporary_path, self.file_path)
                temporary_path = None
                self._sync_parent_directory()
            except (OSError, UnicodeDecodeError, json.JSONDecodeError, ValidationError) as exc:
                raise RepositoryWriteError(
                    "No se pudo completar la escritura segura; se conservó el archivo anterior."
                ) from exc
            finally:
                if temporary_path is not None:
                    try:
                        temporary_path.unlink(missing_ok=True)
                    except OSError:
                        # A leftover temp file is safer than masking the original failure.
                        pass

    def restore_backup(
        self, backup_id: str, *, confirmed: bool
    ) -> BackupRecord:
        """Restore a validated weekly backup after explicit confirmation."""
        if confirmed is not True:
            raise RestoreConfirmationRequiredError(
                "Se requiere confirmación explícita para restaurar la copia."
            )

        with self._lock:
            try:
                record, payload = self.backup_manager.read_weekly_backup(backup_id)
            except (BackupNotFoundError, BackupNotRestorableError):
                raise

            self.file_path.parent.mkdir(parents=True, exist_ok=True)
            if self.file_path.exists():
                try:
                    self.load()
                except DataCorruptionError:
                    # Keep the damaged source byte-for-byte for later diagnosis.
                    try:
                        damaged_payload = self.file_path.read_bytes()
                        self.backup_manager.preserve_corrupt_data(damaged_payload)
                    except OSError as exc:
                        raise RepositoryRestoreError(
                            "No fue posible preservar el archivo principal dañado."
                        ) from exc
                else:
                    try:
                        self.backup_manager.create_backup(
                            self.file_path, backup_type="pre_write"
                        )
                    except Exception as exc:
                        raise RepositoryRestoreError(
                            "No fue posible crear el respaldo previo; no se inició la restauración."
                        ) from exc

            temporary_path: Path | None = None
            try:
                with tempfile.NamedTemporaryFile(
                    mode="wb",
                    dir=self.file_path.parent,
                    prefix=f".{self.file_path.name}.",
                    suffix=".restore.tmp",
                    delete=False,
                ) as temporary:
                    temporary_path = Path(temporary.name)
                    temporary.write(payload)
                    temporary.flush()
                    os.fsync(temporary.fileno())

                # Validate the exact backup bytes staged for atomic replacement.
                with temporary_path.open("rb") as candidate:
                    DataDocument.model_validate_json(candidate.read())

                _atomic_replace(temporary_path, self.file_path)
                temporary_path = None
                self._sync_parent_directory()
                return record
            except (OSError, UnicodeDecodeError, ValidationError, ValueError) as exc:
                raise RepositoryRestoreError(
                    "No se pudo completar la restauración; se conservaron los datos anteriores."
                ) from exc
            finally:
                if temporary_path is not None:
                    try:
                        temporary_path.unlink(missing_ok=True)
                    except OSError:
                        pass

    def _sync_parent_directory(self) -> None:
        """Persist the directory entry where supported by the operating system."""
        if os.name == "nt":
            return
        descriptor: int | None = None
        try:
            descriptor = os.open(self.file_path.parent, os.O_RDONLY)
            os.fsync(descriptor)
        except OSError:
            # The file itself has already been atomically replaced. Directory fsync
            # is an additional durability measure and is not available everywhere.
            return
        finally:
            if descriptor is not None:
                try:
                    os.close(descriptor)
                except OSError:
                    pass
