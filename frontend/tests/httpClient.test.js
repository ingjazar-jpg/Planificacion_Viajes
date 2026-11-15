import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, request } from "../src/services/api/httpClient.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("HTTP client", () => {
  it("returns JSON payloads for successful responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ data: [{ id: "period-1" }] }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ));
    vi.stubGlobal("fetch", fetchMock);

    await expect(request("/periods")).resolves.toEqual({
      data: [{ id: "period-1" }],
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toContain("/periods");
  });

  it("does not parse a 204 response as JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(request("/resource", { method: "DELETE" })).resolves.toBeNull();
  });

  it("preserves the API error contract", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({
        error: { code: "PERIOD_NOT_FOUND", message: "No existe el período.", details: [] },
      }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    )));

    await expect(request("/periods/missing")).rejects.toMatchObject({
      status: 404,
      code: "PERIOD_NOT_FOUND",
      message: "No existe el período.",
      details: [],
    });
  });

  it("normalizes network failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    const pendingRequest = request("/periods");
    await expect(pendingRequest).rejects.toBeInstanceOf(ApiError);
    await expect(pendingRequest).rejects.toMatchObject({ code: "NETWORK_ERROR" });
  });
});
