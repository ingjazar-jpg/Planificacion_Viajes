import { beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "../src/services/api/httpClient.js";
import { createBudget, getBudget, updateBudget } from "../src/services/api/budgetService.js";

vi.mock("../src/services/api/httpClient.js", () => ({ request: vi.fn() }));

const budget = {
  id: "budget-1",
  period_id: "period-1",
  total_budget: "5000000.00",
  total_expenses: "850000.00",
  general_balance: "4150000.00",
  execution_percentage: "17.00",
  category_budgets: [],
};

describe("budgetService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("gets the budget for the selected period", async () => {
    request.mockResolvedValue({ data: budget });
    await expect(getBudget("period-1")).resolves.toEqual(budget);
    expect(request).toHaveBeenCalledWith("/periods/period-1/budget");
  });

  it("encodes the period identifier", async () => {
    request.mockResolvedValue({ data: budget });
    await getBudget("period/1");
    expect(request).toHaveBeenCalledWith("/periods/period%2F1/budget");
  });

  it("creates a budget using the complete API payload", async () => {
    const payload = {
      total_budget: "5000000.00",
      category_budgets: [{ category: "Viajes", amount: "2500000.00" }],
    };
    request.mockResolvedValue({ data: budget });

    await expect(createBudget("period-1", payload)).resolves.toEqual(budget);
    expect(request).toHaveBeenCalledWith("/periods/period-1/budget", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  });

  it("replaces a budget using PUT", async () => {
    const payload = {
      total_budget: "6000000.00",
      category_budgets: [],
    };
    request.mockResolvedValue({ data: budget });

    await expect(updateBudget("period-1", payload)).resolves.toEqual(budget);
    expect(request).toHaveBeenCalledWith("/periods/period-1/budget", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  });

  it("preserves BUDGET_NOT_FOUND from the HTTP client", async () => {
    const error = Object.assign(new Error("No existe presupuesto."), {
      status: 404,
      code: "BUDGET_NOT_FOUND",
    });
    request.mockRejectedValue(error);

    await expect(getBudget("period-1")).rejects.toMatchObject({
      status: 404,
      code: "BUDGET_NOT_FOUND",
    });
  });

  it("rejects a malformed budget response", async () => {
    request.mockResolvedValue({ data: [] });
    await expect(getBudget("period-1")).rejects.toThrow("presupuesto con formato inválido");
  });

  it("requires a period identifier", async () => {
    await expect(getBudget("")).rejects.toThrow("identificador del período");
    expect(request).not.toHaveBeenCalled();
  });
});
