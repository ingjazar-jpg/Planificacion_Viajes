"""HTTP routes for weekly backup listing and restoration."""

from fastapi import APIRouter, Request
from fastapi.exceptions import RequestValidationError

from app.schemas.backups import (
    BackupListResponse,
    BackupRestoreRequest,
    BackupRestoreResponse,
)
from app.services.backup_service import BackupService, BackupServiceError


router = APIRouter(prefix="/api/v1/backups", tags=["backups"])


def _service(request: Request) -> BackupService:
    return request.app.state.backup_service


@router.get("", response_model=BackupListResponse)
def list_backups(request: Request) -> BackupListResponse:
    """List weekly backups without exposing internal file metadata."""
    if request.query_params:
        unknown = sorted(request.query_params.keys())
        raise RequestValidationError(
            [
                {
                    "type": "extra_forbidden",
                    "loc": ("query", name),
                    "msg": "Extra inputs are not permitted",
                    "input": request.query_params.get(name),
                }
                for name in unknown
            ]
        )
    records = _service(request).list_weekly()
    return BackupListResponse(data=records)


@router.post("/restore", response_model=BackupRestoreResponse)
def restore_backup(
    payload: BackupRestoreRequest, request: Request
) -> BackupRestoreResponse:
    """Restore a selected weekly backup after explicit user confirmation."""
    result = _service(request).restore_weekly(
        str(payload.backup_id), confirmed=payload.confirmed
    )
    return BackupRestoreResponse(data=result)
