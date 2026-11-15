"""REST endpoints for period reports, exports, and budget comparison."""
from datetime import date
from decimal import Decimal, InvalidOperation
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import Response

from app.domain.enums import ActivityCategory, ActivityStatus, Priority
from app.schemas.reports import (
    ActivityReportResponse, BudgetComparisonResponse, BudgetReportResponse,
    GeneralReportResponse,
)
from app.services.report_service import (
    ReportFilters, ReportService, ReportServiceError,
)


router = APIRouter(tags=["reports"])
REPORT_FILTERS = {
    "general": {"start_date", "end_date", "category", "status", "activity_id", "priority",
                "min_amount", "max_amount"},
    "activities": {"start_date", "end_date", "category", "status", "activity_id", "priority"},
    "budget": {"start_date", "end_date", "category", "activity_id", "min_amount", "max_amount"},
}
CONTENT_FILTERS = {
    "start_date", "end_date", "category", "status", "activity_id", "priority",
    "min_amount", "max_amount",
}


def _service(request: Request) -> ReportService:
    return request.app.state.report_service


def _validate_query_keys(request: Request, allowed: set[str]) -> None:
    unknown = sorted(set(request.query_params.keys()) - allowed)
    if unknown:
        raise RequestValidationError([
            {"type": "extra_forbidden", "loc": ("query", key),
             "msg": "Extra inputs are not permitted", "input": request.query_params.get(key)}
            for key in unknown
        ])


def _error(field: str, code: str, message: str, value=None):
    raise RequestValidationError([{
        "type": code.lower(), "loc": ("query", field),
        "msg": message, "input": value,
    }])


def _parse_filters(request: Request, report_type: str, *, exporting: bool) -> ReportFilters:
    allowed = set(REPORT_FILTERS[report_type]) | {"page", "page_size"}
    if exporting:
        allowed |= {"format", "scope"}
        if request.query_params.get("scope") == "period":
            allowed |= CONTENT_FILTERS
    _validate_query_keys(request, allowed)
    if exporting and request.query_params.get("scope") == "period":
        return ReportFilters()
    if not exporting and ("format" in request.query_params or "scope" in request.query_params):
        _error("format", "invalid_export_parameters",
               "format y scope solo se admiten para exportar.")
    for field in CONTENT_FILTERS:
        if field in request.query_params and field not in REPORT_FILTERS[report_type]:
            _error(field, "unsupported_report_filter",
                   f"El filtro {field} no aplica a este informe.", request.query_params.get(field))

    start_date = request.query_params.get("start_date")
    end_date = request.query_params.get("end_date")
    if (start_date is None) != (end_date is None):
        _error("start_date" if start_date is None else "end_date",
               "date_range_pair_required", "start_date y end_date deben enviarse conjuntamente.")
    if start_date is not None:
        try:
            start_date = date.fromisoformat(start_date)
            end_date = date.fromisoformat(end_date)
        except ValueError:
            _error("start_date", "invalid_date_filter", "Las fechas deben usar YYYY-MM-DD.")
        if start_date > end_date:
            _error("start_date", "invalid_date_range",
                   "start_date no puede ser posterior a end_date.", str(start_date))

    minimum = _parse_amount(request, "min_amount")
    maximum = _parse_amount(request, "max_amount")
    if minimum is not None and maximum is not None and minimum > maximum:
        _error("min_amount", "invalid_amount_range",
               "min_amount no puede superar max_amount.", request.query_params.get("min_amount"))

    category = request.query_params.get("category")
    status = request.query_params.get("status")
    priority = request.query_params.get("priority")
    activity_id = request.query_params.get("activity_id")
    try:
        category = ActivityCategory(category) if category is not None else None
    except ValueError:
        _error("category", "invalid_report_filter", "La categoría no pertenece al catálogo.", category)
    try:
        status = ActivityStatus(status) if status is not None else None
    except ValueError:
        _error("status", "invalid_report_filter", "El estado no pertenece al catálogo.", status)
    try:
        priority = Priority(priority) if priority is not None else None
    except ValueError:
        _error("priority", "invalid_report_filter", "La prioridad no pertenece al catálogo.", priority)
    try:
        activity_id = UUID(activity_id) if activity_id is not None else None
    except ValueError:
        _error("activity_id", "invalid_report_filter", "activity_id debe ser un UUID válido.", activity_id)
    return ReportFilters(
        start_date=start_date, end_date=end_date, category=category,
        status=status, activity_id=activity_id, priority=priority,
        min_amount=minimum, max_amount=maximum,
    )


