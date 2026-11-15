"""REST endpoints for vacation periods."""

from uuid import UUID

from fastapi import APIRouter, Query, Request
from fastapi.exceptions import RequestValidationError

from app.schemas.periods import PeriodCreate, PeriodResponse, PeriodUpdate
from app.services.period_activity_service import PeriodActivityService


router = APIRouter(prefix="/api/v1/periods", tags=["periods"])


def _service(request: Request) -> PeriodActivityService:
    return request.app.state.period_activity_service


def _validate_query_keys(request: Request, allowed: set[str]) -> None:
    unknown = sorted(set(request.query_params.keys()) - allowed)
    if unknown:
        raise RequestValidationError([{"type":"extra_forbidden","loc":("query",key),"msg":"Extra inputs are not permitted","input":request.query_params.get(key)} for key in unknown])


def _paged(items, page: int | None, page_size: int | None):
    if (page is None) != (page_size is None):
        raise RequestValidationError([{"type":"pagination_pair_required","loc":("query","page" if page is None else "page_size"),"msg":"page y page_size deben enviarse conjuntamente.","input":None}])
    if page is None:
        return {"data":items}
    total=len(items)
    total_pages=(total+page_size-1)//page_size
    start=(page-1)*page_size
    return {"data":items[start:start+page_size],"meta":{"total":total,"page":page,"page_size":page_size,"total_pages":total_pages}}


@router.get("")
def list_periods(request: Request, page: int | None = Query(default=None, ge=1), page_size: int | None = Query(default=None, ge=1, le=100)):
    _validate_query_keys(request, {"page","page_size"})
    result=_paged(_service(request).list_periods(),page,page_size)
    return {"data":[PeriodResponse.model_validate(item) for item in result["data"]], **({"meta":result["meta"]} if "meta" in result else {})}


@router.post("", status_code=201)
def create_period(payload: PeriodCreate, request: Request):
    return {"data":PeriodResponse.model_validate(_service(request).create_period(**payload.model_dump()))}


@router.get("/{period_id}")
def get_period(period_id: UUID, request: Request):
    return {"data":PeriodResponse.model_validate(_service(request).get_period(period_id))}


@router.put("/{period_id}")
def update_period(period_id: UUID, payload: PeriodUpdate, request: Request):
    return {"data":PeriodResponse.model_validate(_service(request).update_period(period_id,**payload.model_dump()))}
