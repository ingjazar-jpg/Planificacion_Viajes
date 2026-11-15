"""Contract and business-rule tests for budgets and expenses."""

from datetime import datetime
from decimal import Decimal
from uuid import uuid4
from zoneinfo import ZoneInfo

from fastapi.testclient import TestClient

from app.domain.enums import ActivityCategory, ExpenseModificationType
from app.main import create_app
from app.persistence.json_repository import JsonRepository


NOW = datetime(2026, 11, 15, 10, 0, tzinfo=ZoneInfo("America/Bogota"))


def _client(tmp_path):
    repository = JsonRepository(tmp_path / "data.json")
    return TestClient(create_app(repository=repository)), repository


def _period(client, name="Vacaciones 2026", start="2026-12-01", end="2027-01-31"):
    response = client.post("/api/v1/periods", json={
        "name": name, "start_date": start, "end_date": end,
    })
    assert response.status_code == 201, response.text
    return response.json()["data"]


def _activity(client, period_id, **overrides):
    payload = {
        "period_id": period_id, "name": "Viaje familiar", "category": "Viajes",
        "start_date": "2026-12-10", "end_date": "2026-12-10",
        "start_time": "08:00", "end_time": "10:00", "priority": "Media",
    }
    payload.update(overrides)
    response = client.post("/api/v1/activities", json=payload)
    assert response.status_code == 201, response.text
    return response.json()["data"]


def _budget_payload(total="1000.00", categories=None):
    return {
        "total_budget": total,
        "category_budgets": (categories if categories is not None else [
            {"category": "Viajes", "amount": "600.00"},
            {"category": "Alojamiento", "amount": "200.00"},
        ]),
    }


def _expense_payload(period_id, **overrides):
    payload = {
        "period_id": period_id, "concept": "Reserva hotel",
        "description": "Primera noche", "amount": "150.00",
        "date": "2026-12-10", "category": "Alojamiento",
        "activity_id": None, "observations": "Anticipo",
    }
    payload.update(overrides)
    return payload


def test_create_budget_returns_all_seven_categories_and_server_fields(tmp_path):
    client, _ = _client(tmp_path)
    period = _period(client)

    response = client.post(
        f"/api/v1/periods/{period['id']}/budget",
        json=_budget_payload(),
    )

    assert response.status_code == 201, response.text
    body = response.json()["data"]
    assert body["period_id"] == period["id"]
    assert body["total_budget"] == "1000.00"
    assert len(body["category_budgets"]) == 7
    values = {item["category"]: item["amount"] for item in body["category_budgets"]}
    assert values["Viajes"] == "600.00"
    assert values["Alojamiento"] == "200.00"
    assert values["Transporte"] == "0.00"
    assert body["created_at"] == body["updated_at"]


def test_budget_create_rejects_duplicate_and_excessive_allocation(tmp_path):
    client, _ = _client(tmp_path)
    period = _period(client)
    duplicate = _budget_payload(categories=[
        {"category": "Viajes", "amount": "100.00"},
        {"category": "Viajes", "amount": "100.00"},
    ])
    assert client.post(f"/api/v1/periods/{period['id']}/budget", json=duplicate).status_code == 422

    excessive = _budget_payload(total="100.00", categories=[
        {"category": "Viajes", "amount": "100.01"},
    ])
    response = client.post(f"/api/v1/periods/{period['id']}/budget", json=excessive)
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "CATEGORY_BUDGET_EXCEEDS_TOTAL"


def test_budget_create_rejects_duplicate_budget_and_unknown_period(tmp_path):
    client, _ = _client(tmp_path)
    period = _period(client)
    url = f"/api/v1/periods/{period['id']}/budget"
    assert client.post(url, json=_budget_payload()).status_code == 201
    response = client.post(url, json=_budget_payload())
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "BUDGET_ALREADY_EXISTS"

    missing = client.post(f"/api/v1/periods/{uuid4()}/budget", json=_budget_payload())
    assert missing.status_code == 404
    assert missing.json()["error"]["code"] == "PERIOD_NOT_FOUND"


def test_budget_get_calculates_general_and_category_indicators(tmp_path):
    client, _ = _client(tmp_path)
    period = _period(client)
    client.post(f"/api/v1/periods/{period['id']}/budget", json=_budget_payload())
    created = client.post("/api/v1/expenses", json=_expense_payload(period["id"]))
    assert created.status_code == 201, created.text

    response = client.get(f"/api/v1/periods/{period['id']}/budget")

    assert response.status_code == 200
    body = response.json()["data"]
    assert body["total_expenses"] == "150.00"
    assert body["general_balance"] == "850.00"
    assert body["execution_percentage"] == "15.00"
    categories = {item["category"]: item for item in body["category_budgets"]}
    assert categories["Alojamiento"]["spent_amount"] == "150.00"
    assert categories["Alojamiento"]["balance"] == "50.00"
    assert categories["Alojamiento"]["over_budget"] is False
    assert len(categories) == 7


