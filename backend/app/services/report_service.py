"""Read-only report aggregation and export generation."""
from collections import defaultdict
from dataclasses import dataclass
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from io import BytesIO
from uuid import UUID
from xml.sax.saxutils import escape

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
)

from app.domain.enums import ActivityCategory, ActivityStatus, Priority
from app.persistence.json_repository import JsonRepository


ZERO = Decimal("0.00")
MONEY_QUANTUM = Decimal("0.01")


def money(value: Decimal) -> str:
    return format(value.quantize(MONEY_QUANTUM), ".2f")


def percentage(value: Decimal) -> str:
    return format(value.quantize(MONEY_QUANTUM, rounding=ROUND_HALF_UP), ".2f")


@dataclass(frozen=True)
class ReportFilters:
    start_date: date | None = None
    end_date: date | None = None
    category: ActivityCategory | None = None
    status: ActivityStatus | None = None
    activity_id: UUID | None = None
    priority: Priority | None = None
    min_amount: Decimal | None = None
    max_amount: Decimal | None = None


class ReportServiceError(RuntimeError):
    """Safe report error translated by the HTTP layer."""

    def __init__(self, status_code: int, code: str, message: str, field: str | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.field = field


class ReportService:
    """Build reports from a single read-only JSON document snapshot."""

    def __init__(self, repository: JsonRepository):
        self.repository = repository

    def _document_and_period(self, period_id: UUID):
        document = self.repository.load()
        period = next((item for item in document.periods if item.id == period_id), None)
        if period is None:
            raise ReportServiceError(
                404, "PERIOD_NOT_FOUND", "No se encontró el período solicitado.", "period_id"
            )
        return document, period

    @staticmethod
    def _period_data(period) -> dict:
        return {
            "id": period.id, "year": period.year, "name": period.name,
            "start_date": period.start_date, "end_date": period.end_date,
        }

    @staticmethod
    def _activity_matches(item, filters: ReportFilters) -> bool:
        if filters.start_date is not None and item.end_date < filters.start_date:
            return False
        if filters.end_date is not None and item.start_date > filters.end_date:
            return False
        if filters.category is not None and item.category != filters.category:
            return False
        if filters.status is not None and item.status != filters.status:
            return False
        if filters.activity_id is not None and item.id != filters.activity_id:
            return False
        if filters.priority is not None and item.priority != filters.priority:
            return False
        return True

    @staticmethod
    def _expense_matches(item, filters: ReportFilters) -> bool:
        if filters.start_date is not None and item.date < filters.start_date:
            return False
        if filters.end_date is not None and item.date > filters.end_date:
            return False
        if filters.category is not None and item.category != filters.category:
            return False
        if filters.activity_id is not None and item.activity_id != filters.activity_id:
            return False
        if filters.min_amount is not None and item.amount < filters.min_amount:
            return False
        if filters.max_amount is not None and item.amount > filters.max_amount:
            return False
        return True

    @staticmethod
    def _activity_summary(activities: list) -> dict:
        counts = [
            {"status": status, "count": sum(1 for item in activities if item.status == status)}
            for status in ActivityStatus
        ]
        cancelled = sum(1 for item in activities if item.status == ActivityStatus.CANCELLED)
        completed = sum(1 for item in activities if item.status == ActivityStatus.COMPLETED)
        eligible = len(activities) - cancelled
        completion = Decimal(completed) / Decimal(eligible) * 100 if eligible else ZERO
        return {
            "total": len(activities), "by_status": counts,
            "completion_percentage": percentage(completion),
        }

    @staticmethod
    def _activity_data(item) -> dict:
        return {
            "id": item.id, "period_id": item.period_id, "name": item.name,
            "category": item.category, "destination": item.destination,
            "start_date": item.start_date, "end_date": item.end_date,
            "start_time": item.start_time.strftime("%H:%M"),
            "end_time": item.end_time.strftime("%H:%M"),
            "priority": item.priority, "status": item.status,
        }

    @staticmethod
    def _expense_data(item) -> dict:
        return {
            "id": item.id, "period_id": item.period_id, "concept": item.concept,
            "description": item.description, "amount": money(item.amount),
            "date": item.date, "category": item.category,
            "activity_id": item.activity_id, "observations": item.observations,
        }

    @staticmethod
    def _paged(items: list, page: int | None, page_size: int | None) -> tuple[list, dict | None]:
        if page is None:
            return items, None
        total = len(items)
        return items[(page - 1) * page_size:page * page_size], {
            "total": total, "page": page, "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size,
        }

    def _records(self, document, period_id: UUID, filters: ReportFilters):
        activities = [
            item for item in document.activities
            if item.period_id == period_id and self._activity_matches(item, filters)
        ]
        expenses = [
            item for item in document.expenses
            if item.period_id == period_id and self._expense_matches(item, filters)
        ]
        activities.sort(key=lambda item: (item.start_date, item.start_time, str(item.id)))
        expenses.sort(key=lambda item: (item.date, item.created_at, str(item.id)))
        return activities, expenses

    def general_report(self, period_id: UUID, filters: ReportFilters, *, page=None, page_size=None):
        document, period = self._document_and_period(period_id)
        activities, expenses = self._records(document, period_id, filters)
        budget = next((item for item in document.budgets if item.period_id == period_id), None)
        total_budget = budget.total_budget if budget else ZERO
        total_expenses = sum((item.amount for item in expenses), ZERO)
        completion = self._activity_summary(activities)
        paged_expenses, meta = self._paged(expenses, page, page_size)
        return {
            "data": {
                "period": self._period_data(period),
                "budget": {
                    "total_budget": money(total_budget),
                    "total_expenses": money(total_expenses),
                    "balance": money(total_budget - total_expenses),
                    "execution_percentage": percentage(
                        total_expenses / total_budget * 100 if total_budget else ZERO
                    ),
                },
                "activities": completion,
                "expenses": {
                    "total": money(total_expenses), "count": len(expenses),
                    "items": [self._expense_data(item) for item in paged_expenses],
                },
                "summary": (
                    f"El período registra {len(activities)} actividades y "
                    f"{len(expenses)} gastos por {money(total_expenses)} COP."
                ),
            },
            "meta": meta,
        }

    def activities_report(self, period_id: UUID, filters: ReportFilters, *, page=None, page_size=None):
        document, period = self._document_and_period(period_id)
        activities, _ = self._records(document, period_id, filters)
        paged, meta = self._paged(activities, page, page_size)
        return {
            "data": {
                "period": self._period_data(period),
                "summary": self._activity_summary(activities),
                "activities": [self._activity_data(item) for item in paged],
            },
            "meta": meta,
        }

    def budget_report(self, period_id: UUID, filters: ReportFilters, *, page=None, page_size=None):
        document, period = self._document_and_period(period_id)
        _, expenses = self._records(document, period_id, filters)
        budget = next((item for item in document.budgets if item.period_id == period_id), None)
        total_budget = budget.total_budget if budget else ZERO
        allocations = {item.category: item.amount for item in budget.category_budgets} if budget else {}
        total_expenses = sum((item.amount for item in expenses), ZERO)

        categories = [filters.category] if filters.category is not None else list(ActivityCategory)
        category_rows = []
        for category in categories:
            allocated = allocations.get(category, ZERO)
            spent = sum((item.amount for item in expenses if item.category == category), ZERO)
            category_rows.append({
                "category": category, "allocated_budget": money(allocated),
                "expenses": money(spent), "balance": money(allocated - spent),
                "over_budget": spent > allocated,
            })

        by_category = []
        for category in ActivityCategory:
            selected = [item for item in expenses if item.category == category]
            if selected:
                by_category.append({
                    "category": category,
                    "total": money(sum((item.amount for item in selected), ZERO)),
                    "count": len(selected),
                })

        activity_map = {item.id: item.name for item in document.activities}
        grouped = defaultdict(list)
        for item in expenses:
            grouped[item.activity_id].append(item)
        by_activity = []
        for activity_id, records in grouped.items():
            by_activity.append({
                "activity_id": activity_id,
                "activity_name": activity_map.get(activity_id) if activity_id else "Sin actividad asociada",
                "total": money(sum((item.amount for item in records), ZERO)),
                "count": len(records),
            })
        by_activity.sort(key=lambda item: (
            item["activity_id"] is None,
            (item["activity_name"] or "").casefold(),
        ))

        paged, meta = self._paged(expenses, page, page_size)
        return {
            "data": {
                "period": self._period_data(period),
                "budget": {"total_budget": money(total_budget), "categories": category_rows},
                "expenses": {
                    "total": money(total_expenses), "count": len(expenses),
                    "by_category": by_category, "by_activity": by_activity,
                    "balance": money(total_budget - total_expenses),
                    "execution_percentage": percentage(
                        total_expenses / total_budget * 100 if total_budget else ZERO
                    ),
                    "items": [self._expense_data(item) for item in paged],
                },
            },
            "meta": meta,
        }

    def budget_comparison(self, period_id_1: UUID, period_id_2: UUID) -> dict:
        if period_id_1 == period_id_2:
            raise ReportServiceError(
                422, "INVALID_PERIOD_COMPARISON",
                "La comparación requiere dos períodos diferentes.", "period_id_2"
            )
        document = self.repository.load()
        periods = {item.id: item for item in document.periods}
        result = {}
        for key, period_id in (("period_1", period_id_1), ("period_2", period_id_2)):
            period = periods.get(period_id)
            if period is None:
                raise ReportServiceError(
                    404, "PERIOD_NOT_FOUND", "No se encontró uno de los períodos solicitados.",
                    "period_id_1" if key == "period_1" else "period_id_2",
                )
            budget = next((item for item in document.budgets if item.period_id == period_id), None)
            total_budget = budget.total_budget if budget else ZERO
            expenses = [item for item in document.expenses if item.period_id == period_id]
            total_expenses = sum((item.amount for item in expenses), ZERO)
            result[key] = {
                "id": period.id, "year": period.year, "name": period.name,
                "total_budget": money(total_budget), "total_expenses": money(total_expenses),
                "balance": money(total_budget - total_expenses),
                "execution_percentage": percentage(
                    total_expenses / total_budget * 100 if total_budget else ZERO
                ),
            }
        return {"data": result}

    def export(self, report_type: str, report: dict, file_format: str) -> tuple[bytes, str]:
        if file_format == "xlsx":
            return self._export_xlsx(report_type, report), (
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )
        return self._export_pdf(report_type, report), "application/pdf"

    @staticmethod
    def _flatten_report(report: dict) -> list[tuple[str, list[list[str]]]]:
        data = report["data"]
        period = data["period"]
        sheets = [("Resumen", [
            ["Período", str(period["name"])],
            ["Año", str(period["year"])],
        ])]
        if "budget" in data:
            budget = data["budget"]
            if "categories" in budget:
                sheets.append(("Presupuesto", [
                    ["Presupuesto general", budget["total_budget"]],
                    ["Categoría", "Asignado", "Gastos", "Saldo", "Sobreejecución"],
                    *[[str(x["category"].value if hasattr(x["category"], "value") else x["category"]),
                       x["allocated_budget"], x["expenses"], x["balance"], str(x["over_budget"])]
                      for x in budget["categories"]],
                ]))
            else:
                sheets.append(("Presupuesto", [
                    ["Presupuesto", budget["total_budget"]],
                    ["Gastos", budget["total_expenses"]],
                    ["Saldo", budget["balance"]],
                    ["Ejecución (%)", budget["execution_percentage"]],
                ]))
        if "summary" in data and isinstance(data["summary"], dict):
            summary = data["summary"]
            sheets.append(("Resumen de actividades", [
                ["Indicador", "Valor"],
                ["Total", str(summary["total"])],
                ["Cumplimiento (%)", summary["completion_percentage"]],
            ]))
            sheets.append(("Actividades por estado", [
                ["Estado", "Cantidad"],
                *[[str(x["status"].value), str(x["count"])] for x in summary["by_status"]],
            ]))
        if "activities" in data:
            activities = data["activities"]
            if isinstance(activities, dict) and "by_status" in activities:
                sheets.append(("Resumen de actividades", [
                    ["Indicador", "Valor"],
                    ["Total", str(activities["total"])],
                    ["Cumplimiento (%)", activities["completion_percentage"]],
                ]))
                sheets.append(("Actividades por estado", [
                    ["Estado", "Cantidad"],
                    *[[str(x["status"].value if hasattr(x["status"], "value") else x["status"]), str(x["count"])]
                      for x in activities["by_status"]],
                ]))
            if isinstance(data.get("activities"), list):
                sheets.append(("Actividades", [
                    ["Nombre", "Categoría", "Destino", "Inicio", "Fin", "Prioridad", "Estado"],
                    *[[str(x["name"]), str(x["category"].value), str(x["destination"] or ""),
                       str(x["start_date"]), str(x["end_date"]), str(x["priority"].value),
                       str(x["status"].value)] for x in data["activities"]],
                ]))
        expenses = data.get("expenses")
        if expenses and isinstance(expenses, dict):
            if "items" in expenses:
                sheets.append(("Gastos", [
                    ["Fecha", "Concepto", "Categoría", "Importe", "Actividad"],
                    *[[str(x["date"]), str(x["concept"]),
                       str(x["category"].value if hasattr(x["category"], "value") else x["category"]),
                       x["amount"], str(x["activity_id"] or "")] for x in expenses["items"]],
                ]))
            if "by_category" in expenses:
                sheets.append(("Gastos por categoría", [
                    ["Total de gastos", expenses["total"]],
                    ["Cantidad de gastos", str(expenses["count"])],
                    ["Saldo general", expenses["balance"]],
                    ["Ejecución (%)", expenses["execution_percentage"]],
                    ["Categoría", "Total", "Cantidad"],
                    *[[str(x["category"].value), x["total"], str(x["count"])]
                      for x in expenses["by_category"]],
                ]))
                sheets.append(("Gastos por actividad", [
                    ["Actividad", "Total", "Cantidad"],
                    *[[str(x["activity_name"]), x["total"], str(x["count"])]
                      for x in expenses["by_activity"]],
                ]))
        return sheets

    @classmethod
    def _export_xlsx(cls, report_type: str, report: dict) -> bytes:
        workbook = Workbook()
        workbook.remove(workbook.active)
        for title, rows in cls._flatten_report(report):
            sheet = workbook.create_sheet(title=title[:31])
            for row in rows:
                sheet.append(row)
            header_row = (
                5 if sheet.title == "Gastos por categoría"
                else 2 if sheet.title == "Presupuesto" and len(rows) > 1
                and rows[1] and rows[1][0] == "Categoría"
                else 1
            )
            sheet.freeze_panes = f"A{header_row + 1}"
            sheet.auto_filter.ref = (
                f"A{header_row}:{sheet.cell(row=sheet.max_row, column=sheet.max_column).coordinate}"
            )
            for cell in sheet[header_row]:
                cell.font = Font(bold=True, color="FFFFFF")
                cell.fill = PatternFill("solid", fgColor="315B68")
            if sheet.title == "Actividades":
                header = [cell.value for cell in sheet[1]]
                if "Estado" in header:
                    status_column = header.index("Estado") + 1
                    for row_index in range(2, sheet.max_row + 1):
                        if sheet.cell(row=row_index, column=status_column).value == "Cancelada":
                            for cell in sheet[row_index]:
                                cell.fill = PatternFill("solid", fgColor="FCE4D6")
            for column in sheet.columns:
                letter = column[0].column_letter
                width = min(max(max(len(str(cell.value or "")) for cell in column) + 2, 12), 42)
                sheet.column_dimensions[letter].width = width
        output = BytesIO()
        workbook.save(output)
        return output.getvalue()

    @classmethod
    def _export_pdf(cls, report_type: str, report: dict) -> bytes:
        output = BytesIO()
        document = report["data"]
        period = document["period"]
        pdf = SimpleDocTemplate(
            output, pagesize=landscape(letter), rightMargin=12 * mm,
            leftMargin=12 * mm, topMargin=12 * mm, bottomMargin=12 * mm,
        )
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            "ReportTitle", parent=styles["Title"], alignment=TA_CENTER,
            textColor=colors.HexColor("#315B68"),
        )
        story = [
            Paragraph(f"Informe {escape(report_type)}", title_style),
            Paragraph(f"{escape(str(period['name']))} · {period['year']}", styles["Heading2"]),
            Spacer(1, 5 * mm),
        ]
        for sheet_title, rows in cls._flatten_report(report):
            story.append(Paragraph(escape(sheet_title), styles["Heading3"]))
            table_data = [[Paragraph(escape(str(value)), styles["BodyText"]) for value in row]
                          for row in rows]
            if table_data:
                header_row = (
                    4 if sheet_title == "Gastos por categoría"
                    else 1 if sheet_title == "Presupuesto" and len(rows) > 1
                    and rows[1] and rows[1][0] == "Categoría"
                    else 0
                )
                table = Table(table_data, repeatRows=header_row + 1, hAlign="LEFT")
                table_commands = [
                    ("BACKGROUND", (0, header_row), (-1, header_row), colors.HexColor("#315B68")),
                    ("TEXTCOLOR", (0, header_row), (-1, header_row), colors.white),
                    ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#B7C5C9")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 5),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ]
                if sheet_title == "Actividades" and rows:
                    header = [str(value) for value in rows[0]]
                    if "Estado" in header:
                        status_column = header.index("Estado")
                        for row_index, row in enumerate(rows[1:], start=1):
                            if len(row) > status_column and str(row[status_column]) == "Cancelada":
                                table_commands.append((
                                    "BACKGROUND", (0, row_index), (-1, row_index),
                                    colors.HexColor("#FCE4D6"),
                                ))
                table.setStyle(TableStyle(table_commands))
                story.extend([table, Spacer(1, 4 * mm)])
        pdf.build(story)
        return output.getvalue()
