"""Application service for listing and restoring weekly backups."""

from datetime import datetime
from zoneinfo import ZoneInfo

from app.persistence.backup_manager import (
    BackupError,
    BackupNotFoundError,
    BackupNotRestorableError,
)
from app.persistence.json_repository import (
    JsonRepository,
    RepositoryRestoreError,
    RestoreConfirmationRequiredError,
)


BUSINESS_TIMEZONE = ZoneInfo("America/Bogota")


class BackupServiceError(RuntimeError):
    """Safe application error ready to be translated into an HTTP response."""

    def __init__(self, status_code: int, code: str, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message


class BackupService:
    """Expose only the backup operations permitted by API-001."""

    def __init__(self, repository: JsonRepository) -> None:
        self.repository = repository

    def list_weekly(self):
        """Return the latest weekly backup metadata without internal references."""
        try:
            return self.repository.backup_manager.list_weekly()
        except Exception as exc:
            raise BackupServiceError(
                500,
                "BACKUP_CATALOG_UNAVAILABLE",
                "No fue posible consultar las copias de seguridad.",
            ) from exc

    def restore_weekly(self, backup_id: str, *, confirmed: bool):
        """Restore one weekly backup after explicit confirmation."""
        try:
            record = self.repository.restore_backup(backup_id, confirmed=confirmed)
        except RestoreConfirmationRequiredError as exc:
            raise BackupServiceError(
                422,
                "RESTORE_CONFIRMATION_REQUIRED",
                "Se requiere confirmación explícita para restaurar la copia.",
            ) from exc
        except BackupNotFoundError as exc:
            raise BackupServiceError(
                404,
                "BACKUP_NOT_FOUND",
                "No se encontró la copia semanal solicitada.",
            ) from exc
        except BackupNotRestorableError as exc:
            raise BackupServiceError(
                409,
                "BACKUP_NOT_RESTORABLE",
                "La copia seleccionada no es válida o no puede restaurarse.",
            ) from exc
        except RepositoryRestoreError as exc:
            raise BackupServiceError(
                500,
                "BACKUP_RESTORE_FAILED",
                "No fue posible completar la restauración.",
            ) from exc
        except BackupError as exc:
            raise BackupServiceError(
                500,
                "BACKUP_RESTORE_FAILED",
                "No fue posible completar la restauración.",
            ) from exc
        except Exception as exc:
            raise BackupServiceError(
                500,
                "BACKUP_RESTORE_FAILED",
                "No fue posible completar la restauración.",
            ) from exc

        return {
            "status": "restored",
            "backup_id": record.backup_id,
            "restored_at": datetime.now(BUSINESS_TIMEZONE),
            "message": "La copia de seguridad se restauró correctamente.",
        }
