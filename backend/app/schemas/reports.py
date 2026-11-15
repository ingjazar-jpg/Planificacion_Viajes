"""Validated response schemas for reports and historical comparison."""
from datetime import date
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.domain.enums import ActivityCategory, ActivityStatus, Priority


class ReportModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ReportPeriod(ReportModel):
    id: UUID
    year: int
    name: str
    start_date: date | None = None
    end_date: date | None = None


class StatusCount(ReportModel):
    status: ActivityStatus
    count: int


class ReportActivity(ReportModel):
    id: UUID
    period_id: UUID
    name: str
    category: ActivityCategory
    destination: str | None
    start_date: date
    end_date: date
    start_time: str
    end_time: str
    priority: Priority
    status: ActivityStatus


class ReportExpense(ReportModel):
    id: UUID
    period_id: UUID
    concept: str
    description: str | None
    amount: str
    date: date
    category: ActivityCategory
    activity_id: UUID | None
    observations: str | None


class ReportMeta(ReportModel):
    total: int
    page: int
    page_size: int
    total_pages: int


class GeneralBudgetSummary(ReportModel):
    total_budget: str
    total_expenses: str
    balance: str
    execution_percentage: str


class GeneralActivitySummary(ReportModel):
    total: int
    by_status: list[StatusCount]
    completion_percentage: str


class GeneralExpenseSummary(ReportModel):
    total: str
    count: int
    items: list[ReportExpense]


class GeneralReportData(ReportModel):
    period: ReportPeriod
    budget: GeneralBudgetSummary
    activities: GeneralActivitySummary
    expenses: GeneralExpenseSummary
    summary: str


class GeneralReportResponse(ReportModel):
    data: GeneralReportData
    meta: ReportMeta | None = None


class ActivityReportSummary(ReportModel):
    total: int
    by_status: list[StatusCount]
    completion_percentage: str


class ActivityReportData(ReportModel):
    period: ReportPeriod
    summary: ActivityReportSummary
    activities: list[ReportActivity]


class ActivityReportResponse(ReportModel):
    data: ActivityReportData
    meta: ReportMeta | None = None


class BudgetCategoryReport(ReportModel):
    category: ActivityCategory
    allocated_budget: str
    expenses: str
    balance: str
    over_budget: bool


class ExpenseCategoryGroup(ReportModel):
    category: ActivityCategory
    total: str
    count: int


class ExpenseActivityGroup(ReportModel):
    activity_id: UUID | None
    activity_name: str
    total: str
    count: int


class BudgetSummaryReport(ReportModel):
    total_budget: str
    categories: list[BudgetCategoryReport]


class BudgetExpenseSummary(ReportModel):
    total: str
    count: int
    by_category: list[ExpenseCategoryGroup]
    by_activity: list[ExpenseActivityGroup]
    balance: str
    execution_percentage: str
    items: list[ReportExpense]


class BudgetReportData(ReportModel):
    period: ReportPeriod
    budget: BudgetSummaryReport
    expenses: BudgetExpenseSummary


class BudgetReportResponse(ReportModel):
    data: BudgetReportData
    meta: ReportMeta | None = None


class ComparisonPeriod(ReportModel):
    id: UUID
    year: int
    name: str
    total_budget: str
    total_expenses: str
    balance: str
    execution_percentage: str


class BudgetComparisonResponse(ReportModel):
    data: dict[str, ComparisonPeriod]
