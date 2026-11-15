"""Application startup lifecycle tests."""

from unittest.mock import Mock

from fastapi.testclient import TestClient

from app.main import create_app


def test_startup_runs_weekly_backup_check_once_per_lifespan():
    repository = Mock()
    application = create_app(repository=repository)

    with TestClient(application):
        repository.create_weekly_backup_if_due.assert_called_once_with()

    repository.create_weekly_backup_if_due.assert_called_once_with()


def test_startup_exposes_configured_repository_on_application_state():
    repository = Mock()
    application = create_app(repository=repository)

    with TestClient(application):
        assert application.state.repository is repository


def test_weekly_backup_check_runs_again_on_a_new_application_lifespan():
    repository = Mock()
    application = create_app(repository=repository)

    with TestClient(application):
        pass
    with TestClient(application):
        pass

    assert repository.create_weekly_backup_if_due.call_count == 2
