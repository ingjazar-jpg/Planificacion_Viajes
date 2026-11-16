import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DataRecoveryProvider, useDataRecovery } from "../src/context/DataRecoveryContext.jsx";
import { usePeriod } from "../src/context/PeriodContext.jsx";
import { getDashboard } from "../src/services/api/dashboardService.js";
import { getPendingActiveAlerts } from "../src/services/api/alertsService.js";
import { getActivities } from "../src/services/api/activitiesService.js";
import { getCalendar } from "../src/services/api/calendarService.js";
import { getBudget } from "../src/services/api/budgetService.js";
import { getExpenses } from "../src/services/api/expensesService.js";
import {
  getActivitiesReport, getBudgetReport, getGeneralReport,
} from "../src/services/api/reportsService.js";

vi.mock("../src/context/PeriodContext.jsx", () => ({ usePeriod: vi.fn() }));
vi.mock("../src/services/api/dashboardService.js", () => ({ getDashboard: vi.fn() }));
vi.mock("../src/services/api/alertsService.js", () => ({ getPendingActiveAlerts: vi.fn() }));
vi.mock("../src/services/api/activitiesService.js", () => ({ getActivities: vi.fn() }));
vi.mock("../src/services/api/calendarService.js", () => ({ getCalendar: vi.fn() }));
vi.mock("../src/services/api/budgetService.js", () => ({ getBudget: vi.fn() }));
vi.mock("../src/services/api/expensesService.js", () => ({ getExpenses: vi.fn() }));
vi.mock("../src/services/api/reportsService.js", () => ({
  getActivitiesReport: vi.fn(), getBudgetReport: vi.fn(), getGeneralReport: vi.fn(),
}));

const periodA = {
  id: "period-a", year: 2025, created_at: "2026-01-01T10:00:00-05:00",
  start_date: "2025-12-20", end_date: "2026-01-10",
};
const periodB = {
  id: "period-b", year: 2026, created_at: "2026-02-01T10:00:00-05:00",
  start_date: "2026-12-20", end_date: "2027-01-10",
};

function Probe() {
  const {
    isRefreshing, refreshError, restoreSucceeded, revision,
    completeRestoration, retryRefresh,
  } = useDataRecovery();
  return (
    <div>
      <span data-testid="refreshing">{String(isRefreshing)}</span>
      <span data-testid="error">{refreshError?.message || "none"}</span>
      <span data-testid="success">{String(restoreSucceeded)}</span>
      <span data-testid="revision">{revision}</span>
      <button type="button" onClick={completeRestoration}>Complete restore</button>
      <button type="button" onClick={retryRefresh}>Retry refresh</button>
    </div>
  );
}

describe("DataRecoveryProvider", () => {
  const refreshPeriods = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    refreshPeriods.mockResolvedValue([periodA, periodB]);
    usePeriod.mockReturnValue({
      selectedPeriodId: periodA.id,
      refreshPeriods,
    });
    for (const service of [
      getDashboard, getPendingActiveAlerts, getActivities, getCalendar,
      getExpenses, getGeneralReport, getActivitiesReport, getBudgetReport, getBudget,
    ]) service.mockResolvedValue([]);
  });

  it("refreshes all functional module GET services after successful restoration", async () => {
    render(<DataRecoveryProvider><Probe /></DataRecoveryProvider>);

    await act(async () => screen.getByRole("button", { name: "Complete restore" }).click());

    await waitFor(() => expect(screen.getByTestId("revision")).toHaveTextContent("1"));
    expect(screen.getByTestId("success")).toHaveTextContent("true");
    expect(refreshPeriods).toHaveBeenCalledOnce();
    expect(getDashboard).toHaveBeenCalledWith(periodA.id);
    expect(getPendingActiveAlerts).toHaveBeenCalledWith(periodA.id);
    expect(getActivities).toHaveBeenCalledWith({ period_id: periodA.id });
    expect(getCalendar).toHaveBeenCalledWith({
      period_id: periodA.id, start_date: periodA.start_date, end_date: periodA.end_date,
    });
    expect(getExpenses).toHaveBeenCalledWith({ period_id: periodA.id });
    expect(getGeneralReport).toHaveBeenCalledWith(periodA.id);
    expect(getActivitiesReport).toHaveBeenCalledWith(periodA.id);
    expect(getBudgetReport).toHaveBeenCalledWith(periodA.id);
    expect(getBudget).toHaveBeenCalledWith(periodA.id);
  });

  it("uses the latest period when the previously selected period no longer exists", async () => {
    refreshPeriods.mockResolvedValue([periodA, periodB]);
    usePeriod.mockReturnValue({ selectedPeriodId: "period-removed", refreshPeriods });
    render(<DataRecoveryProvider><Probe /></DataRecoveryProvider>);

    await act(async () => screen.getByRole("button", { name: "Complete restore" }).click());

    await waitFor(() => expect(getDashboard).toHaveBeenCalledWith(periodB.id));
    expect(getCalendar).toHaveBeenCalledWith({
      period_id: periodB.id, start_date: periodB.start_date, end_date: periodB.end_date,
    });
  });

  it("does not query modules when the restored catalog has no periods", async () => {
    refreshPeriods.mockResolvedValue([]);
    render(<DataRecoveryProvider><Probe /></DataRecoveryProvider>);

    await act(async () => screen.getByRole("button", { name: "Complete restore" }).click());

    await waitFor(() => expect(screen.getByTestId("revision")).toHaveTextContent("1"));
    expect(getDashboard).not.toHaveBeenCalled();
    expect(getActivities).not.toHaveBeenCalled();
  });

  it("preserves restore success and retries only period and module GET requests after a refresh failure", async () => {
    getDashboard.mockRejectedValueOnce(new Error("Dashboard no disponible")).mockResolvedValue([]);
    render(<DataRecoveryProvider><Probe /></DataRecoveryProvider>);

    await act(async () => screen.getByRole("button", { name: "Complete restore" }).click());
    await waitFor(() => expect(screen.getByTestId("error")).toHaveTextContent("Dashboard no disponible"));
    expect(screen.getByTestId("success")).toHaveTextContent("true");

    await act(async () => screen.getByRole("button", { name: "Retry refresh" }).click());
    await waitFor(() => expect(screen.getByTestId("revision")).toHaveTextContent("1"));
    expect(refreshPeriods).toHaveBeenCalledTimes(2);
    expect(getDashboard).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("success")).toHaveTextContent("true");
    expect(screen.getByTestId("error")).toHaveTextContent("none");
  });

  it("accepts a period without a budget as a valid restored state", async () => {
    getBudget.mockRejectedValue(Object.assign(new Error("No existe presupuesto"), {
      status: 404, code: "BUDGET_NOT_FOUND",
    }));
    render(<DataRecoveryProvider><Probe /></DataRecoveryProvider>);

    await act(async () => screen.getByRole("button", { name: "Complete restore" }).click());

    await waitFor(() => expect(screen.getByTestId("revision")).toHaveTextContent("1"));
    expect(screen.getByTestId("error")).toHaveTextContent("none");
  });
});
