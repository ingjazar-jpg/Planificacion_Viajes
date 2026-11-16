// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ReportsPage from "../src/features/reports/ReportsPage.jsx";

const mocks = vi.hoisted(() => ({
  getGeneralReport: vi.fn(),
  getActivitiesReport: vi.fn(),
  getBudgetReport: vi.fn(),
  getBudgetComparison: vi.fn(),
  exportReport: vi.fn(),
  refreshPeriods: vi.fn(),
  getActivities: vi.fn(),
}));

vi.mock("../src/context/PeriodContext.jsx", () => ({
  usePeriod: () => ({ selectedPeriodId: "period-1", refreshPeriods: mocks.refreshPeriods }),
}));

vi.mock("../src/services/api/reportsService.js", () => mocks);
vi.mock("../src/services/api/activitiesService.js", () => ({ getActivities: mocks.getActivities }));

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

const availablePeriods = [
  { id: "period-2026", year: 2026, name: "Vacaciones 2026", start_date: "2026-12-20", end_date: "2027-01-10" },
  { id: "period-2025", year: 2025, name: "Vacaciones 2025", start_date: "2025-12-20", end_date: "2026-01-10" },
  { id: "period-2024", year: 2024, name: "Vacaciones 2024", start_date: "2024-12-20", end_date: "2025-01-10" },
];

