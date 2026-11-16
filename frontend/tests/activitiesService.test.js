import { beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "../src/services/api/httpClient.js";
import {
  createActivity, deleteActivity, getActivities, getActivity, updateActivity, updateActivityStatus,
} from "../src/services/api/activitiesService.js";

vi.mock("../src/services/api/httpClient.js", () => ({ request: vi.fn() }));

const activity = {
  id: "activity-1", period_id: "period-1", name: "Viaje familiar",
  category: "Viajes", start_date: "2026-12-20", end_date: "2026-12-22",
  start_time: "08:00", end_time: "18:00", priority: "Alta", status: "Pendiente",
};

describe("activitiesService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requests all activities for the selected period without pagination", async () => {
    request.mockResolvedValue({ data: [activity] });
    const result = await getActivities({ period_id: "period-1" });
    expect(result).toEqual([activity]);
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

  it("rejects an invalid list response shape", async () => {
    request.mockResolvedValue({ data: null });
    await expect(getActivities({ period_id: "period-1" }))
      .rejects.toThrow("listado de actividades con formato inválido");
  });

  it("gets one activity by its encoded identifier", async () => {
    request.mockResolvedValue({ data: activity });
    await expect(getActivity("activity/1")).resolves.toEqual(activity);
    expect(request).toHaveBeenCalledWith("/activities/activity%2F1");
  });

  it("creates an activity using the exact POST payload and returns the resource", async () => {
    const payload = {
      period_id: "period-1", name: "Viaje familiar", category: "Viajes",
      destination: "Santa Marta", description: "Viaje de vacaciones",
      start_date: "2026-12-20", end_date: "2026-12-22",
      start_time: "08:00", end_time: "18:00", priority: "Alta",
    };
    request.mockResolvedValue({ data: activity });
    await expect(createActivity(payload)).resolves.toEqual(activity);
    expect(request).toHaveBeenCalledWith("/activities", {
      method: "POST", body: JSON.stringify(payload),
    });
  });

  it("updates only supplied activity fields using PATCH", async () => {
    const payload = {
      name: "Viaje actualizado", description: "", category: "Viajes",
      destination: "Santa Marta", start_date: "2026-12-20", end_date: "2026-12-22",
      start_time: "08:00", end_time: "18:00", priority: "Media",
    };
    request.mockResolvedValue({ data: activity });
    await expect(updateActivity("activity-1", payload)).resolves.toEqual(activity);
    expect(request).toHaveBeenCalledWith("/activities/activity-1", {
      method: "PATCH", body: JSON.stringify(payload),
    });
    expect(payload).not.toHaveProperty("period_id");
    expect(payload).not.toHaveProperty("status");
  });

  it("rejects a mutation response without a resource identifier", async () => {
    request.mockResolvedValue({ data: { name: "Incomplete" } });
    await expect(createActivity({})).rejects.toThrow("respuesta inválida");
  });
});

describe("activity lifecycle service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends a PATCH containing only the requested status", async () => {
    const updated = { ...activity, status: "En progreso" };
    request.mockResolvedValue({ data: updated });
    await expect(updateActivityStatus("activity-1", "En progreso")).resolves.toEqual(updated);
    expect(request).toHaveBeenCalledWith("/activities/activity-1", {
      method: "PATCH", body: JSON.stringify({ status: "En progreso" }),
    });
  });

  it("deletes an activity and accepts the empty 204 response", async () => {
    request.mockResolvedValue(null);
    await expect(deleteActivity("activity-1")).resolves.toBeNull();
    expect(request).toHaveBeenCalledWith("/activities/activity-1", { method: "DELETE" });
  });
});
