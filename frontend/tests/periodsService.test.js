import { beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "../src/services/api/httpClient.js";
import { createPeriod, getPeriods, updatePeriod } from "../src/services/api/periodsService.js";

vi.mock("../src/services/api/httpClient.js", () => ({ request: vi.fn() }));

describe("periodsService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("gets the period collection", async () => {
    request.mockResolvedValue({ data: [] });
    await expect(getPeriods()).resolves.toEqual([]);
    expect(request).toHaveBeenCalledWith("/periods");
  });

  it("creates a period using the API contract", async () => {
    const period = { id: "period-1", name: "Vacaciones", year: 2026 };
    request.mockResolvedValue({ data: period });
    const payload = { name: "Vacaciones", start_date: "2026-12-20", end_date: "2027-01-10" };

    await expect(createPeriod(payload)).resolves.toEqual(period);
    expect(request).toHaveBeenCalledWith("/periods", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  });

  it("replaces a period using only editable contract fields", async () => {
    const period = { id: "period-1", name: "Vacaciones actualizadas", year: 2026 };
    request.mockResolvedValue({ data: period });
    const payload = { name: "Vacaciones actualizadas", start_date: "2026-12-21", end_date: "2027-01-11" };

    await expect(updatePeriod("period-1", payload)).resolves.toEqual(period);
    expect(request).toHaveBeenCalledWith("/periods/period-1", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  });

  it("rejects a malformed create response", async () => {
    request.mockResolvedValue({ data: {} });
    await expect(createPeriod({ name: "X", start_date: "2026-12-20", end_date: "2026-12-30" }))
      .rejects.toThrow("La API no devolvió el período creado.");
  });
});