const comparisonResponse = {
  data: {
    period_1: { id: "period-2026", year: 2026, name: "Vacaciones 2026", total_budget: "1000000.00", total_expenses: "250000.00", balance: "750000.00", execution_percentage: "25.00" },
    period_2: { id: "period-2025", year: 2025, name: "Vacaciones 2025", total_budget: "800000.00", total_expenses: "400000.00", balance: "400000.00", execution_percentage: "50.00" },
  },
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
    mocks.getBudgetComparison.mockResolvedValue(comparisonResponse);
    mocks.exportReport.mockResolvedValue({ blob: new Blob(["pdf"]), filename: "informe-general-2026.pdf", contentType: "application/pdf" });
    mocks.refreshPeriods.mockResolvedValue(availablePeriods);
    mocks.getActivities.mockResolvedValue([{ id: "activity-1", name: "Viaje familiar", start_date: "2026-12-20", end_date: "2026-12-22" }]);
    mocks.getBudgetReport.mockResolvedValue({ data: { period: generalResponse.data.period, budget: { total_budget: "0.00", categories: [] }, expenses: { total: "0.00", balance: "0.00", execution_percentage: "0.00", by_activity: [], by_category: [], items: [] } } });
  });

  it("offers only period export when no filters have been applied", async () => {
    render(<ReportsPage />);
    await screen.findByText("Vacaciones 2026");
    fireEvent.click(screen.getByRole("button", { name: "Exportar informe" }));
    expect(screen.getByLabelText("Alcance de exportación")).toHaveValue("period");
    expect(screen.getByLabelText("Alcance de exportación").querySelectorAll("option")).toHaveLength(1);
  });

  it("exports applied filters only and ignores pending filter edits", async () => {
    const createUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:download");
    const revokeUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    render(<ReportsPage />);
    await screen.findByText("Vacaciones 2026");
    fireEvent.click(screen.getByRole("button", { name: "Mostrar filtros" }));
    fireEvent.change(screen.getByLabelText("Categoría"), { target: { value: "Viajes" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));
    await waitFor(() => expect(mocks.getGeneralReport).toHaveBeenLastCalledWith("period-1", {
      filters: { category: "Viajes" }, page: 1, page_size: 20,
    }));
    fireEvent.change(screen.getByLabelText("Categoría"), { target: { value: "Turismo" } });
    fireEvent.click(screen.getByRole("button", { name: "Exportar informe" }));
    expect(screen.getByLabelText("Alcance de exportación").querySelectorAll("option")).toHaveLength(2);
    fireEvent.change(screen.getByLabelText("Formato de exportación"), { target: { value: "xlsx" } });
    fireEvent.change(screen.getByLabelText("Alcance de exportación"), { target: { value: "filtered" } });
    fireEvent.click(screen.getByRole("button", { name: "Exportar", exact: true }));
    await waitFor(() => expect(mocks.exportReport).toHaveBeenCalledWith("general", "period-1", expect.objectContaining({
      format: "xlsx", scope: "filtered", filters: { category: "Viajes" }, signal: expect.any(AbortSignal),
    })));
    expect(await screen.findByRole("status")).toHaveTextContent("Archivo descargado correctamente.");
    expect(createUrl).toHaveBeenCalledTimes(1);
    expect(revokeUrl).toHaveBeenCalledWith("blob:download");
    createUrl.mockRestore();
    revokeUrl.mockRestore();
  });

  it("shows budget group details from the current page without changing backend aggregates", async () => {
    mocks.getBudgetReport.mockResolvedValue({
      data: {
        period: generalResponse.data.period,
        budget: { total_budget: "500.00", categories: [] },
        expenses: {
          total: "300.00", balance: "200.00", execution_percentage: "60.00",
          by_activity: [{ activity_id: null, activity_name: "Sin actividad asociada", total: "300.00", count: 2 }],
          by_category: [{ category: "Viajes", total: "300.00", count: 2 }],
          items: [
            { id: "expense-1", concept: "Taxi", date: "2026-12-20", category: "Viajes", amount: "100.00", activity_id: null },
          ],
        },
      },
    });
    render(<ReportsPage />);
    await screen.findByText("Vacaciones 2026");
    fireEvent.click(screen.getByRole("tab", { name: "Presupuesto y gastos" }));
    const activityGroup = await screen.findByRole("button", { name: /Sin actividad asociada/ });
    expect(activityGroup).toHaveAttribute("aria-expanded", "false");
    expect(activityGroup).toHaveTextContent("2 gastos");
    expect(activityGroup).toHaveTextContent("COP 300.00");
    fireEvent.click(activityGroup);
    expect(await screen.findByText("Mostrando los gastos de este grupo incluidos en la página actual.")).toBeInTheDocument();
    expect(screen.getAllByText("Taxi").length).toBeGreaterThan(0);
    expect(mocks.getBudgetReport).toHaveBeenCalledTimes(1);
  });

  it("loads and renders the general report for the active period", async () => {
    render(<ReportsPage />);
    expect(await screen.findByText("Vacaciones 2026")).toBeInTheDocument();
    expect(screen.getByText("COP 1000000.00")).toBeInTheDocument();
    expect(mocks.getGeneralReport).toHaveBeenCalledWith("period-1", { filters: {}, page: 1, page_size: 20 });
  });

  it("loads the activities tab on demand and distinguishes cancelled activities", async () => {
    const { container } = render(<ReportsPage />);
    await screen.findByText("Vacaciones 2026");
    fireEvent.click(screen.getByRole("tab", { name: "Actividades" }));
    expect(await screen.findAllByText("Viaje familiar")).toHaveLength(2);
    expect(container.querySelectorAll(".reports-status")).toHaveLength(2);
    expect(mocks.getActivitiesReport).toHaveBeenCalledWith("period-1", { filters: {}, page: 1, page_size: 20 });
  });

  it("keeps a loaded report when navigating back to its tab", async () => {
    render(<ReportsPage />);
    await screen.findByText("Vacaciones 2026");
    fireEvent.click(screen.getByRole("tab", { name: "Actividades" }));
    expect(await screen.findAllByText("Viaje familiar")).toHaveLength(2);
    fireEvent.click(screen.getByRole("tab", { name: "General" }));
    expect(await screen.findByText("Resumen presupuestario")).toBeInTheDocument();
    expect(mocks.getGeneralReport).toHaveBeenCalledTimes(1);
  });

  it("loads the two most recent periods and compares the contractual indicators", async () => {
    render(<ReportsPage />);
    await screen.findByText("Vacaciones 2026");
    fireEvent.click(screen.getByRole("tab", { name: "Comparación histórica" }));

    await waitFor(() => expect(screen.getAllByText("Presupuesto general")).toHaveLength(2));
    expect(mocks.refreshPeriods).toHaveBeenCalledTimes(1);
    expect(mocks.getBudgetComparison).toHaveBeenCalledWith(
      "period-2026",
      "period-2025",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(screen.getAllByText("COP 1000000.00")).toHaveLength(2);
    expect(screen.getAllByText("COP 800000.00")).toHaveLength(2);
  });

  it("preserves available selections and refreshes periods when reopening comparison", async () => {
    render(<ReportsPage />);
    await screen.findByText("Vacaciones 2026");
    fireEvent.click(screen.getByRole("tab", { name: "Comparación histórica" }));
    await waitFor(() => expect(screen.getAllByText("Presupuesto general")).toHaveLength(2));

    fireEvent.change(screen.getByLabelText("Segundo período"), { target: { value: "period-2024" } });
    await waitFor(() => expect(mocks.getBudgetComparison).toHaveBeenLastCalledWith(
      "period-2026",
      "period-2024",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    ));

    fireEvent.click(screen.getByRole("tab", { name: "General" }));
    fireEvent.click(screen.getByRole("tab", { name: "Comparación histórica" }));

    await waitFor(() => expect(mocks.refreshPeriods).toHaveBeenCalledTimes(2));
    expect(screen.getByLabelText("Primer período")).toHaveValue("period-2026");
    expect(screen.getByLabelText("Segundo período")).toHaveValue("period-2024");
    await waitFor(() => expect(mocks.getBudgetComparison).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(mocks.getBudgetComparison).toHaveBeenLastCalledWith(
      "period-2026",
      "period-2024",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    ));
  });

  it("does not request a comparison when fewer than two periods exist", async () => {
    mocks.refreshPeriods.mockResolvedValueOnce([availablePeriods[0]]);
    render(<ReportsPage />);
    await screen.findByText("Vacaciones 2026");
    fireEvent.click(screen.getByRole("tab", { name: "Comparación histórica" }));

    expect(await screen.findByText("Se necesitan al menos dos períodos disponibles para realizar una comparación.")).toBeInTheDocument();
    expect(mocks.getBudgetComparison).not.toHaveBeenCalled();
  });


  it("applies report filters only after confirmation and sends only applicable values", async () => {
    render(<ReportsPage />);
    await screen.findByText("Vacaciones 2026");
    fireEvent.click(screen.getByRole("button", { name: "Mostrar filtros" }));
    await waitFor(() => expect(mocks.getActivities).toHaveBeenCalledWith({ period_id: "period-1" }));
    fireEvent.change(screen.getByLabelText("Categoría"), { target: { value: "Viajes" } });
    fireEvent.change(screen.getByLabelText("Estado"), { target: { value: "Completada" } });
    expect(mocks.getGeneralReport).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));
    await waitFor(() => expect(mocks.getGeneralReport).toHaveBeenLastCalledWith("period-1", {
      filters: { category: "Viajes", status: "Completada" }, page: 1, page_size: 20,
    }));
  });

  it("blocks invalid date ranges before sending a report request", async () => {
    render(<ReportsPage />);
    await screen.findByText("Vacaciones 2026");
    fireEvent.click(screen.getByRole("button", { name: "Mostrar filtros" }));
    fireEvent.change(screen.getByLabelText("Fecha inicial"), { target: { value: "2026-12-30" } });
    expect(screen.getByRole("alert")).toHaveTextContent("Debes indicar las dos fechas del rango.");
    expect(screen.getByRole("button", { name: "Aplicar filtros" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Fecha final"), { target: { value: "2026-12-20" } });
    expect(screen.getByRole("alert")).toHaveTextContent("La fecha inicial no puede ser posterior");
    expect(mocks.getGeneralReport).toHaveBeenCalledTimes(1);
  });

  it("keeps applied filters when changing the page", async () => {
    mocks.getGeneralReport.mockResolvedValue({
      ...generalResponse,
      meta: { total: 25, page: 1, page_size: 20, total_pages: 2 },
    });
    render(<ReportsPage />);
    await screen.findByText("Vacaciones 2026");
    fireEvent.click(screen.getByRole("button", { name: "Mostrar filtros" }));
    fireEvent.change(screen.getByLabelText("Categoría"), { target: { value: "Viajes" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));
    await screen.findByText("Página 1 de 2");
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    await waitFor(() => expect(mocks.getGeneralReport).toHaveBeenLastCalledWith("period-1", {
      filters: { category: "Viajes" }, page: 2, page_size: 20,
    }));
  });

});