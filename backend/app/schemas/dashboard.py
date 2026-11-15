"""Dashboard response schemas."""
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from app.domain.enums import ActivityCategory, ActivityStatus

class DashboardModel(BaseModel):
    model_config = ConfigDict(extra="forbid")

class DashboardPeriod(DashboardModel):
    id: UUID
    year: int
    name: str
    start_date: str
    end_date: str

class FinancialCategory(DashboardModel):
    category: ActivityCategory
    allocated_budget: str
    expenses: str
    balance: str
    over_budget: bool

class FinancialDashboard(DashboardModel):
    total_budget: str
    total_expenses: str
    balance: str
    execution_percentage: str
    categories: list[FinancialCategory]

class ActivityStatusCount(DashboardModel):
    status: ActivityStatus
    count: int

class ActivityDashboard(DashboardModel):
    total: int
    by_status: list[ActivityStatusCount]
    completion_percentage: str
    overdue_count: int

class AlertDashboard(DashboardModel):
    upcoming_pending: int
    overdue_pending: int
    high_priority_pending: int

class BudgetExpenseChartItem(DashboardModel):
    category: ActivityCategory
    budget: str
    expenses: str

class ExpenseChartItem(DashboardModel):
    category: ActivityCategory
    expenses: str

class DashboardCharts(DashboardModel):
    activities_by_status: list[ActivityStatusCount]
    budget_vs_expenses_by_category: list[BudgetExpenseChartItem]
    expenses_by_category: list[ExpenseChartItem]
    completion_percentage: str

class DashboardData(DashboardModel):
    period: DashboardPeriod
    financial: FinancialDashboard
    activities: ActivityDashboard
    alerts: AlertDashboard
    charts: DashboardCharts

class DashboardResponse(DashboardModel):
    data: DashboardData
