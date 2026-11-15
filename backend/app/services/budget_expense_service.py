"""Application services for budgets, expenses, indicators, and expense history."""

from datetime import date, datetime
from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID, uuid4
from zoneinfo import ZoneInfo

from app.domain.entities import Budget, CategoryBudget, Expense, ExpenseHistory
from app.domain.enums import ActivityCategory, ExpenseModificationType
from app.persistence.document import DataDocument
from app.persistence.json_repository import JsonRepository


BUSINESS_TIMEZONE = ZoneInfo("America/Bogota")
MONEY_QUANTUM = Decimal("0.01")
EDITABLE_EXPENSE_FIELDS = (
    "concept", "description", "amount", "date", "category", "activity_id", "observations"
)


def _money(value: Decimal) -> str:
    return format(value.quantize(MONEY_QUANTUM), ".2f")


def _percentage(value: Decimal) -> str:
    return format(value.quantize(MONEY_QUANTUM, rounding=ROUND_HALF_UP), ".2f")


class BudgetExpenseServiceError(RuntimeError):
    """Safe domain/application error translated by the HTTP layer."""

    def __init__(self, status_code: int, code: str, message: str, field: str | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.field = field


class BudgetExpenseService:
    """Coordinate budget and expense rules against the validated JSON document."""

    def __init__(self, repository: JsonRepository):
        self.repository = repository

    @staticmethod
    def _now() -> datetime:
        return datetime.now(BUSINESS_TIMEZONE)

    def _load(self) -> DataDocument:
        return self.repository.load()

    def _save(self, document: DataDocument) -> None:
        document.metadata.updated_at = self._now()
        try:
            self.repository.save(document)
        except Exception as exc:
            raise BudgetExpenseServiceError(
                500, "PERSISTENCE_WRITE_FAILED",
                "No fue posible guardar los cambios. Los datos anteriores se conservaron."
            ) from exc

    @staticmethod
    def _period(document: DataDocument, period_id: UUID):
        period = next((item for item in document.periods if item.id == period_id), None)
        if period is None:
            raise BudgetExpenseServiceError(
                404, "PERIOD_NOT_FOUND", "No se encontró el período solicitado.", "period_id"
            )
        return period

    @staticmethod
    def _expense(document: DataDocument, expense_id: UUID):
        expense = next((item for item in document.expenses if item.id == expense_id), None)
        if expense is None:
            raise BudgetExpenseServiceError(
                404, "EXPENSE_NOT_FOUND", "No se encontró el gasto solicitado.", "expense_id"
            )
        return expense

    @staticmethod
    def _category_distribution(category_budgets: list[CategoryBudget]) -> dict:
        return {item.category: item.amount for item in category_budgets}

    def create_budget(self, period_id: UUID, *, total_budget: Decimal,
                      category_budgets: list[dict]) -> Budget:
        document = self._load()
        self._period(document, period_id)
        if any(item.period_id == period_id for item in document.budgets):
            raise BudgetExpenseServiceError(
                409, "BUDGET_ALREADY_EXISTS", "El período ya tiene un presupuesto."
            )
        categories = [item["category"] for item in category_budgets]
        if len(categories) != len(set(categories)):
            raise BudgetExpenseServiceError(
                422, "INVALID_CATEGORY_BUDGET", "No se permiten categorías repetidas."
            )
        normalized = [
            CategoryBudget(category=category, amount=amount)
            for category, amount in self._complete_distribution(category_budgets).items()
        ]
        if sum((item.amount for item in normalized), Decimal("0")) > total_budget:
            raise BudgetExpenseServiceError(
                409, "CATEGORY_BUDGET_EXCEEDS_TOTAL",
                "La suma de asignaciones supera el presupuesto general."
            )
        now = self._now()
        budget = Budget(
            id=uuid4(), period_id=period_id, total_budget=total_budget,
            category_budgets=normalized, created_at=now, updated_at=now,
        )
        updated = DataDocument.model_validate({
            **document.model_dump(mode="python"),
            "budgets": [*document.budgets, budget],
        })
        self._save(updated)
        return budget

    @staticmethod
    def _complete_distribution(category_budgets: list[dict]) -> dict:
        supplied = {item["category"]: item["amount"] for item in category_budgets}
        return {
            category: supplied.get(category, Decimal("0.00"))
            for category in ActivityCategory
        }

    def update_budget(self, period_id: UUID, *, total_budget: Decimal,
                      category_budgets: list[dict]) -> dict:
        document = self._load()
        self._period(document, period_id)
        current = next((item for item in document.budgets if item.period_id == period_id), None)
        if current is None:
            raise BudgetExpenseServiceError(
                404, "BUDGET_NOT_FOUND", "El período no tiene un presupuesto registrado."
            )
        categories = [item["category"] for item in category_budgets]
        if len(categories) != len(set(categories)):
            raise BudgetExpenseServiceError(
                422, "INVALID_CATEGORY_BUDGET", "No se permiten categorías repetidas."
            )
        normalized = [
            CategoryBudget(category=category, amount=amount)
            for category, amount in self._complete_distribution(category_budgets).items()
        ]
        if sum((item.amount for item in normalized), Decimal("0")) > total_budget:
            raise BudgetExpenseServiceError(
                409, "CATEGORY_BUDGET_EXCEEDS_TOTAL",
                "La suma de asignaciones supera el presupuesto general."
            )
        same_distribution = (
            current.total_budget == total_budget
            and {item.category: item.amount for item in current.category_budgets}
            == {item.category: item.amount for item in normalized}
        )
        if same_distribution:
            return self._budget_result(document, current)
        now = self._now()
        updated_budget = current.model_copy(update={
            "total_budget": total_budget,
            "category_budgets": normalized,
            "updated_at": now,
        })
        updated = DataDocument.model_validate({
            **document.model_dump(mode="python"),
            "budgets": [
                updated_budget if item.id == current.id else item
                for item in document.budgets
            ],
        })
        self._save(updated)
        return self._budget_result(updated, updated_budget)

    def get_budget(self, period_id: UUID) -> dict:
        document = self._load()
        self._period(document, period_id)
        budget = next((item for item in document.budgets if item.period_id == period_id), None)
        if budget is None:
            raise BudgetExpenseServiceError(
                404, "BUDGET_NOT_FOUND", "El período no tiene un presupuesto registrado."
            )
        return self._budget_result(document, budget)

    @staticmethod
    def _budget_result(document: DataDocument, budget: Budget) -> dict:
        expenses = [item for item in document.expenses if item.period_id == budget.period_id]
        total_expenses = sum((item.amount for item in expenses), Decimal("0"))
        general_balance = budget.total_budget - total_expenses
        execution = (
            (total_expenses / budget.total_budget) * Decimal("100")
            if budget.total_budget > 0 else Decimal("0")
        )
        allocated = {item.category: item.amount for item in budget.category_budgets}
        category_results = []
        for category in ActivityCategory:
            allocation = allocated.get(category, Decimal("0"))
            spent = sum(
                (item.amount for item in expenses if item.category == category),
                Decimal("0"),
            )
            category_results.append({
                "category": category,
                "allocated_amount": _money(allocation),
                "spent_amount": _money(spent),
                "balance": _money(allocation - spent),
                "over_budget": spent > allocation,
            })
        return {
            "id": budget.id,
            "period_id": budget.period_id,
            "total_budget": _money(budget.total_budget),
            "total_expenses": _money(total_expenses),
            "general_balance": _money(general_balance),
            "execution_percentage": _percentage(execution),
            "category_budgets": category_results,
            "created_at": budget.created_at,
            "updated_at": budget.updated_at,
        }

    def create_expense(self, **fields) -> Expense:
        document = self._load()
        period_id = fields["period_id"]
        self._period(document, period_id)
        activity_id = fields.get("activity_id")
        if activity_id is not None:
            activity = next((item for item in document.activities if item.id == activity_id), None)
            if activity is None:
                raise BudgetExpenseServiceError(
                    404, "ACTIVITY_NOT_FOUND", "No se encontró la actividad indicada.", "activity_id"
                )
            if activity.period_id != period_id:
                raise BudgetExpenseServiceError(
                    409, "EXPENSE_ACTIVITY_PERIOD_MISMATCH",
                    "La actividad debe pertenecer al mismo período del gasto.", "activity_id"
                )
        now = self._now()
        expense = Expense(id=uuid4(), **fields, created_at=now, updated_at=now)
        history = ExpenseHistory(
            id=uuid4(), expense_id=expense.id,
            modification_type=ExpenseModificationType.CREATION,
            previous_values={},
            new_values={field: getattr(expense, field) for field in (
                "period_id", *EDITABLE_EXPENSE_FIELDS
            )},
            modified_at=now,
        )
        updated = DataDocument.model_validate({
            **document.model_dump(mode="python"),
            "expenses": [*document.expenses, expense],
            "expense_history": [*document.expense_history, history],
        })
        self._save(updated)
        return expense

    def list_expenses(self, *, period_id: UUID | None = None,
                      start_date: date | None = None, end_date: date | None = None,
                      category: ActivityCategory | None = None,
                      activity_id: UUID | None = None,
                      min_amount: Decimal | None = None,
                      max_amount: Decimal | None = None) -> list[Expense]:
        document = self._load()
        if period_id is not None:
            self._period(document, period_id)
        if activity_id is not None and not any(item.id == activity_id for item in document.activities):
            raise BudgetExpenseServiceError(
                404, "ACTIVITY_NOT_FOUND", "No se encontró la actividad indicada.", "activity_id"
            )
        result = list(document.expenses)
        if period_id is not None:
            result = [item for item in result if item.period_id == period_id]
        if start_date is not None:
            result = [item for item in result if item.date >= start_date]
        if end_date is not None:
            result = [item for item in result if item.date <= end_date]
        if category is not None:
            result = [item for item in result if item.category == category]
        if activity_id is not None:
            result = [item for item in result if item.activity_id == activity_id]
        if min_amount is not None:
            result = [item for item in result if item.amount >= min_amount]
        if max_amount is not None:
            result = [item for item in result if item.amount <= max_amount]
        return sorted(result, key=lambda item: (item.date, item.created_at, str(item.id)), reverse=True)

    def get_expense(self, expense_id: UUID) -> Expense:
        return self._expense(self._load(), expense_id)

    def update_expense(self, expense_id: UUID, fields: dict, *, partial: bool) -> Expense:
        document = self._load()
        current = self._expense(document, expense_id)
        if partial:
            changes = dict(fields)
        else:
            changes = dict(fields)
        if "period_id" in changes:
            raise BudgetExpenseServiceError(
                422, "IMMUTABLE_FIELD", "period_id no puede modificarse.", "period_id"
            )
        candidate = {
            field: getattr(current, field) for field in EDITABLE_EXPENSE_FIELDS
        }
        candidate.update(changes)
        activity_id = candidate["activity_id"]
        if activity_id is not None:
            activity = next((item for item in document.activities if item.id == activity_id), None)
            if activity is None:
                raise BudgetExpenseServiceError(
                    404, "ACTIVITY_NOT_FOUND", "No se encontró la actividad indicada.", "activity_id"
                )
            if activity.period_id != current.period_id:
                raise BudgetExpenseServiceError(
                    409, "EXPENSE_ACTIVITY_PERIOD_MISMATCH",
                    "La actividad debe pertenecer al mismo período del gasto.", "activity_id"
                )
        previous = current.model_dump(mode="python")
        updated_fields = {}
        for field in EDITABLE_EXPENSE_FIELDS:
            if candidate[field] != getattr(current, field):
                updated_fields[field] = candidate[field]
        if not updated_fields:
            return current
        now = self._now()
        updated_expense = Expense.model_validate({
            **previous, **updated_fields, "updated_at": now,
        })
        previous_values = {field: getattr(current, field) for field in updated_fields}
        new_values = {field: getattr(updated_expense, field) for field in updated_fields}
        history = ExpenseHistory(
            id=uuid4(), expense_id=expense_id,
            modification_type=ExpenseModificationType.EDITION,
            previous_values=previous_values, new_values=new_values, modified_at=now,
        )
        updated = DataDocument.model_validate({
            **document.model_dump(mode="python"),
            "expenses": [
                updated_expense if item.id == expense_id else item
                for item in document.expenses
            ],
            "expense_history": [*document.expense_history, history],
        })
        self._save(updated)
        return updated_expense

    def delete_expense(self, expense_id: UUID) -> None:
        document = self._load()
        self._expense(document, expense_id)
        updated = DataDocument.model_validate({
            **document.model_dump(mode="python"),
            "expenses": [item for item in document.expenses if item.id != expense_id],
            "expense_history": [
                item for item in document.expense_history if item.expense_id != expense_id
            ],
        })
        self._save(updated)

    def expense_history(self, expense_id: UUID) -> list[ExpenseHistory]:
        document = self._load()
        self._expense(document, expense_id)
        return sorted(
            [item for item in document.expense_history if item.expense_id == expense_id],
            key=lambda item: (item.modified_at, str(item.id)),
        )