def _parse_amount(request: Request, field: str) -> Decimal | None:
    value = request.query_params.get(field)
    if value is None:
        return None
    try:
        amount = Decimal(value)
    except InvalidOperation:
        _error(field, "invalid_report_amount", "El importe debe ser decimal.")
    if not amount.is_finite() or amount < 0 or amount.as_tuple().exponent < -2:
        _error(field, "invalid_report_amount",
               "El importe debe ser no negativo y tener máximo dos decimales.", value)
    return amount


def _pagination(request: Request, exporting: bool):
    page = request.query_params.get("page")
    page_size = request.query_params.get("page_size")
    if exporting:
        return None, None
    if (page is None) != (page_size is None):
        _error("page" if page is None else "page_size", "pagination_pair_required",
               "page y page_size deben enviarse conjuntamente.")
    if page is None:
        return None, None
    try:
        page_value, size_value = int(page), int(page_size)
    except ValueError:
        _error("page", "invalid_pagination", "page y page_size deben ser enteros.")
    if page_value < 1 or not 1 <= size_value <= 100:
        _error("page_size", "invalid_pagination",
               "page debe ser >= 1 y page_size debe estar entre 1 y 100.")
    return page_value, size_value


def _report_response(report_type: str, result: dict):
    if report_type == "general":
        return GeneralReportResponse.model_validate(result)
    if report_type == "activities":
        return ActivityReportResponse.model_validate(result)
    return BudgetReportResponse.model_validate(result)


def _run_report(report_type: str, period_id: UUID, request: Request):
    exporting = "format" in request.query_params or "scope" in request.query_params
    if exporting and not {"format", "scope"}.issubset(request.query_params.keys()):
        _error("format" if "format" not in request.query_params else "scope",
               "export_parameters_required", "format y scope son obligatorios para exportar.")
    filters = _parse_filters(request, report_type, exporting=exporting)
    if exporting:
        file_format = request.query_params.get("format")
        scope = request.query_params.get("scope")
        if file_format not in {"pdf", "xlsx"}:
            _error("format", "invalid_export_format", "format debe ser pdf o xlsx.", file_format)
        if scope not in {"filtered", "period"}:
            _error("scope", "invalid_export_scope", "scope debe ser filtered o period.", scope)
        if scope == "period":
            filters = ReportFilters()
    page, page_size = _pagination(request, exporting)
    service = _service(request)
    method = {
        "general": service.general_report,
        "activities": service.activities_report,
        "budget": service.budget_report,
    }[report_type]
    result = method(period_id, filters, page=page, page_size=page_size)
    if not exporting:
        return _report_response(report_type, result)
    period_name = result["data"]["period"]["name"]
    safe_name = "".join(char if char.isalnum() or char in "-_" else "_" for char in period_name)
    filename = f"informe_{report_type}_{safe_name}.{file_format}"
    content, media_type = service.export(report_type, result, file_format)
    return Response(
        content=content, media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/api/v1/periods/{period_id}/reports/general")
def get_general_report(period_id: UUID, request: Request):
    return _run_report("general", period_id, request)


@router.get("/api/v1/periods/{period_id}/reports/activities")
def get_activities_report(period_id: UUID, request: Request):
    return _run_report("activities", period_id, request)


@router.get("/api/v1/periods/{period_id}/reports/budget")
def get_budget_report(period_id: UUID, request: Request):
    return _run_report("budget", period_id, request)


@router.get("/api/v1/reports/budget-comparison")
def get_budget_comparison(
    request: Request,
    period_id_1: UUID,
    period_id_2: UUID,
):
    _validate_query_keys(request, {"period_id_1", "period_id_2"})
    result = _service(request).budget_comparison(period_id_1, period_id_2)
    return BudgetComparisonResponse.model_validate(result)
