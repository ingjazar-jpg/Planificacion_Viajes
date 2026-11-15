"""Pydantic schemas for backup catalogue and restore endpoints."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class BackupResponse(BaseModel):
    """Public weekly backup metadata; internal file references are excluded."""

    model_config = ConfigDict(from_attributes=True)

    backup_id: UUID
    created_at: datetime
    type: Literal["weekly"]
    validation_status: Literal["valid", "invalid", "not_validated"]


class BackupListResponse(BaseModel):
    """Response envelope for GET /backups."""

    data: list[BackupResponse] = Field(max_length=15)


class BackupRestoreRequest(BaseModel):
    """Explicitly confirmed weekly backup restore request."""

    model_config = ConfigDict(extra="forbid")

    backup_id: UUID
    confirmed: bool = Field(default=False, strict=True)


class BackupRestoreResult(BaseModel):
    """Successful restore operation details."""

    status: Literal["restored"] = "restored"
    backup_id: UUID
    restored_at: datetime
    message: str


class BackupRestoreResponse(BaseModel):
    """Response envelope for POST /backups/restore."""

    data: BackupRestoreResult
