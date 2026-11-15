"""REST endpoints for vacation activities."""

from datetime import date
from uuid import UUID

from fastapi import APIRouter, Query, Request
from fastapi.exceptions import RequestValidationError

from app.domain.enums import ActivityCategory, ActivityStatus, Priority
from app.schemas.activities import ActivityCreate, ActivityPatch, ActivityPut, ActivityResponse
from app.services.period_activity_service import PeriodActivityService


router = APIRouter(prefix="/api/v1/activities", tags=["activities"])


def _service(request: Request) -> PeriodActivityService:
    return request.app.state.period_activity_service


def _validate_query_keys(request: Request, allowed: set[str]) -> None:
    unknown=sorted(set(request.query_params.keys())-allowed)
    if unknown:
        raise RequestValidationError([{"type":"extra_forbidden","loc":("query",key),"msg":"Extra inputs are not permitted","input":request.query_params.get(key)} for key in unknown])


def _paged(items,page,page_size):
    if (page is None)!=(page_size is None):
        raise RequestValidationError([{"type":"pagination_pair_required","loc":("query","page" if page is None else "page_size"),"msg":"page y page_size deben enviarse conjuntamente.","input":None}])
    if page is None:
        return {"data":items}
    total=len(items)
    return {"data":items[(page-1)*page_size:page*page_size],"meta":{"total":total,"page":page,"page_size":page_size,"total_pages":(total+page_size-1)//page_size}}


@router.get("")
def list_activities(request: Request, period_id: UUID | None = None, category: ActivityCategory | None = None, priority: Priority | None = None, status: ActivityStatus | None = None, start_date: date | None = None, end_date: date | None = None, destination: str | None = None, page: int | None = Query(default=None,ge=1), page_size: int | None = Query(default=None,ge=1,le=100)):
    _validate_query_keys(request,{"period_id","category","priority","status","start_date","end_date","destination","page","page_size"})
    if start_date and end_date and start_date>end_date:
        raise RequestValidationError([{"type":"date_range","loc":("query","start_date"),"msg":"start_date no puede ser posterior a end_date.","input":str(start_date)}])
    items=_service(request).list_activities(period_id=period_id,category=category,priority=priority,status=status,start_date=start_date,end_date=end_date,destination=destination)
    result=_paged(items,page,page_size)
    return {"data":[ActivityResponse.model_validate(item) for item in result["data"]], **({"meta":result["meta"]} if "meta" in result else {})}


@router.post("",status_code=201)
def create_activity(payload: ActivityCreate,request: Request):
    return {"data":ActivityResponse.model_validate(_service(request).create_activity(**payload.model_dump()))}


@router.get("/{activity_id}")
def get_activity(activity_id: UUID,request: Request):
    return {"data":ActivityResponse.model_validate(_service(request).get_activity(activity_id))}


@router.put("/{activity_id}")
def put_activity(activity_id: UUID,payload: ActivityPut,request: Request):
    return {"data":ActivityResponse.model_validate(_service(request).update_activity(activity_id,payload.model_dump(),partial=False))}


@router.patch("/{activity_id}")
def patch_activity(activity_id: UUID,payload: ActivityPatch,request: Request):
    return {"data":ActivityResponse.model_validate(_service(request).update_activity(activity_id,payload.model_dump(exclude_unset=True),partial=True))}


@router.delete("/{activity_id}",status_code=204)
def delete_activity(activity_id: UUID,request: Request):
    _service(request).delete_activity(activity_id)
    return None