def test_budget_zero_and_overexecution_indicators_are_safe(tmp_path):
    client, _ = _client(tmp_path)
    period = _period(client)
    client.post(f"/api/v1/periods/{period['id']}/budget", json=_budget_payload(
        total="0.00", categories=[]
    ))
    client.post("/api/v1/expenses", json=_expense_payload(period["id"], amount="12.50"))

    body = client.get(f"/api/v1/periods/{period['id']}/budget").json()["data"]
    assert body["execution_percentage"] == "0.00"
    assert body["general_balance"] == "-12.50"
    category = next(x for x in body["category_budgets"] if x["category"] == "Alojamiento")
    assert category["balance"] == "-12.50"
    assert category["over_budget"] is True


def test_budget_put_replaces_distribution_without_touching_expenses_or_history(tmp_path):
    client, repository = _client(tmp_path)
    period = _period(client)
    url = f"/api/v1/periods/{period['id']}/budget"
    original = client.post(url, json=_budget_payload()).json()["data"]
    expense = client.post("/api/v1/expenses", json=_expense_payload(period["id"])).json()["data"]
    before = repository.load()
    response = client.put(url, json=_budget_payload(
        total="2000.00",
        categories=[{"category": "Turismo", "amount": "500.00"}],
    ))
    assert response.status_code == 200, response.text
    body = response.json()["data"]
    assert body["id"] == original["id"]
    assert body["total_budget"] == "2000.00"
    categories = {x["category"]: x for x in body["category_budgets"]}
    assert categories["Turismo"]["allocated_amount"] == "500.00"
    assert categories["Viajes"]["allocated_amount"] == "0.00"
    after = repository.load()
    assert len(after.expenses) == 1
    assert str(after.expenses[0].id) == expense["id"]
    assert len(after.expense_history) == len(before.expense_history)


def test_budget_get_and_put_return_not_found_without_existing_budget(tmp_path):
    client, _ = _client(tmp_path)
    period = _period(client)
    assert client.get(f"/api/v1/periods/{period['id']}/budget").status_code == 404
    response = client.put(f"/api/v1/periods/{period['id']}/budget", json=_budget_payload())
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "BUDGET_NOT_FOUND"


def test_expense_create_persists_creation_history_and_normalizes_optional_text(tmp_path):
    client, repository = _client(tmp_path)
    period = _period(client)
    response = client.post("/api/v1/expenses", json=_expense_payload(
        period["id"], description="   ", observations=None,
    ))
    assert response.status_code == 201, response.text
    expense = response.json()["data"]
    assert expense["description"] is None
    assert expense["observations"] is None
    assert expense["amount"] == "150.00"
    history = client.get(f"/api/v1/expenses/{expense['id']}/history").json()["data"]
    assert len(history) == 1
    assert history[0]["modification_type"] == "Creación"
    assert history[0]["previous_values"] == {}
    assert history[0]["new_values"]["concept"] == "Reserva hotel"
    assert history[0]["new_values"]["period_id"] == period["id"]
    assert len(repository.load().expense_history) == 1


def test_expense_create_validates_period_activity_and_amount(tmp_path):
    client, _ = _client(tmp_path)
    period = _period(client)
    other_period = _period(client, name="Vacaciones 2027", start="2027-12-01", end="2028-01-31")
    activity = _activity(client, other_period["id"], start_date="2027-12-10", end_date="2027-12-10")
    mismatch = client.post("/api/v1/expenses", json=_expense_payload(
        period["id"], activity_id=activity["id"],
    ))
    assert mismatch.status_code == 409
    assert mismatch.json()["error"]["code"] == "EXPENSE_ACTIVITY_PERIOD_MISMATCH"

    missing_period = client.post("/api/v1/expenses", json=_expense_payload(str(uuid4())))
    assert missing_period.status_code == 404
    assert missing_period.json()["error"]["code"] == "PERIOD_NOT_FOUND"

    zero = client.post("/api/v1/expenses", json=_expense_payload(period["id"], amount="0.00"))
    assert zero.status_code == 422
    numeric = client.post("/api/v1/expenses", json=_expense_payload(period["id"], amount=1.25))
    assert numeric.status_code == 422
    too_precise = client.post("/api/v1/expenses", json=_expense_payload(period["id"], amount="1.234"))
    assert too_precise.status_code == 422


def test_expense_list_combines_filters_before_pagination_and_rejects_unknown_keys(tmp_path):
    client, _ = _client(tmp_path)
    period = _period(client)
    first = client.post("/api/v1/expenses", json=_expense_payload(period["id"])).json()["data"]
    client.post("/api/v1/expenses", json=_expense_payload(
        period["id"], concept="Taxi", amount="40.00", category="Transporte",
        date="2026-12-11",
    ))
    response = client.get("/api/v1/expenses", params={
        "period_id": period["id"], "category": "Alojamiento",
        "min_amount": "100.00", "page": 1, "page_size": 10,
    })
    assert response.status_code == 200
    assert response.json()["meta"]["total"] == 1
    assert response.json()["data"][0]["id"] == first["id"]
    assert client.get("/api/v1/expenses?page=1").status_code == 422
    assert client.get("/api/v1/expenses?unexpected=true").status_code == 422
    assert client.get("/api/v1/expenses?min_amount=1.234").status_code == 422
    assert client.get("/api/v1/expenses?start_date=2026-12-20&end_date=2026-12-01").status_code == 422


