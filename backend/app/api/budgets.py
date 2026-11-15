"""REST endpoints for period budgets and calculated indicators."""

from uuid import UUID

from fastapi import APIRouter, Request
from fastapi.exceptions import RequestValidationError

from app.schemas.budgets import BudgetCreateResponse, BudgetResponse
from app.schemas.budgets import BudgetUpsert
from app.services.budget_expense_service import BudgetExpenseService


router = APIRouter(prefix="/api/v1/periods", tags=["budgets"])


def _service(request: Request) -> BudgetExpenseService:
    return request.app.state.budget_expense_service


@router.post("/{period_id}/budget", status_code=201)
def create_budget(period_id: UUID, payload: BudgetUpsert, request: Request):
    budget = _service(request).create_budget(
        period_id,
        total_budget=payload.total_budget,
        category_budgets=[item.model_dump() for item in payload.category_budgets],
    )
    return {"data": BudgetCreateResponse.model_validate({
        "id": budget.id,
        "period_id": budget.period_id,
        "total_budget": format(budget.total_budget, ".2f"),
        "category_budgets": [
            {"category": item.category, "amount": format(item.amount, ".2f")}
            for item in budget.category_budgets
        ],
        "created_at": budget.created_at,
        "updated_at": budget.updated_at,
    })}


@router.get("/{period_id}/budget")
def get_budget(period_id: UUID, request: Request):
    result = _service(request).get_budget(UUID(period_id))
    return {"data": BudgetResponse.model_validate(result)}


@router.put("/{period_id}/budget")
def update_budget(period_id: UUID, payload: BudgetUpsert, request: Request):
    result = _service(request).update_budget(
        UUID(period_id),
        total_budget=payload.total_budget,
        category_budgets=[item.model_dump() for item in payload.category_budgets],
    )
    return {"data": BudgetResponse.model_validate(result)}
