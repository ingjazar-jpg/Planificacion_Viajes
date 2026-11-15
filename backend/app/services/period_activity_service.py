"""Application services for period and activity use cases."""

from datetime import date, datetime, time
from uuid import UUID, uuid4
from zoneinfo import ZoneInfo

from app.domain.entities import Activity, Period
from app.domain.enums import ActivityStatus
from app.persistence.document import DataDocument
from app.persistence.json_repository import JsonRepository


BUSINESS_TIMEZONE = ZoneInfo("America/Bogota")


class PeriodActivityServiceError(RuntimeError):
    """Safe business error translated by the HTTP layer."""

    def __init__(self, status_code: int, code: str, message: str, field: str | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.field = field


class PeriodActivityService:
    """Coordinate domain rules and atomic JSON document persistence."""

    def __init__(self, repository: JsonRepository):
        self.repository = repository

    @staticmethod
    def _now() -> datetime:
        return datetime.now(BUSINESS_TIMEZONE)

    def _document(self) -> DataDocument:
        return self.repository.load()

    def _save(self, document: DataDocument) -> None:
        document.metadata.updated_at = self._now()
        self.repository.save(document)

    @staticmethod
    def _period_or_404(document: DataDocument, period_id: UUID) -> Period:
        for period in document.periods:
            if period.id == period_id:
                return period
        raise PeriodActivityServiceError(404, "PERIOD_NOT_FOUND", "No se encontró el período solicitado.", "period_id")

    @staticmethod
    def _activity_or_404(document: DataDocument, activity_id: UUID) -> Activity:
        for activity in document.activities:
            if activity.id == activity_id:
                return activity
        raise PeriodActivityServiceError(404, "ACTIVITY_NOT_FOUND", "No se encontró la actividad solicitada.", "activity_id")

    def list_periods(self) -> list[Period]:
        return sorted(self._document().periods, key=lambda item: (item.year, item.created_at), reverse=True)

    def get_period(self, period_id: UUID) -> Period:
        return self._period_or_404(self._document(), period_id)

    def create_period(self, *, name: str, start_date: date, end_date: date) -> Period:
        document = self._document()
        year = start_date.year
        if any(item.year == year for item in document.periods):
            raise PeriodActivityServiceError(409, "PERIOD_YEAR_ALREADY_EXISTS", "Ya existe un período para el año indicado.", "start_date")
        now = self._now()
        period = Period(id=uuid4(), year=year, name=name, start_date=start_date, end_date=end_date, created_at=now)
        updated = DataDocument.model_validate({**document.model_dump(mode="python"), "periods": [*document.periods, period]})
        self._save(updated)
        return period

    def update_period(self, period_id: UUID, *, name: str, start_date: date, end_date: date) -> Period:
        document = self._document()
        current = self._period_or_404(document, period_id)
        year = start_date.year
        if any(item.id != period_id and item.year == year for item in document.periods):
            raise PeriodActivityServiceError(409, "PERIOD_YEAR_ALREADY_EXISTS", "Ya existe otro período para el año indicado.", "start_date")
        for activity in document.activities:
            if activity.period_id == period_id and (activity.start_date < start_date or activity.end_date > end_date):
                raise PeriodActivityServiceError(409, "PERIOD_RANGE_CONFLICT", "El nuevo rango dejaría actividades fuera del período.", "start_date")
        updated_period = current.model_copy(update={"year": year, "name": name, "start_date": start_date, "end_date": end_date})
        updated = DataDocument.model_validate({**document.model_dump(mode="python"), "periods": [updated_period if item.id == period_id else item for item in document.periods]})
        self._save(updated)
        return updated_period

    def list_activities(self, *, period_id=None, category=None, priority=None, status=None, start_date=None, end_date=None, destination=None) -> list[Activity]:
        activities = self._document().activities
        if period_id is not None:
            activities = [item for item in activities if item.period_id == period_id]
        if category is not None:
            activities = [item for item in activities if item.category == category]
        if priority is not None:
            activities = [item for item in activities if item.priority == priority]
        if status is not None:
            activities = [item for item in activities if item.status == status]
        if start_date is not None:
            activities = [item for item in activities if item.end_date >= start_date]
        if end_date is not None:
            activities = [item for item in activities if item.start_date <= end_date]
        if destination is not None:
            term = destination.casefold()
            activities = [item for item in activities if item.destination and term in item.destination.casefold()]
        return sorted(activities, key=lambda item: (item.start_date, item.start_time, str(item.id)))

    def get_activity(self, activity_id: UUID) -> Activity:
        return self._activity_or_404(self._document(), activity_id)

    @staticmethod
    def _validate_schedule(*, period: Period, activity_id: UUID | None, start_date: date, end_date: date, start_time: time, end_time: time, period_activities: list[Activity]) -> None:
        if start_date < period.start_date or end_date > period.end_date:
            raise PeriodActivityServiceError(409, "ACTIVITY_OUTSIDE_PERIOD", "Las fechas de la actividad deben permanecer dentro del período.", "start_date")
        start = datetime.combine(start_date, start_time)
        end = datetime.combine(end_date, end_time)
        if start >= end:
            raise PeriodActivityServiceError(422, "INVALID_ACTIVITY_SCHEDULE", "La finalización debe ser posterior al inicio.", "end_time")
        for other in period_activities:
            if other.id == activity_id:
                continue
            other_start = datetime.combine(other.start_date, other.start_time)
            other_end = datetime.combine(other.end_date, other.end_time)
            if start < other_end and other_start < end:
                raise PeriodActivityServiceError(409, "ACTIVITY_TIME_OVERLAP", "El horario se superpone con otra actividad del mismo período.")

    def create_activity(self, **fields) -> Activity:
        document = self._document()
        period_id = fields["period_id"]
        period = self._period_or_404(document, period_id)
        self._validate_schedule(period=period, activity_id=None, period_activities=[x for x in document.activities if x.period_id == period_id], **{key: fields[key] for key in ("start_date", "end_date", "start_time", "end_time")})
        now = self._now()
        activity = Activity(id=uuid4(), **fields, status=ActivityStatus.PENDING, created_at=now, updated_at=now)
        updated = DataDocument.model_validate({**document.model_dump(mode="python"), "activities": [*document.activities, activity]})
        self._save(updated)
        return activity

    def update_activity(self, activity_id: UUID, fields: dict, *, partial: bool) -> Activity:
        document = self._document()
        current = self._activity_or_404(document, activity_id)
        if partial:
            candidate_fields = {key: getattr(current, key) for key in ("name","description","category","destination","start_date","end_date","start_time","end_time","priority","status")}
            candidate_fields.update(fields)
        else:
            candidate_fields = dict(fields)
        allowed = {
            ActivityStatus.PENDING: {ActivityStatus.PENDING, ActivityStatus.IN_PROGRESS, ActivityStatus.CANCELLED},
            ActivityStatus.IN_PROGRESS: {ActivityStatus.IN_PROGRESS, ActivityStatus.COMPLETED, ActivityStatus.CANCELLED},
            ActivityStatus.COMPLETED: {ActivityStatus.COMPLETED},
            ActivityStatus.CANCELLED: {ActivityStatus.CANCELLED},
        }
        if candidate_fields["status"] not in allowed[current.status]:
            raise PeriodActivityServiceError(409, "INVALID_ACTIVITY_STATUS_TRANSITION", "La transición de estado solicitada no está permitida.", "status")
        period = self._period_or_404(document, current.period_id)
        self._validate_schedule(period=period, activity_id=activity_id, period_activities=[x for x in document.activities if x.period_id == current.period_id], **{key: candidate_fields[key] for key in ("start_date","end_date","start_time","end_time")})
        updated_activity = current.model_copy(update={**candidate_fields, "updated_at": self._now()})
        updated = DataDocument.model_validate({**document.model_dump(mode="python"), "activities": [updated_activity if item.id == activity_id else item for item in document.activities]})
        self._save(updated)
        return updated_activity

    def delete_activity(self, activity_id: UUID) -> None:
        document = self._document()
        self._activity_or_404(document, activity_id)
        expense_ids = {item.id for item in document.expenses if item.activity_id == activity_id}
        updated = DataDocument.model_validate({
            **document.model_dump(mode="python"),
            "activities": [item for item in document.activities if item.id != activity_id],
            "alerts": [item for item in document.alerts if item.activity_id != activity_id],
            "expenses": [item for item in document.expenses if item.activity_id != activity_id],
            "expense_history": [item for item in document.expense_history if item.expense_id not in expense_ids],
        })
        self._save(updated)
