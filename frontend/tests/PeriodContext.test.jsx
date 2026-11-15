import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PeriodProvider, usePeriod } from "../src/context/PeriodContext.jsx";
import { getPeriods } from "../src/services/api/periodsService.js";

vi.mock("../src/services/api/periodsService.js", () => ({
  getPeriods: vi.fn(),
}));

const firstPeriod = {
  id: "period-2027",
  name: "Vacaciones 2027",
  year: 2027,
};
const secondPeriod = {
  id: "period-2026",
  name: "Vacaciones 2026",
  year: 2026,
};

function ContextProbe() {
  const { periods, selectedPeriod, selectPeriod, refreshPeriods, isLoading } = usePeriod();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="selected">{selectedPeriod?.id || "none"}</span>
      <span data-testid="count">{periods.length}</span>
      <button type="button" onClick={() => selectPeriod(secondPeriod.id)}>Select second</button>
      <button type="button" onClick={refreshPeriods}>Refresh</button>
    </div>
  );
}

describe("PeriodProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("selects the first period returned by the API", async () => {
    getPeriods.mockResolvedValue([firstPeriod, secondPeriod]);
    render(<PeriodProvider><ContextProbe /></PeriodProvider>);

    await waitFor(() => expect(screen.getByTestId("selected")).toHaveTextContent("period-2027"));
    expect(screen.getByTestId("count")).toHaveTextContent("2");
  });

  it("allows changing selection and preserves it on refresh when still present", async () => {
    getPeriods.mockResolvedValue([firstPeriod, secondPeriod]);
    render(<PeriodProvider><ContextProbe /></PeriodProvider>);

    await waitFor(() => expect(screen.getByTestId("selected")).toHaveTextContent("period-2027"));
    await act(async () => screen.getByRole("button", { name: "Select second" }).click());
    expect(screen.getByTestId("selected")).toHaveTextContent("period-2026");

    await act(async () => screen.getByRole("button", { name: "Refresh" }).click());
    expect(screen.getByTestId("selected")).toHaveTextContent("period-2026");
  });

  it("clears selection when the refreshed list is empty", async () => {
    getPeriods.mockResolvedValueOnce([firstPeriod]).mockResolvedValueOnce([]);
    render(<PeriodProvider><ContextProbe /></PeriodProvider>);

    await waitFor(() => expect(screen.getByTestId("selected")).toHaveTextContent("period-2027"));
    await act(async () => screen.getByRole("button", { name: "Refresh" }).click());
    await waitFor(() => expect(screen.getByTestId("selected")).toHaveTextContent("none"));
  });
});
