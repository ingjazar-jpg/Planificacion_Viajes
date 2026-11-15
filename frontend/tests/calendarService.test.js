import { beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "../src/services/api/httpClient.js";
import { getCalendar } from "../src/services/api/calendarService.js";

vi.mock("../src/services/api/httpClient.js", () => ({ request: vi.fn() }));

describe("calendarService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requests the inclusive visible range with the required period", async () => {
    request.mockResolvedValue({ data: [] });
    const result = await getCalendar({
      period_id: "period-1",
      start_date: "2026-11-01",
      end_date: "2026-12-12",
    });

    expect(result).toEqual([]);
    expect(request).toHaveBeenCalledWith(
      "/calendar?period_id=period-1&start_date=2026-11-01&end_date=2026-12-12",
    );
  });

  it("combines optional category, priority and status filters", async () => {
    request.mockResolvedValue({ data: [] });
    await getCalendar({
      period_id: "period-1",
      start_date: "2026-11-01",
      end_date: "2026-12-12",
      category: "Reuniones familiares",
      priority: "Alta",
      status: "Cancelada",
    });

    expect(request).toHaveBeenCalledWith(
      "/calendar?period_id=period-1&start_date=2026-11-01&end_date=2026-12-12&category=Reuniones+familiares&priority=Alta&status=Cancelada",
    );
  });

  it("rejects an invalid response shape", async () => {
    request.mockResolvedValue({ data: null });
    await expect(getCalendar({
      period_id: "period-1",
      start_date: "2026-11-01",
      end_date: "2026-12-12",
    })).rejects.toThrow("calendario con formato inválido");
  });
});
