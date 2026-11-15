"""FastAPI application factory and startup lifecycle."""

from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.api.backups import router as backups_router
from app.api.periods import router as periods_router
from app.api.activities import router as activities_router
from app.api.alerts import router as alerts_router
from app.api.budgets import router as budgets_router
from app.api.expenses import router as expenses_router
from app.api.calendar import router as calendar_router
from app.api.dashboard import router as dashboard_router
from app.persistence.json_repository import JsonRepository
from app.services.backup_service import BackupService, BackupServiceError
from app.services.period_activity_service import PeriodActivityService, PeriodActivityServiceError
from app.services.alert_service import AlertService, AlertServiceError
from app.services.budget_expense_service import (
    BudgetExpenseService, BudgetExpenseServiceError,
)
from app.services.calendar_service import CalendarService, CalendarServiceError
from app.services.dashboard_service import DashboardService, DashboardServiceError


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
    application.state.period_activity_service = PeriodActivityService(data_repository)
    application.state.alert_service = AlertService(data_repository)
    application.state.budget_expense_service = BudgetExpenseService(data_repository)
    application.state.calendar_service = CalendarService(data_repository)
    application.state.dashboard_service = DashboardService(data_repository)

    @application.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        """Translate FastAPI/Pydantic validation failures to API-001 format."""
        details = []
        response_status = 422
        response_code = "VALIDATION_ERROR"
        for error in exc.errors():
            error_type = str(error.get("type", "validation_error"))
            location = error.get("loc", ())
            field = ".".join(str(part) for part in location if part != "body")
            detail = {
                "code": error_type,
                "message": str(error.get("msg", "El valor enviado no es válido.")),
            }
            if field:
                detail["field"] = field
            if error_type == "category_budget_exceeds_total":
                response_status = 409
                response_code = "CATEGORY_BUDGET_EXCEEDS_TOTAL"
                detail["code"] = response_code
                detail["field"] = "category_budgets"
            elif error_type == "immutable_field":
                response_code = "IMMUTABLE_FIELD"
                detail["code"] = response_code
                detail["field"] = "period_id"
            details.append(detail)
        return JSONResponse(
            status_code=response_status,
            content={
                "error": {
                    "code": response_code,
                    "message": (
                        "La asignación presupuestaria supera el presupuesto general."
                        if response_code == "CATEGORY_BUDGET_EXCEEDS_TOTAL"
                        else "El campo period_id es inmutable."
                        if response_code == "IMMUTABLE_FIELD"
                        else "La solicitud contiene datos inválidos."
                    ),
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

    @application.exception_handler(PeriodActivityServiceError)
    async def period_activity_exception_handler(
        request: Request, exc: PeriodActivityServiceError
    ) -> JSONResponse:
        detail = {"code": exc.code, "message": exc.message}
        if exc.field:
            detail["field"] = exc.field
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "details": [detail],
                }
            },
        )

    @application.exception_handler(AlertServiceError)
    async def alert_service_exception_handler(
        request: Request, exc: AlertServiceError
    ) -> JSONResponse:
        detail = {"code": exc.code, "message": exc.message}
        if exc.field:
            detail["field"] = exc.field
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "details": [detail],
                }
            },
        )


    @application.exception_handler(BudgetExpenseServiceError)
    async def budget_expense_exception_handler(
        request: Request, exc: BudgetExpenseServiceError
    ) -> JSONResponse:
        detail = {"code": exc.code, "message": exc.message}
        if exc.field:
            detail["field"] = exc.field
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "details": [detail],
                }
            },
        )

    @application.exception_handler(CalendarServiceError)
    async def calendar_service_exception_handler(
        request: Request, exc: CalendarServiceError
    ) -> JSONResponse:
        detail = {"code": exc.code, "message": exc.message}
        if exc.field:
            detail["field"] = exc.field
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "details": [detail],
                }
            },
        )

    @application.exception_handler(DashboardServiceError)
    async def dashboard_service_exception_handler(
        request: Request, exc: DashboardServiceError
    ) -> JSONResponse:
        detail = {"code": exc.code, "message": exc.message}
        if exc.field:
            detail["field"] = exc.field
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": {
                "code": exc.code, "message": exc.message, "details": [detail],
            }},
        )

    application.include_router(backups_router)
    application.include_router(periods_router)
    application.include_router(activities_router)
    application.include_router(alerts_router)
    application.include_router(budgets_router)
    application.include_router(expenses_router)
    application.include_router(calendar_router)
    application.include_router(dashboard_router)
    return application


app = create_app()
