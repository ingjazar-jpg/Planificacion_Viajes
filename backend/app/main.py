"""FastAPI application factory and startup lifecycle."""

from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.api.backups import router as backups_router
from app.persistence.json_repository import JsonRepository
from app.services.backup_service import BackupService, BackupServiceError


DEFAULT_DATA_FILE = (
    Path(__file__).resolve().parents[2] / "data" / "datos_vacaciones.json"
)


def create_app(*, repository: JsonRepository | None = None) -> FastAPI:
    """Create the API application and initialize scheduled persistence tasks.

    The weekly backup check runs once per application lifespan. The repository
    remains injectable so lifecycle behavior can be tested without touching
    the user's real data directory.
    """
    data_repository = repository or JsonRepository(DEFAULT_DATA_FILE)

    @asynccontextmanager
    async def lifespan(application: FastAPI) -> AsyncIterator[None]:
        data_repository.create_weekly_backup_if_due()
        yield

    application = FastAPI(
        title="Sistema de Planificación y Control de Vacaciones Decembrinas",
        version="1.0.0",
        lifespan=lifespan,
    )
    # Services are available as soon as the app is constructed. The lifespan
    # is reserved for startup work and must not be required by route handlers.
    application.state.repository = data_repository
    application.state.backup_service = BackupService(data_repository)

    @application.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        """Translate FastAPI/Pydantic validation failures to API-001 format."""
        details = []
        for error in exc.errors():
            location = error.get("loc", ())
            field = ".".join(str(part) for part in location if part != "body")
            detail = {
                "code": str(error.get("type", "validation_error")),
                "message": str(error.get("msg", "El valor enviado no es válido.")),
            }
            if field:
                detail["field"] = field
            details.append(detail)
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "La solicitud contiene datos inválidos.",
                    "details": details,
                }
            },
        )

    @application.exception_handler(BackupServiceError)
    async def backup_service_exception_handler(
        request: Request, exc: BackupServiceError
    ) -> JSONResponse:
        """Return safe, contract-specific backup errors."""
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "details": [],
                }
            },
        )

    application.include_router(backups_router)
    return application


app = create_app()