def test_expense_get_update_history_and_noop_patch(tmp_path):
    client, repository = _client(tmp_path)
    period = _period(client)
    expense = client.post("/api/v1/expenses", json=_expense_payload(period["id"])).json()["data"]
    expense_id = expense["id"]
    assert client.get(f"/api/v1/expenses/{expense_id}").status_code == 200

    patch = client.patch(f"/api/v1/expenses/{expense_id}", json={
        "amount": "175.00", "observations": "Actualizado",
    })
    assert patch.status_code == 200, patch.text
    assert patch.json()["data"]["amount"] == "175.00"
    records = client.get(f"/api/v1/expenses/{expense_id}/history").json()["data"]
    assert len(records) == 2
    assert records[1]["modification_type"] == "Edición"
    assert set(records[1]["previous_values"]) == {"amount", "observations"}
    assert set(records[1]["new_values"]) == {"amount", "observations"}

    before = repository.load().expenses[0].updated_at
    no_op = client.patch(f"/api/v1/expenses/{expense_id}", json={"amount": "175.00"})
    assert no_op.status_code == 200
    after = repository.load().expenses[0].updated_at
    assert after == before
    assert len(repository.load().expense_history) == 2


def test_expense_put_requires_full_editable_payload_and_period_is_immutable(tmp_path):
    client, _ = _client(tmp_path)
    period = _period(client)
    expense = client.post("/api/v1/expenses", json=_expense_payload(period["id"])).json()["data"]
    expense_id = expense["id"]
    incomplete = client.put(f"/api/v1/expenses/{expense_id}", json={"concept": "Cambio"})
    assert incomplete.status_code == 422

    complete = {
        "concept": "Nuevo concepto", "description": None, "amount": "200.00",
        "date": "2026-12-12", "category": "Viajes",
        "activity_id": None, "observations": None,
    }
    replaced = client.put(f"/api/v1/expenses/{expense_id}", json=complete)
    assert replaced.status_code == 200, replaced.text
    assert replaced.json()["data"]["concept"] == "Nuevo concepto"

    immutable = client.patch(f"/api/v1/expenses/{expense_id}", json={"period_id": str(uuid4())})
    assert immutable.status_code == 422
    assert immutable.json()["error"]["code"] == "IMMUTABLE_FIELD"


def test_expense_patch_rejects_null_required_fields_and_invalid_activity(tmp_path):
    client, _ = _client(tmp_path)
    period = _period(client)
    expense = client.post("/api/v1/expenses", json=_expense_payload(period["id"])).json()["data"]
    assert client.patch(f"/api/v1/expenses/{expense['id']}", json={"amount": None}).status_code == 422
    assert client.patch(f"/api/v1/expenses/{expense['id']}", json={"concept": None}).status_code == 422
    missing_activity = client.patch(
        f"/api/v1/expenses/{expense['id']}", json={"activity_id": str(uuid4())}
    )
    assert missing_activity.status_code == 404
    assert missing_activity.json()["error"]["code"] == "ACTIVITY_NOT_FOUND"


def test_expense_delete_removes_history_and_returns_204(tmp_path):
    client, repository = _client(tmp_path)
    period = _period(client)
    expense = client.post("/api/v1/expenses", json=_expense_payload(period["id"])).json()["data"]
    response = client.delete(f"/api/v1/expenses/{expense['id']}")
    assert response.status_code == 204
    assert response.content == b""
    assert client.get(f"/api/v1/expenses/{expense['id']}").status_code == 404
    document = repository.load()
    assert not document.expenses
    assert not document.expense_history


def test_expense_history_returns_empty_for_existing_without_history_and_404_for_missing(tmp_path):
    client, repository = _client(tmp_path)
    period = _period(client)
    expense = client.post("/api/v1/expenses", json=_expense_payload(period["id"])).json()["data"]
    document = repository.load()
    from app.persistence.document import DataDocument
    repository.save(DataDocument.model_validate({
        **document.model_dump(mode="python"), "expense_history": [],
    }))
    assert client.get(f"/api/v1/expenses/{expense['id']}/history").json() == {"data": []}
    missing = client.get(f"/api/v1/expenses/{uuid4()}/history")
    assert missing.status_code == 404
    assert missing.json()["error"]["code"] == "EXPENSE_NOT_FOUND"


def test_expense_put_and_patch_reject_unknown_fields(tmp_path):
    client, _ = _client(tmp_path)
    period = _period(client)
    expense = client.post("/api/v1/expenses", json=_expense_payload(period["id"])).json()["data"]
    assert client.patch(f"/api/v1/expenses/{expense['id']}", json={"surprise": True}).status_code == 422
    assert client.put(f"/api/v1/expenses/{expense['id']}", json={
        "concept": "x", "description": None, "amount": "1.00", "date": "2026-12-10",
        "category": "Viajes", "activity_id": None, "observations": None, "unknown": 1,
    }).status_code == 422
