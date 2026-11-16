import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  exportReport,
  getActivitiesReport,
  getBudgetComparison,
  getBudgetReport,
  getGeneralReport,
  reportServiceInternals,
} from "../src/services/api/reportsService.js";
import { request } from "../src/services/api/httpClient.js";

vi.mock("../src/services/api/httpClient.js", () => ({
  ApiError: class ApiError extends Error {
    constructor({ status = 0, code = "API_ERROR", message }) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.code = code;
    }
  },
  request: vi.fn(),
}));

describe("reportsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("requests the general report with only supported filters and preserves decimal strings", async () => {
    request.mockResolvedValue({ data: {} });
    await getGeneralReport("period/1", {
      filters: {
        category: "Viajes",
        status: "Completada",
        min_amount: "100000.10",
        max_amount: "",
        ignored_filter: "ignored",
      },
      page: 2,
      page_size: 20,
    });

    expect(request).toHaveBeenCalledWith(
      "/periods/period%2F1/reports/general?category=Viajes&status=Completada&min_amount=100000.10&page=2&page_size=20",
      { signal: undefined },
    );
  });

  it("does not send filters that are not applicable to the activities report", async () => {
    request.mockResolvedValue({ data: {} });
    await getActivitiesReport("period-1", {
      filters: { category: "Viajes", min_amount: "50.00", activity_id: "activity-1" },
    });
    expect(request).toHaveBeenCalledWith(
      "/periods/period-1/reports/activities?category=Viajes&activity_id=activity-1",
      { signal: undefined },
    );
  });

  it("does not send status or priority to the budget report", async () => {
    request.mockResolvedValue({ data: {} });
    await getBudgetReport("period-1", {
      filters: { status: "Pendiente", priority: "Alta", max_amount: "900.25" },
    });
    expect(request).toHaveBeenCalledWith(
      "/periods/period-1/reports/budget?max_amount=900.25",
      { signal: undefined },
    );
  });

  it("sends page and page_size together, never separately", async () => {
    request.mockResolvedValue({ data: {} });
    await getGeneralReport("period-1", { page: 3 });
    expect(request).toHaveBeenCalledWith("/periods/period-1/reports/general", { signal: undefined });
  });

  it("uses the two contractual comparison query parameters", async () => {
    request.mockResolvedValue({ data: {} });
    await getBudgetComparison("period-a", "period-b");
    expect(request).toHaveBeenCalledWith(
      "/reports/budget-comparison?period_id_1=period-a&period_id_2=period-b",
      { signal: undefined },
    );
  });

  it("rejects comparison of the same period before calling the API", async () => {
    await expect(getBudgetComparison("period-a", "period-a")).rejects.toThrow(
      "La comparación requiere dos períodos diferentes.",
    );
    expect(request).not.toHaveBeenCalled();
  });

  it("exports filtered data with applicable filters and without pagination", async () => {
    const blob = new Blob(["pdf"]);
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({
        "content-type": "application/pdf",
        "content-disposition": 'attachment; filename="informe-general-2026.pdf"',
      }),
      blob: vi.fn().mockResolvedValue(blob),
    });

    const result = await exportReport("general", "period-1", {
      format: "pdf",
      scope: "filtered",
      filters: { category: "Viajes", status: "Completada", page: 5, page_size: 20 },
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/periods/period-1/reports/general?format=pdf&scope=filtered&category=Viajes&status=Completada"),
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetch.mock.calls[0][0]).not.toContain("page=");
    expect(result).toEqual({
      blob,
      filename: "informe-general-2026.pdf",
      contentType: "application/pdf",
    });
  });

  it("exports the full period without forwarding active filters", async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-disposition": "attachment; filename=periodo-2026.xlsx" }),
      blob: vi.fn().mockResolvedValue(new Blob(["xlsx"])),
    });

    await exportReport("budget", "period-1", {
      format: "xlsx",
      scope: "period",
      filters: { category: "Viajes", min_amount: "100.00" },
    });

    expect(fetch.mock.calls[0][0]).toContain("?format=xlsx&scope=period");
    expect(fetch.mock.calls[0][0]).not.toContain("category=");
    expect(fetch.mock.calls[0][0]).not.toContain("min_amount=");
  });

  it("reads UTF-8 filename values from Content-Disposition", () => {
    expect(reportServiceInternals.getDownloadFilename(
      "attachment; filename*=UTF-8''informe%20general%202026.pdf",
    )).toBe("informe general 2026.pdf");
  });

  it("preserves AbortError when an export request is cancelled", async () => {
    fetch.mockRejectedValue(Object.assign(new Error("aborted"), { name: "AbortError" }));
    await expect(exportReport("general", "period-1", {
      format: "pdf",
      scope: "period",
      signal: new AbortController().signal,
    })).rejects.toMatchObject({ name: "AbortError" });
  });

  it("fails clearly when the server omits Content-Disposition filename", async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/pdf" }),
      blob: vi.fn(),
    });

    await expect(exportReport("general", "period-1", {
      format: "pdf",
      scope: "period",
    })).rejects.toMatchObject({ code: "MISSING_FILENAME" });
  });
});
