"""Read-only application service for calendar range queries."""

from datetime import date, datetime, time, timedelta
from uuid import UUID
from zoneinfo import ZoneInfo

from app.domain.enums import ActivityStatus
from app.persistence.json_repository import JsonRepository


BUSINESS_TIMEZONE = ZoneInfo("America/Bogota")
ACTIVE_STATUSES = {ActivityStatus.PENDING, ActivityStatus.IN_PROGRESS}


class CalendarServiceError(RuntimeError):
    """Safe calendar error translated by the HTTP layer."""

    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        field: str | None = None,
    ):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.field = field


class CalendarService:
    """Query activities intersecting a visible calendar date range."""

    def __init__(self, repository: JsonRepository):
        self.repository = repository

    @staticmethod
    def now() -> datetime:
        """Return the current business-local time."""
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

    def list_calendar_activities(
        self,
        *,
        period_id: UUID,
        start_date: date,
        end_date: date,
        category=None,
        priority=None,
        status=None,
    ) -> list[dict]:
        """Return each matching activity once, retaining its original dates."""
        document = self.repository.load()
        if not any(item.id == period_id for item in document.periods):
            raise CalendarServiceError(
                404,
                "PERIOD_NOT_FOUND",
                "No se encontró el período solicitado.",
                "period_id",
            )

        now = self.now()
        if now.tzinfo is None or now.utcoffset() is None:
            raise CalendarServiceError(
                500,
                "CALENDAR_CLOCK_INVALID",
                "No fue posible determinar la hora local para consultar el calendario.",
            )
        now = now.astimezone(BUSINESS_TIMEZONE)

        result = []
        for activity in document.activities:
            if activity.period_id != period_id:
                continue
            if activity.start_date > end_date or activity.end_date < start_date:
                continue
            if category is not None and activity.category != category:
                continue
            if priority is not None and activity.priority != priority:
                continue
            if status is not None and activity.status != status:
                continue

            result.append({
                "id": activity.id,
                "period_id": activity.period_id,
                "name": activity.name,
                "description": activity.description,
                "category": activity.category,
                "destination": activity.destination,
                "start_date": activity.start_date,
                "end_date": activity.end_date,
                "start_time": activity.start_time,
                "end_time": activity.end_time,
                "priority": activity.priority,
                "status": activity.status,
                "is_overdue": self._is_overdue(activity, now),
            })
        return result
