"""REST endpoint for period dashboard indicators and charts."""
from uuid import UUID
from fastapi import APIRouter, Request
from app.schemas.dashboard import DashboardResponse
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/api/v1/periods", tags=["dashboard"])

def _service(request: Request) -> DashboardService:
    return request.app.state.dashboard_service

@router.get("/{period_id}/dashboard")
def get_dashboard(period_id: UUID, request: Request):
    """Return all dashboard indicators for one period."""
    result = _service(request).get_dashboard(period_id)
    return DashboardResponse.model_validate({"data": result})
