import { beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "../src/services/api/httpClient.js";
import { getActivities } from "../src/services/api/activitiesService.js";

vi.mock("../src/services/api/httpClient.js", () => ({ request: vi.fn() }));

describe("activitiesService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requests all activities for the selected period without pagination", async () => {
    request.mockResolvedValue({ data: [{ id: "activity-1" }] });
    const result = await getActivities({ period_id: "period-1" });
    expect(result).toEqual([{ id: "activity-1" }]);
    expect(request).toHaveBeenCalledWith("/activities?period_id=period-1");
  });

  it("combines all approved optional filters and trims destination", async () => {
    request.mockResolvedValue({ data: [] });
    await getActivities({
      period_id: "period-1", category: "Reuniones familiares", priority: "Alta",
      status: "Pendiente", destination: "  Santa Marta  ",
      start_date: "2026-12-01", end_date: "2026-12-31",
    });
    expect(request).toHaveBeenCalledWith(
      "/activities?period_id=period-1&category=Reuniones+familiares&priority=Alta&status=Pendiente&destination=Santa+Marta&start_date=2026-12-01&end_date=2026-12-31",
    );
  });

  it("rejects an invalid response shape", async () => {
    request.mockResolvedValue({ data: null });
    await expect(getActivities({ period_id: "period-1" }))
      .rejects.toThrow("listado de actividades con formato inválido");
  });
});
