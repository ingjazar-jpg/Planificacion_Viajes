"""REST endpoints for expenses and their change history."""

from datetime import date
from decimal import Decimal, InvalidOperation
from uuid import UUID

from fastapi import APIRouter, Query, Request, Response
from fastapi.exceptions import RequestValidationError

from app.domain.enums import ActivityCategory
from app.schemas.expenses import (
    ExpenseCreate, ExpenseHistoryResponse, ExpensePatch, ExpensePut, ExpenseResponse,
)
from app.services.budget_expense_service import BudgetExpenseService


router = APIRouter(prefix="/api/v1/expenses", tags=["expenses"])


def _service(request: Request) -> BudgetExpenseService:
    return request.app.state.budget_expense_service


def _validate_query_keys(request: Request, allowed: set[str]) -> None:
    unknown = sorted(set(request.query_params.keys()) - allowed)
    if unknown:
        raise RequestValidationError([
            {"type": "extra_forbidden", "loc": ("query", key),
             "msg": "Extra inputs are not permitted", "input": request.query_params.get(key)}
            for key in unknown
        ])


def _paged(items, page, page_size):
    if (page is None) != (page_size is None):
        raise RequestValidationError([{
            "type": "pagination_pair_required",
            "loc": ("query", "page" if page is None else "page_size"),
            "msg": "page y page_size deben enviarse conjuntamente.", "input": None,
        }])
    if page is None:
        return {"data": items}
    total = len(items)
    return {
        "data": items[(page - 1) * page_size:page * page_size],
        "meta": {
            "total": total, "page": page, "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size,
        },
    }


def _expense_response(expense) -> ExpenseResponse:
    return ExpenseResponse.model_validate({
        **expense.model_dump(mode="python"),
        "amount": format(expense.amount, ".2f"),
    })


def _filter_amount(value: str | None, field: str) -> Decimal | None:
    if value is None:
        return None
    try:
        amount = Decimal(value)
    except InvalidOperation as exc:
        raise RequestValidationError([{
            "type": "invalid_expense_filter", "loc": ("query", field),
            "msg": "El filtro debe ser un importe decimal válido.", "input": value,
        }]) from exc
    if not amount.is_finite() or amount < 0 or amount.as_tuple().exponent < -2:
        raise RequestValidationError([{
            "type": "invalid_expense_filter", "loc": ("query", field),
            "msg": "El filtro debe ser no negativo y tener máximo dos decimales.", "input": value,
        }])
    return amount


@router.get("")
def list_expenses(
    request: Request,
    period_id: UUID | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    category: ActivityCategory | None = None,
    activity_id: UUID | None = None,
    min_amount: str | None = None,
    max_amount: str | None = None,
    page: int | None = Query(default=None, ge=1),
    page_size: int | None = Query(default=None, ge=1, le=100),
):
    _validate_query_keys(request, {
        "period_id", "start_date", "end_date", "category", "activity_id",
        "min_amount", "max_amount", "page", "page_size",
    })
    minimum = _filter_amount(min_amount, "min_amount")
    maximum = _filter_amount(max_amount, "max_amount")
    if start_date is not None and end_date is not None and start_date > end_date:
        raise RequestValidationError([{
            "type": "invalid_expense_filter", "loc": ("query", "start_date"),
            "msg": "start_date no puede ser posterior a end_date.", "input": str(start_date),
        }])
    if minimum is not None and maximum is not None and minimum > maximum:
        raise RequestValidationError([{
            "type": "invalid_expense_filter", "loc": ("query", "min_amount"),
            "msg": "min_amount no puede superar max_amount.", "input": min_amount,
        }])
    records = _service(request).list_expenses(
        period_id=period_id, start_date=start_date, end_date=end_date,
        category=category, activity_id=activity_id,
        min_amount=minimum, max_amount=maximum,
    )
    result = _paged(records, page, page_size)
    return {
        "data": [_expense_response(item) for item in result["data"]],
        **({"meta": result["meta"]} if "meta" in result else {}),
    }


@router.post("", status_code=201)
def create_expense(payload: ExpenseCreate, request: Request):
    expense = _service(request).create_expense(**payload.model_dump())
    return {"data": _expense_response(expense)}


@router.get("/{expense_id}")
def get_expense(expense_id: UUID, request: Request):
    return {"data": _expense_response(_service(request).get_expense(expense_id))}


@router.put("/{expense_id}")
def replace_expense(expense_id: UUID, payload: ExpensePut, request: Request):
    if "period_id" in payload.model_fields_set:
        from app.services.budget_expense_service import BudgetExpenseServiceError
        raise BudgetExpenseServiceError(
            422, "IMMUTABLE_FIELD", "period_id no puede modificarse.", "period_id"
        )
    fields = payload.model_dump(exclude_unset=True, exclude={"period_id"})
    expense = _service(request).update_expense(expense_id, fields, partial=False)
    return {"data": _expense_response(expense)}


@router.patch("/{expense_id}")
def patch_expense(expense_id: UUID, payload: ExpensePatch, request: Request):
    if "period_id" in payload.model_fields_set:
        from app.services.budget_expense_service import BudgetExpenseServiceError
        raise BudgetExpenseServiceError(
            422, "IMMUTABLE_FIELD", "period_id no puede modificarse.", "period_id"
        )
    fields = payload.model_dump(exclude_unset=True, exclude={"period_id"})
    expense = _service(request).update_expense(expense_id, fields, partial=True)
    return {"data": _expense_response(expense)}


@router.delete("/{expense_id}", status_code=204)
def delete_expense(expense_id: UUID, request: Request):
    _service(request).delete_expense(expense_id)
    return Response(status_code=204)


@router.get("/{expense_id}/history")
def get_expense_history(expense_id: UUID, request: Request):
    history = _service(request).expense_history(expense_id)
    return {"data": [ExpenseHistoryResponse.model_validate(item) for item in history]}
