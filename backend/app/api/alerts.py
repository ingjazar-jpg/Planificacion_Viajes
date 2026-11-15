"""REST endpoints for internal alerts."""

from uuid import UUID

from fastapi import APIRouter, Query, Request
from fastapi.exceptions import RequestValidationError

from app.domain.enums import AlertStatus, AlertType
from app.schemas.alerts import (
    AlertEvaluateRequest,
    AlertEvaluationResponse,
    AlertResponse,
)
from app.services.alert_service import AlertService


router = APIRouter(prefix="/api/v1/alerts", tags=["alerts"])


def _service(request: Request) -> AlertService:
    return request.app.state.alert_service


def _validate_query_keys(request: Request, allowed: set[str]) -> None:
    unknown = sorted(set(request.query_params.keys()) - allowed)
    if unknown:
        raise RequestValidationError([
            {"type":"extra_forbidden","loc":("query",key),"msg":"Extra inputs are not permitted","input":request.query_params.get(key)}
            for key in unknown
        ])


def _alert_response(alert, activity) -> AlertResponse:
    return AlertResponse.model_validate({
        **alert.model_dump(mode="python"),
        "activity": activity,
    })


def _paged(items, page, page_size):
    if (page is None) != (page_size is None):
        raise RequestValidationError([{
            "type":"pagination_pair_required",
            "loc":("query","page" if page is None else "page_size"),
            "msg":"page y page_size deben enviarse conjuntamente.",
            "input":None,
        }])
    if page is None:
        return {"data":items}
    total=len(items)
    return {
        "data":items[(page-1)*page_size:page*page_size],
        "meta":{
            "total":total,"page":page,"page_size":page_size,
            "total_pages":(total+page_size-1)//page_size,
        },
    }


@router.get("")
def list_alerts(
    request: Request,
    period_id: UUID | None = None,
    activity_id: UUID | None = None,
    alert_type: AlertType | None = Query(default=None, alias="type"),
    status: AlertStatus | None = None,
    condition_active: bool | None = None,
    page: int | None = Query(default=None, ge=1),
    page_size: int | None = Query(default=None, ge=1, le=100),
):
    _validate_query_keys(
        request,
        {"period_id","activity_id","type","status","condition_active","page","page_size"},
    )
    records = _service(request).list_alerts(
        period_id=period_id, activity_id=activity_id,
        alert_type=alert_type, status=status, condition_active=condition_active,
    )
    result = _paged(records,page,page_size)
    data = [_alert_response(alert,activity) for alert,activity in result["data"]]
    return {"data":data, **({"meta":result["meta"]} if "meta" in result else {})}


@router.post("/evaluate")
def evaluate_alerts(payload: AlertEvaluateRequest, request: Request):
    result = _service(request).evaluate_period(payload.period_id)
    return {"data":AlertEvaluationResponse.model_validate(result)}


@router.patch("/{alert_id}/review")
def review_alert(alert_id: UUID, request: Request):
    alert = _service(request).review(alert_id)
    document = request.app.state.repository.load()
    activity = next(item for item in document.activities if item.id == alert.activity_id)
    return {"data":_alert_response(alert,activity)}
