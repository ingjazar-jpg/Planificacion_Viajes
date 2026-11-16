// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ReportsPage from "../src/features/reports/ReportsPage.jsx";

const mocks = vi.hoisted(() => ({
  getGeneralReport: vi.fn(),
  getActivitiesReport: vi.fn(),
  getBudgetReport: vi.fn(),
}));

vi.mock("../src/context/PeriodContext.jsx", () => ({
  usePeriod: () => ({ selectedPeriodId: "period-1" }),
}));

vi.mock("../src/services/api/reportsService.js", () => mocks);

const generalResponse = {
  data: {
    period: { id: "period-1", year: 2026, name: "Vacaciones 2026", start_date: "2026-12-20", end_date: "2027-01-10" },
    budget: { total_budget: "1000000.00", total_expenses: "250000.00", balance: "750000.00", execution_percentage: "25.00" },
    activities: { total: 1, by_status: [{ status: "Completada", count: 1 }], completion_percentage: "100.00" },
    expenses: { total: "250000.00", count: 1, items: [] },
    summary: "Una actividad completada.",
  },
  meta: { total: 1, page: 1, page_size: 20, total_pages: 1 },
};

const activitiesResponse = {
  data: {
    period: generalResponse.data.period,
    summary: generalResponse.data.activities,
    activities: [{
      id: "activity-1", period_id: "period-1", name: "Viaje familiar",
      category: "Viajes", destination: "Santa Marta", start_date: "2026-12-20",
      end_date: "2026-12-22", start_time: "08:00", end_time: "18:00",
      priority: "Alta", status: "Cancelada",
    }],
  },
  meta: { total: 1, page: 1, page_size: 20, total_pages: 1 },
};

describe("ReportsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getGeneralReport.mockResolvedValue(generalResponse);
    mocks.getActivitiesReport.mockResolvedValue(activitiesResponse);
    mocks.getBudgetReport.mockResolvedValue({ data: { period: generalResponse.data.period, budget: { total_budget: "0.00", categories: [] }, expenses: { total: "0.00", balance: "0.00", execution_percentage: "0.00", by_activity: [], by_category: [], items: [] } } });
  });

  it("loads and renders the general report for the active period", async () => {
    render(<ReportsPage />);
    expect(await screen.findByText("Vacaciones 2026")).toBeInTheDocument();
    expect(screen.getByText("COP 1000000.00")).toBeInTheDocument();
    expect(mocks.getGeneralReport).toHaveBeenCalledWith("period-1", { page: 1, page_size: 20 });
  });

  it("loads the activities tab on demand and distinguishes cancelled activities", async () => {
    render(<ReportsPage />);
    await screen.findByText("Vacaciones 2026");
    fireEvent.click(screen.getByRole("tab", { name: "Actividades" }));
    expect(await screen.findByText("Viaje familiar")).toBeInTheDocument();
    expect(screen.getByText("Cancelada")).toBeInTheDocument();
    expect(mocks.getActivitiesReport).toHaveBeenCalledWith("period-1", { page: 1, page_size: 20 });
  });

  it("keeps a loaded report when navigating back to its tab", async () => {
    render(<ReportsPage />);
    await screen.findByText("Vacaciones 2026");
    fireEvent.click(screen.getByRole("tab", { name: "Actividades" }));
    await screen.findByText("Viaje familiar");
    fireEvent.click(screen.getByRole("tab", { name: "General" }));
    expect(await screen.findByText("Resumen presupuestario")).toBeInTheDocument();
    expect(mocks.getGeneralReport).toHaveBeenCalledTimes(1);
  });
});
