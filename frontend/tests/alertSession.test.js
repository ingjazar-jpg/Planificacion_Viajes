import { describe, expect, it, vi } from "vitest";
import { ensurePeriodEvaluated, hasPeriodBeenEvaluated } from "../src/features/dashboard/alertSession.js";

describe("alert evaluation session", () => {
  it("evaluates a period once and reuses the successful result", async () => {
    const evaluate = vi.fn().mockResolvedValue({ ok: true });
    await ensurePeriodEvaluated("period-a", evaluate);
    await ensurePeriodEvaluated("period-a", evaluate);
    expect(evaluate).toHaveBeenCalledTimes(1);
    expect(hasPeriodBeenEvaluated("period-a")).toBe(true);
  });

  it("does not mark a failed evaluation as completed and permits retry", async () => {
    const evaluate = vi.fn()
      .mockRejectedValueOnce(new Error("temporary"))
      .mockResolvedValueOnce({ ok: true });
    await expect(ensurePeriodEvaluated("period-b", evaluate)).rejects.toThrow("temporary");
    expect(hasPeriodBeenEvaluated("period-b")).toBe(false);
    await ensurePeriodEvaluated("period-b", evaluate);
    expect(evaluate).toHaveBeenCalledTimes(2);
    expect(hasPeriodBeenEvaluated("period-b")).toBe(true);
  });

  it("coalesces concurrent evaluation requests for the same period", async () => {
    let resolve;
    const evaluate = vi.fn(() => new Promise((done) => { resolve = done; }));
    const first = ensurePeriodEvaluated("period-c", evaluate);
    const second = ensurePeriodEvaluated("period-c", evaluate);
    await Promise.resolve();
    resolve({ ok: true });
    await Promise.all([first, second]);
    expect(evaluate).toHaveBeenCalledTimes(1);
  });
});
