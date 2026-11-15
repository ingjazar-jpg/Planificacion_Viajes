"""REST endpoint for calendar range queries."""

from datetime import date
from uuid import UUID

from fastapi import APIRouter, Request
from fastapi.exceptions import RequestValidationError

from app.domain.enums import ActivityCategory, ActivityStatus, Priority
from app.schemas.calendar import CalendarActivityResponse
from app.services.calendar_service import CalendarService


router = APIRouter(prefix="/api/v1/calendar", tags=["calendar"])


def _service(request: Request) -> CalendarService:
    return request.app.state.calendar_service


def _validate_query_keys(request: Request) -> None:
    allowed = {
        "period_id", "start_date", "end_date",
        "category", "priority", "status",
    }
    unknown = sorted(set(request.query_params.keys()) - allowed)
    if unknown:
        raise RequestValidationError([
            {
                "type": "extra_forbidden",
                "loc": ("query", key),
                "msg": "Extra inputs are not permitted",
                "input": request.query_params.get(key),
            }
            for key in unknown
        ])


@router.get("")
def get_calendar(
    request: Request,
    period_id: UUID,
    start_date: date,
    end_date: date,
    category: ActivityCategory | None = None,
    priority: Priority | None = None,
    status: ActivityStatus | None = None,
):
    """Return matching activities for the requested inclusive date range."""
    _validate_query_keys(request)
    if start_date > end_date:
        raise RequestValidationError([{
            "type": "date_range",
            "loc": ("query", "start_date"),
            "msg": "start_date no puede ser posterior a end_date.",
            "input": str(start_date),
        }])

    activities = _service(request).list_calendar_activities(
        period_id=period_id,
        start_date=start_date,
        end_date=end_date,
        category=category,
        priority=priority,
        status=status,
    )
    return {
        "data": [
            CalendarActivityResponse.model_validate(item)
            for item in activities
        ]
    }
