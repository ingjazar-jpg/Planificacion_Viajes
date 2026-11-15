"""Enumerations shared by the backend domain."""

from enum import StrEnum


class ActivityCategory(StrEnum):
    TRAVEL = "Viajes"
    TRANSPORT = "Transporte"
    LODGING = "Alojamiento"
    RECREATION = "Recreación"
    TOURISM = "Turismo"
    FAMILY_GATHERINGS = "Reuniones familiares"
    OTHER = "Otros"


class Priority(StrEnum):
    HIGH = "Alta"
    MEDIUM = "Media"
    LOW = "Baja"


class ActivityStatus(StrEnum):
    PENDING = "Pendiente"
    IN_PROGRESS = "En progreso"
    COMPLETED = "Completada"
    CANCELLED = "Cancelada"
