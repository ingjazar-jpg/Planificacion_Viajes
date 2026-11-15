"""Read-only application service for period dashboard aggregations."""
from datetime import datetime, time, timedelta
from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID
from zoneinfo import ZoneInfo

from app.domain.enums import ActivityCategory, ActivityStatus, AlertStatus, AlertType
from app.persistence.json_repository import JsonRepository

BUSINESS_TIMEZONE = ZoneInfo("America/Bogota")
MONEY_QUANTUM = Decimal("0.01")
ACTIVE_STATUSES = {ActivityStatus.PENDING, ActivityStatus.IN_PROGRESS}


def _money(value: Decimal) -> str:
    return format(value.quantize(MONEY_QUANTUM), ".2f")


def _percentage(value: Decimal) -> str:
    return format(value.quantize(MONEY_QUANTUM, rounding=ROUND_HALF_UP), ".2f")


class DashboardServiceError(RuntimeError):
    """Safe dashboard error translated by the HTTP layer."""

    def __init__(self, status_code: int, code: str, message: str, field: str | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.field = field


class DashboardService:
    """Build all dashboard indicators from one validated document snapshot."""

    def __init__(self, repository: JsonRepository):
        self.repository = repository

    @staticmethod
    def now() -> datetime:
        return datetime.now(BUSINESS_TIMEZONE)

    @staticmethod
    def _is_overdue(activity, now: datetime) -> bool:
        if activity.status not in ACTIVE_STATUSES:
            return False
        overdue_at = datetime.combine(
            activity.end_date + timedelta(days=1),
            time.min,
            tzinfo=BUSINESS_TIMEZONE,
        )
        return now >= overdue_at

    def get_dashboard(self, period_id: UUID) -> dict:
        document = self.repository.load()
        period = next((item for item in document.periods if item.id == period_id), None)
        if period is None:
            raise DashboardServiceError(
                404, "PERIOD_NOT_FOUND", "No se encontró el período solicitado.", "period_id"
            )

        now = self.now()
        if now.tzinfo is None or now.utcoffset() is None:
            raise DashboardServiceError(
                500, "DASHBOARD_CLOCK_INVALID",
                "No fue posible determinar la hora local para generar el dashboard.",
            )
        now = now.astimezone(BUSINESS_TIMEZONE)

        activities = [item for item in document.activities if item.period_id == period_id]
        expenses = [item for item in document.expenses if item.period_id == period_id]
        budget = next((item for item in document.budgets if item.period_id == period_id), None)

        zero = Decimal("0.00")
        total_budget = budget.total_budget if budget else zero
        allocations = (
            {item.category: item.amount for item in budget.category_budgets}
            if budget else {}
        )
        total_expenses = sum((item.amount for item in expenses), Decimal("0"))
        balance = total_budget - total_expenses
        execution = (
            total_expenses / total_budget * Decimal("100")
            if total_budget > 0 else Decimal("0")
        )

        category_expenses = {
            category: sum(
                (item.amount for item in expenses if item.category == category),
                Decimal("0"),
            )
            for category in ActivityCategory
        }
        categories, budget_chart, expense_chart = [], [], []
        for category in ActivityCategory:
            allocated = allocations.get(category, zero)
            spent = category_expenses[category]
            categories.append({
                "category": category,
                "allocated_budget": _money(allocated),
                "expenses": _money(spent),
                "balance": _money(allocated - spent),
                "over_budget": spent > allocated,
            })
            budget_chart.append({
                "category": category, "budget": _money(allocated), "expenses": _money(spent),
            })
            expense_chart.append({"category": category, "expenses": _money(spent)})

        status_counts = [
            {"status": status, "count": sum(1 for item in activities if item.status == status)}
            for status in ActivityStatus
        ]
        cancelled_count = sum(1 for item in activities if item.status == ActivityStatus.CANCELLED)
        eligible_count = len(activities) - cancelled_count
        completed_count = sum(1 for item in activities if item.status == ActivityStatus.COMPLETED)
        completion = (
            Decimal(completed_count) / Decimal(eligible_count) * Decimal("100")
            if eligible_count else Decimal("0")
        )
        overdue_count = sum(1 for item in activities if self._is_overdue(item, now))

        activity_ids = {item.id for item in activities}
        alert_counts = {
            AlertType.UPCOMING: 0,
            AlertType.OVERDUE: 0,
            AlertType.HIGH_PRIORITY: 0,
        }
        for alert in document.alerts:
            if (
                alert.activity_id in activity_ids
                and alert.status == AlertStatus.PENDING
                and alert.condition_active
            ):
                alert_counts[alert.type] += 1

        return {
            "period": {
                "id": period.id, "year": period.year, "name": period.name,
                "start_date": period.start_date.isoformat(),
                "end_date": period.end_date.isoformat(),
            },
            "financial": {
                "total_budget": _money(total_budget),
                "total_expenses": _money(total_expenses),
                "balance": _money(balance),
                "execution_percentage": _percentage(execution),
                "categories": categories,
            },
            "activities": {
                "total": len(activities),
                "by_status": status_counts,
                "completion_percentage": _percentage(completion),
                "overdue_count": overdue_count,
            },
            "alerts": {
                "upcoming_pending": alert_counts[AlertType.UPCOMING],
                "overdue_pending": alert_counts[AlertType.OVERDUE],
                "high_priority_pending": alert_counts[AlertType.HIGH_PRIORITY],
            },
            "charts": {
                "activities_by_status": status_counts,
                "budget_vs_expenses_by_category": budget_chart,
                "expenses_by_category": expense_chart,
                "completion_percentage": _percentage(completion),
            },
        }
