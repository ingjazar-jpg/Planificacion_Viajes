import { beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "../src/services/api/httpClient.js";
import {
  createExpense,
  deleteExpense,
  getExpense,
  getExpenseHistory,
  getExpenses,
  replaceExpense,
  updateExpense,
} from "../src/services/api/expensesService.js";

vi.mock("../src/services/api/httpClient.js", () => ({ request: vi.fn() }));

const expense = {
  id: "expense-1",
  period_id: "period-1",
  concept: "Reserva",
  amount: "850000.00",
  date: "2026-12-22",
  category: "Alojamiento",
  activity_id: null,
};

describe("expensesService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("gets all expenses for a period without server pagination", async () => {
    request.mockResolvedValue({ data: [expense] });

    await expect(getExpenses({ period_id: "period-1" })).resolves.toEqual([expense]);
    expect(request).toHaveBeenCalledWith("/expenses?period_id=period-1");
    expect(request.mock.calls[0][0]).not.toContain("page=");
    expect(request.mock.calls[0][0]).not.toContain("page_size=");
  });

  it("combines every approved filter without adding unsupported parameters", async () => {
    request.mockResolvedValue({ data: [] });

    await getExpenses({
      period_id: "period-1",
      start_date: "2026-12-01",
      end_date: "2026-12-31",
      category: "Reuniones familiares",
      activity_id: "activity-1",
      min_amount: "100.00",
      max_amount: "900000.00",
    });

    expect(request).toHaveBeenCalledWith(
      "/expenses?period_id=period-1&start_date=2026-12-01&end_date=2026-12-31&category=Reuniones+familiares&activity_id=activity-1&min_amount=100.00&max_amount=900000.00",
    );
  });

  it("rejects a missing period identifier", async () => {
    await expect(getExpenses({})).rejects.toThrow("period_id");
    expect(request).not.toHaveBeenCalled();
  });

  it("rejects a malformed collection response", async () => {
    request.mockResolvedValue({ data: {} });
    await expect(getExpenses({ period_id: "period-1" }))
      .rejects.toThrow("listado de gastos con formato inválido");
  });

  it("creates an expense using the supplied payload", async () => {
    const payload = {
      period_id: "period-1",
      concept: "Reserva",
      amount: "850000.00",
      date: "2026-12-22",
      category: "Alojamiento",
      activity_id: null,
    };
    request.mockResolvedValue({ data: expense });

    await expect(createExpense(payload)).resolves.toEqual(expense);
    expect(request).toHaveBeenCalledWith("/expenses", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  });

  it("gets an expense by encoded identifier", async () => {
    request.mockResolvedValue({ data: expense });

    await expect(getExpense("expense/1")).resolves.toEqual(expense);
    expect(request).toHaveBeenCalledWith("/expenses/expense%2F1");
  });

  it("replaces an expense with PUT", async () => {
    request.mockResolvedValue({ data: expense });
    const payload = { ...expense };
    delete payload.id;
    delete payload.period_id;

    await expect(replaceExpense("expense-1", payload)).resolves.toEqual(expense);
    expect(request).toHaveBeenCalledWith("/expenses/expense-1", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  });

  it("partially updates an expense with PATCH", async () => {
    const payload = { observations: null };
    request.mockResolvedValue({ data: expense });

    await expect(updateExpense("expense-1", payload)).resolves.toEqual(expense);
    expect(request).toHaveBeenCalledWith("/expenses/expense-1", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  });

  it("deletes an expense and accepts the empty response", async () => {
    request.mockResolvedValue(null);

    await expect(deleteExpense("expense-1")).resolves.toBeNull();
    expect(request).toHaveBeenCalledWith("/expenses/expense-1", {
      method: "DELETE",
    });
  });

  it("gets the expense history", async () => {
    const history = [{
      id: "history-1",
      expense_id: "expense-1",
      modification_type: "Creación",
      previous_values: {},
      new_values: { concept: "Reserva" },
      modified_at: "2026-11-14T10:00:00-05:00",
    }];
    request.mockResolvedValue({ data: history });

    await expect(getExpenseHistory("expense-1")).resolves.toEqual(history);
    expect(request).toHaveBeenCalledWith("/expenses/expense-1/history");
  });

  it("rejects a malformed mutation response", async () => {
    request.mockResolvedValue({ data: {} });
    await expect(createExpense({})).rejects.toThrow("respuesta inválida");
  });
});
