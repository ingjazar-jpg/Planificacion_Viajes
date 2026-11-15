"""Contract, aggregation, filtering, comparison, and export tests for reports."""
from decimal import Decimal
from io import BytesIO

from openpyxl import load_workbook

from fastapi.testclient import TestClient

from app.main import create_app
from app.persistence.json_repository import JsonRepository


def _client(tmp_path):
    return TestClient(create_app(repository=JsonRepository(tmp_path / "data.json")))


def _period(client, year=2026):
    response = client.post("/api/v1/periods", json={
        "name": f"Vacaciones {year}",
        "start_date": f"{year}-12-01",
        "end_date": f"{year + 1}-01-31",
    })
    assert response.status_code == 201, response.text
    return response.json()["data"]


def _activity(client, period_id, name, day, *, category="Viajes", priority="Media", status=None,
              start_day=None, end_day=None):
    payload = {
        "period_id": period_id, "name": name, "category": category,
        "start_date": start_day or f"2026-12-{day:02d}",
        "end_date": end_day or f"2026-12-{day:02d}",
        "start_time": "08:00", "end_time": "10:00", "priority": priority,
    }
    response = client.post("/api/v1/activities", json=payload)
    assert response.status_code == 201, response.text
    activity = response.json()["data"]
    if status == "Completada":
        assert client.patch(f"/api/v1/activities/{activity['id']}", json={"status": "En progreso"}).status_code == 200
        assert client.patch(f"/api/v1/activities/{activity['id']}", json={"status": "Completada"}).status_code == 200
    elif status == "Cancelada":
        assert client.patch(f"/api/v1/activities/{activity['id']}", json={"status": "Cancelada"}).status_code == 200
    elif status == "En progreso":
        assert client.patch(f"/api/v1/activities/{activity['id']}", json={"status": "En progreso"}).status_code == 200
    return activity


def _expense(client, period_id, amount, day, *, category="Viajes", activity_id=None):
    response = client.post("/api/v1/expenses", json={
        "period_id": period_id, "concept": f"Gasto {day}",
        "amount": amount, "date": f"2026-12-{day:02d}",
        "category": category, "activity_id": activity_id,
    })
    assert response.status_code == 201, response.text
    return response.json()["data"]


def _budget(client, period_id, total="1000.00"):
    allocation = format(min(Decimal(total) * Decimal("0.60"), Decimal("600.00")), ".2f")
    response = client.post(f"/api/v1/periods/{period_id}/budget", json={
        "total_budget": total,
        "category_budgets": [{"category": "Viajes", "amount": allocation}],
    })
    assert response.status_code == 201, response.text
    return response


def test_general_report_applies_activity_and_expense_filters_independently_without_budget(tmp_path):
    client = _client(tmp_path)
    period = _period(client)
    completed = _activity(client, period["id"], "Completada", 10, status="Completada")
    _activity(client, period["id"], "Cancelada", 11, status="Cancelada")
    _expense(client, period["id"], "40.00", 10, category="Viajes", activity_id=completed["id"])
    _expense(client, period["id"], "25.00", 11, category="Otros")

    response = client.get(
        f"/api/v1/periods/{period['id']}/reports/general",
        params={"status": "Completada"},
    )

    assert response.status_code == 200, response.text
    assert "meta" not in response.json()
    data = response.json()["data"]
    assert data["budget"] == {
        "total_budget": "0.00", "total_expenses": "65.00",
        "balance": "-65.00", "execution_percentage": "0.00",
    }
    assert data["activities"]["total"] == 1
    assert data["activities"]["completion_percentage"] == "100.00"
    assert data["expenses"]["count"] == 2
    assert data["expenses"]["total"] == "65.00"
    assert len(data["expenses"]["items"]) == 2


