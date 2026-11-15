import { beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "../src/services/api/httpClient.js";
import {
  evaluateAlerts, getPendingActiveAlerts, reviewAlert,
} from "../src/services/api/alertsService.js";
import { getDashboard } from "../src/services/api/dashboardService.js";

vi.mock("../src/services/api/httpClient.js", () => ({ request: vi.fn() }));

describe("FE-002 API services", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requests dashboard for the selected period", async () => {
    request.mockResolvedValue({ data: { period: { id: "p1" } } });
    await expect(getDashboard("p1")).resolves.toEqual({ period: { id: "p1" } });
    expect(request).toHaveBeenCalledWith("/periods/p1/dashboard");
  });

  it("evaluates alerts with the selected period in the request body", async () => {
    request.mockResolvedValue({ data: {} });
    await evaluateAlerts("p1");
    expect(request).toHaveBeenCalledWith("/alerts/evaluate", {
      method: "POST", body: { period_id: "p1" },
    });
  });

  it("requests the full pending active alert set without pagination", async () => {
    request.mockResolvedValue({ data: [] });
    await getPendingActiveAlerts("p1");
    const [path] = request.mock.calls[0];
    const query = new URLSearchParams(path.split("?")[1]);
    expect(path.startsWith("/alerts?")).toBe(true);
    expect(query.get("period_id")).toBe("p1");
    expect(query.get("status")).toBe("Pendiente");
    expect(query.get("condition_active")).toBe("true");
    expect(query.has("page")).toBe(false);
    expect(query.has("page_size")).toBe(false);
  });

  it("marks an alert as reviewed with PATCH and no body", async () => {
    request.mockResolvedValue({ data: { id: "a1", status: "Revisada" } });
    await reviewAlert("a1");
    expect(request).toHaveBeenCalledWith("/alerts/a1/review", { method: "PATCH" });
  });
});
