"""Local frontend CORS policy tests."""

from unittest.mock import Mock

from fastapi.testclient import TestClient

from app.main import create_app


def test_cors_allows_the_configured_local_frontend_origin():
    client = TestClient(create_app(repository=Mock()))

    response = client.options(
        "/api/v1/periods",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_cors_does_not_allow_other_origins():
    client = TestClient(create_app(repository=Mock()))

    response = client.options(
        "/api/v1/periods",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert "access-control-allow-origin" not in response.headers