def test_activity_report_includes_cancelled_and_paginates_after_filtering(tmp_path):
    client = _client(tmp_path)
    period = _period(client)
    _activity(client, period["id"], "Primera", 10, status="Completada")
    _activity(client, period["id"], "Segunda", 11, status="Cancelada")
    _activity(client, period["id"], "Tercera", 12, priority="Alta")

    response = client.get(
        f"/api/v1/periods/{period['id']}/reports/activities",
        params={"start_date": "2026-12-10", "end_date": "2026-12-12",
                "page": 1, "page_size": 1},
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["data"]["summary"]["total"] == 3
    assert body["data"]["summary"]["by_status"][-1]["count"] == 1
    assert len(body["data"]["activities"]) == 1
    assert body["meta"] == {"total": 3, "page": 1, "page_size": 1, "total_pages": 3}


def test_activity_date_filter_includes_multiday_intersections_once(tmp_path):
    client = _client(tmp_path)
    period = _period(client)
    _activity(
        client, period["id"], "Multidía", 10,
        start_day="2026-12-09", end_day="2026-12-12",
    )
    response = client.get(
        f"/api/v1/periods/{period['id']}/reports/activities",
        params={"start_date": "2026-12-12", "end_date": "2026-12-12"},
    )
    assert response.status_code == 200
    assert response.json()["data"]["summary"]["total"] == 1
    assert len(response.json()["data"]["activities"]) == 1


def test_budget_report_groups_filtered_expenses_and_unassociated_group_without_budget(tmp_path):
    client = _client(tmp_path)
    period = _period(client)
    activity = _activity(client, period["id"], "Viaje", 10)
    _expense(client, period["id"], "50.00", 10, category="Otros", activity_id=activity["id"])
    _expense(client, period["id"], "25.00", 11, category="Viajes")

    response = client.get(
        f"/api/v1/periods/{period['id']}/reports/budget",
        params={"min_amount": "25.00", "max_amount": "50.00"},
    )

    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert data["budget"]["total_budget"] == "0.00"
    assert len(data["budget"]["categories"]) == 7
    assert data["expenses"]["total"] == "75.00"
    assert data["expenses"]["balance"] == "-75.00"
    assert data["expenses"]["execution_percentage"] == "0.00"
    assert len(data["expenses"]["by_category"]) == 2
    groups = {item["activity_name"]: item for item in data["expenses"]["by_activity"]}
    assert groups["Viaje"]["total"] == "50.00"
    assert groups["Sin actividad asociada"]["total"] == "25.00"


def test_budget_report_category_filter_limits_allocations_and_expenses(tmp_path):
    client = _client(tmp_path)
    period = _period(client)
    _budget(client, period["id"])
    _expense(client, period["id"], "50.00", 10, category="Viajes")
    _expense(client, period["id"], "30.00", 11, category="Otros")

    response = client.get(
        f"/api/v1/periods/{period['id']}/reports/budget",
        params={"category": "Viajes"},
    )
    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert len(data["budget"]["categories"]) == 1
    assert data["budget"]["categories"][0]["category"] == "Viajes"
    assert data["expenses"]["total"] == "50.00"
    assert data["expenses"]["count"] == 1


def test_budget_comparison_supports_missing_budget_and_rejects_same_period(tmp_path):
    client = _client(tmp_path)
    first = _period(client, 2026)
    second = _period(client, 2027)
    _budget(client, first["id"], "100.00")
    _expense(client, first["id"], "25.00", 10)
    _expense(client, second["id"], "15.00", 10)

    response = client.get("/api/v1/reports/budget-comparison", params={
        "period_id_1": first["id"], "period_id_2": second["id"],
    })
    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert data["period_1"]["total_budget"] == "100.00"
    assert data["period_1"]["total_expenses"] == "25.00"
    assert data["period_2"]["total_budget"] == "0.00"
    assert data["period_2"]["total_expenses"] == "15.00"
    assert data["period_2"]["balance"] == "-15.00"
    assert set(data["period_1"]) == {
        "id", "year", "name", "total_budget", "total_expenses",
        "balance", "execution_percentage",
    }

    same = client.get("/api/v1/reports/budget-comparison", params={
        "period_id_1": first["id"], "period_id_2": first["id"],
    })
    assert same.status_code == 422
    assert same.json()["error"]["code"] == "INVALID_PERIOD_COMPARISON"


def test_report_filters_validate_pairs_ranges_and_applicability(tmp_path):
    client = _client(tmp_path)
    period = _period(client)
    base = f"/api/v1/periods/{period['id']}/reports"
    assert client.get(f"{base}/activities", params={"start_date": "2026-12-01"}).status_code == 422
    assert client.get(f"{base}/activities", params={
        "start_date": "2026-12-20", "end_date": "2026-12-01",
    }).status_code == 422
    assert client.get(f"{base}/budget", params={"status": "Completada"}).status_code == 422
    assert client.get(f"{base}/budget", params={
        "min_amount": "20.00", "max_amount": "10.00",
    }).status_code == 422
    assert client.get(f"{base}/activities", params={"page": 1}).status_code == 422
    assert client.get(f"{base}/activities", params={"unknown": "x"}).status_code == 422


def test_pdf_and_xlsx_exports_return_binary_downloads_and_period_scope_ignores_filters(tmp_path):
    client = _client(tmp_path)
    period = _period(client)
    _activity(client, period["id"], "Primera", 10)
    _activity(client, period["id"], "Segunda", 11, status="Cancelada")

    pdf = client.get(
        f"/api/v1/periods/{period['id']}/reports/activities",
        params={"format": "pdf", "scope": "filtered", "status": "Completada"},
    )
    assert pdf.status_code == 200, pdf.text
    assert pdf.headers["content-type"].startswith("application/pdf")
    assert pdf.headers["content-disposition"].startswith("attachment;")
    assert pdf.content.startswith(b"%PDF")

    xlsx = client.get(
        f"/api/v1/periods/{period['id']}/reports/activities",
        params={"format": "xlsx", "scope": "period", "status": "No existe",
                "page": 1, "page_size": 1},
    )
    assert xlsx.status_code == 200, xlsx.text
    assert xlsx.headers["content-type"].startswith(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    assert xlsx.content.startswith(b"PK")
    workbook = load_workbook(BytesIO(xlsx.content))
    activity_sheet = workbook["Actividades"]
    # The second activity is cancelled and receives the dedicated visual fill.
    assert activity_sheet["A3"].fill.fgColor.rgb.endswith("FCE4D6")

    for report_type in ("general", "budget"):
        for file_format, signature in (("pdf", b"%PDF"), ("xlsx", b"PK")):
            exported = client.get(
                f"/api/v1/periods/{period['id']}/reports/{report_type}",
                params={"format": file_format, "scope": "period"},
            )
            assert exported.status_code == 200, exported.text
            assert exported.content.startswith(signature)


def test_export_requires_format_and_scope_and_rejects_invalid_values(tmp_path):
    client = _client(tmp_path)
    period = _period(client)
    url = f"/api/v1/periods/{period['id']}/reports/general"
    assert client.get(url, params={"format": "pdf"}).status_code == 422
    assert client.get(url, params={"scope": "filtered"}).status_code == 422
    assert client.get(url, params={"format": "csv", "scope": "filtered"}).status_code == 422


def test_reports_are_read_only(tmp_path):
    client = _client(tmp_path)
    period = _period(client)
    _budget(client, period["id"])
    _expense(client, period["id"], "10.00", 10)
    before = client.get("/api/v1/expenses", params={"period_id": period["id"]}).json()["data"]
    assert client.get(f"/api/v1/periods/{period['id']}/reports/general").status_code == 200
    assert client.get(f"/api/v1/periods/{period['id']}/reports/budget?format=xlsx&scope=period").status_code == 200
    after = client.get("/api/v1/expenses", params={"period_id": period["id"]}).json()["data"]
    assert before == after
