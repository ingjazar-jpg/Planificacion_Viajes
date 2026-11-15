"""REST endpoint for period dashboard indicators and charts."""
from uuid import UUID
from fastapi import APIRouter, Request
from fastapi.exceptions import RequestValidationError
from app.schemas.dashboard import DashboardResponse
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/api/v1/periods", tags=["dashboard"])

def _service(request: Request) -> DashboardService:
    return request.app.state.dashboard_service

def _validate_query_keys(request: Request) -> None:
    if request.query_params:
        raise RequestValidationError([
            {
                "type": "extra_forbidden",
                "loc": ("query", key),
                "msg": "Extra inputs are not permitted",
                "input": request.query_params.get(key),
            }
            for key in sorted(request.query_params.keys())
        ])

@router.get("/{period_id}/dashboard")
def get_dashboard(period_id: UUID, request: Request):
    """Return all dashboard indicators for one period."""
    _validate_query_keys(request)
    result = _service(request).get_dashboard(period_id)
    return DashboardResponse.model_validate({"data": result})
