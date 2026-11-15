"""Application service for evaluating and reviewing internal alerts."""

from datetime import datetime, time, timedelta
from uuid import UUID, uuid4
from zoneinfo import ZoneInfo

from app.domain.entities import Alert, AlertHistoryEvent
from app.domain.enums import (
    ActivityStatus,
    AlertEventType,
    AlertStatus,
    AlertType,
    Priority,
)
from app.persistence.document import DataDocument
from app.persistence.json_repository import JsonRepository


BUSINESS_TIMEZONE = ZoneInfo("America/Bogota")
ACTIVE_ACTIVITY_STATUSES = {ActivityStatus.PENDING, ActivityStatus.IN_PROGRESS}


class AlertServiceError(RuntimeError):
    """Safe alert error translated by the HTTP layer."""

    def __init__(self, status_code: int, code: str, message: str, field: str | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.field = field


class AlertService:
    """Evaluate alert conditions and preserve one historical record per key."""

    def __init__(self, repository: JsonRepository):
        self.repository = repository

    @staticmethod
    def now() -> datetime:
        return datetime.now(BUSINESS_TIMEZONE)

    @staticmethod
    def _desired_types(activity, now: datetime) -> set[AlertType]:
        desired: set[AlertType] = set()
        if activity.status not in {ActivityStatus.COMPLETED, ActivityStatus.CANCELLED}:
            start_at = datetime.combine(
                activity.start_date, activity.start_time, tzinfo=BUSINESS_TIMEZONE
            )
            if now < start_at <= now + timedelta(hours=24):
                desired.add(AlertType.UPCOMING)

        if activity.status in ACTIVE_ACTIVITY_STATUSES:
            # SPEC-003 defines overdue at the end of the scheduled final date,
            # independent of the activity's end_time.
            overdue_at = datetime.combine(
                activity.end_date + timedelta(days=1),
                time.min,
                tzinfo=BUSINESS_TIMEZONE,
            )
            if now >= overdue_at:
                desired.add(AlertType.OVERDUE)
            if activity.priority == Priority.HIGH:
                desired.add(AlertType.HIGH_PRIORITY)
        return desired

    @classmethod
    def evaluate_document(
        cls,
        document: DataDocument,
        period_id: UUID,
        *,
        now: datetime | None = None,
        activity_ids: set[UUID] | None = None,
    ) -> tuple[DataDocument, dict[str, int]]:
        """Return a validated document with lifecycle events and evaluation counters."""
        evaluated_at = now or cls.now()
        if evaluated_at.tzinfo is None or evaluated_at.utcoffset() is None:
            raise ValueError("evaluated_at debe incluir zona horaria.")
        evaluated_at = evaluated_at.astimezone(BUSINESS_TIMEZONE)

        period = next((item for item in document.periods if item.id == period_id), None)
        if period is None:
            raise AlertServiceError(404, "PERIOD_NOT_FOUND", "No se encontró el período solicitado.", "period_id")

        activities = [
            item for item in document.activities
            if item.period_id == period_id and (activity_ids is None or item.id in activity_ids)
        ]
        activity_by_id = {item.id: item for item in activities}
        existing = {
            (item.activity_id, item.type): item
            for item in document.alerts
            if item.activity_id in activity_by_id
        }
        updated_alerts = list(document.alerts)
        counts = {
            "created_count": 0,
            "activated_count": 0,
            "deactivated_count": 0,
            "reactivated_count": 0,
        }

        for activity in activities:
            desired = cls._desired_types(activity, evaluated_at)
            for alert_type in AlertType:
                key = (activity.id, alert_type)
                current = existing.get(key)
                should_be_active = alert_type in desired

                if current is None and should_be_active:
                    created = Alert(
                        id=uuid4(),
                        activity_id=activity.id,
                        type=alert_type,
                        status=AlertStatus.PENDING,
                        condition_active=True,
                        created_at=evaluated_at,
                        updated_at=evaluated_at,
                        history=[
                            AlertHistoryEvent(
                                event_type=AlertEventType.CREATED,
                                occurred_at=evaluated_at,
                            )
                        ],
                    )
                    updated_alerts.append(created)
                    counts["created_count"] += 1
                    continue

                if current is None or current.condition_active == should_be_active:
                    continue

                if should_be_active:
                    event_type = (
                        AlertEventType.REACTIVATED
                        if current.status == AlertStatus.REVIEWED
                        else AlertEventType.ACTIVATED
                    )
                    counts[
                        "reactivated_count"
                        if event_type == AlertEventType.REACTIVATED
                        else "activated_count"
                    ] += 1
                else:
                    event_type = AlertEventType.DEACTIVATED
                    counts["deactivated_count"] += 1

                replacement = current.model_copy(update={
                    "condition_active": should_be_active,
                    "updated_at": evaluated_at,
                    "history": [
                        *current.history,
                        AlertHistoryEvent(event_type=event_type, occurred_at=evaluated_at),
                    ],
                })
                updated_alerts = [
                    replacement if item.id == current.id else item
                    for item in updated_alerts
                ]

        updated_document = DataDocument.model_validate({
            **document.model_dump(mode="python"),
            "alerts": updated_alerts,
        })
        counts["active_count"] = sum(
            1 for item in updated_document.alerts
            if item.condition_active
            and item.activity_id in {
                activity.id for activity in document.activities
                if activity.period_id == period_id
            }
        )
        counts["period_id"] = period_id
        counts["evaluated_at"] = evaluated_at
        return updated_document, counts

    def evaluate_period(self, period_id: UUID) -> dict:
        try:
            document = self.repository.load()
            updated, counts = self.evaluate_document(document, period_id)
            if any(counts[key] for key in (
                "created_count", "activated_count", "deactivated_count", "reactivated_count"
            )):
                updated.metadata.updated_at = counts["evaluated_at"]
                self.repository.save(updated)
            return counts
        except AlertServiceError:
            raise
        except Exception as exc:
            raise AlertServiceError(
                500, "ALERT_EVALUATION_FAILED",
                "No fue posible completar la evaluación de alertas.",
            ) from exc

    def evaluate_activity(self, period_id: UUID, activity_id: UUID) -> None:
        """Reevaluate one activity in the same data document after its mutation."""
        document = self.repository.load()
        updated, counts = self.evaluate_document(
            document, period_id, activity_ids={activity_id}
        )
        if any(counts[key] for key in (
            "created_count", "activated_count", "deactivated_count", "reactivated_count"
        )):
            updated.metadata.updated_at = counts["evaluated_at"]
            self.repository.save(updated)

    def review(self, alert_id: UUID):
        document = self.repository.load()
        alert = next((item for item in document.alerts if item.id == alert_id), None)
        if alert is None:
            raise AlertServiceError(404, "ALERT_NOT_FOUND", "No se encontró la alerta solicitada.", "alert_id")
        if alert.status == AlertStatus.REVIEWED:
            return alert

        reviewed_at = self.now()
        updated_alert = alert.model_copy(update={
            "status": AlertStatus.REVIEWED,
            "reviewed_at": reviewed_at,
            "updated_at": reviewed_at,
            "history": [
                *alert.history,
                AlertHistoryEvent(
                    event_type=AlertEventType.REVIEWED,
                    occurred_at=reviewed_at,
                ),
            ],
        })
        updated = DataDocument.model_validate({
            **document.model_dump(mode="python"),
            "alerts": [
                updated_alert if item.id == alert_id else item
                for item in document.alerts
            ],
        })
        updated.metadata.updated_at = reviewed_at
        try:
            self.repository.save(updated)
        except Exception as exc:
            raise AlertServiceError(
                500, "ALERT_REVIEW_FAILED",
                "No fue posible registrar la revisión de la alerta.",
            ) from exc
        return updated_alert

    def list_alerts(
        self, *, period_id: UUID | None = None, activity_id: UUID | None = None,
        alert_type: AlertType | None = None, status: AlertStatus | None = None,
        condition_active: bool | None = None,
    ):
        document = self.repository.load()
        periods = {item.id for item in document.periods}
        activities = {item.id: item for item in document.activities}
        if period_id is not None and period_id not in periods:
            raise AlertServiceError(404, "PERIOD_NOT_FOUND", "No se encontró el período solicitado.", "period_id")
        if activity_id is not None and activity_id not in activities:
            raise AlertServiceError(404, "ACTIVITY_NOT_FOUND", "No se encontró la actividad solicitada.", "activity_id")

        result = []
        for alert in document.alerts:
            activity = activities[alert.activity_id]
            if period_id is not None and activity.period_id != period_id:
                continue
            if activity_id is not None and alert.activity_id != activity_id:
                continue
            if alert_type is not None and alert.type != alert_type:
                continue
            if status is not None and alert.status != status:
                continue
            if condition_active is not None and alert.condition_active != condition_active:
                continue
            result.append((alert, activity))
        return sorted(result, key=lambda pair: (pair[0].created_at, str(pair[0].id)), reverse=True)
