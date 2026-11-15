"""FastAPI application factory and startup lifecycle."""

from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator

from fastapi import FastAPI

from app.persistence.json_repository import JsonRepository


DEFAULT_DATA_FILE = (
    Path(__file__).resolve().parents[2] / "data" / "datos_vacaciones.json"
)


def create_app(*, repository: JsonRepository | None = None) -> FastAPI:
    """Create the API application and initialize scheduled persistence tasks.

    The weekly backup check runs once per application lifespan. The repository
    remains injectable so lifecycle behavior can be tested without touching
    the user's real data directory.
    """
    data_repository = repository or JsonRepository(DEFAULT_DATA_FILE)

    @asynccontextmanager
    async def lifespan(application: FastAPI) -> AsyncIterator[None]:
        application.state.repository = data_repository
        data_repository.create_weekly_backup_if_due()
        yield

    return FastAPI(
        title="Sistema de Planificación y Control de Vacaciones Decembrinas",
        version="1.0.0",
        lifespan=lifespan,
    )


app = create_app()
