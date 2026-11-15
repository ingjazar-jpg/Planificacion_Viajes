import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../src/App.jsx";
import { getPeriods } from "../src/services/api/periodsService.js";
import { getDashboard } from "../src/services/api/dashboardService.js";
import { evaluateAlerts, getPendingActiveAlerts } from "../src/services/api/alertsService.js";

vi.mock("../src/services/api/periodsService.js", () => ({ getPeriods: vi.fn() }));
vi.mock("../src/services/api/dashboardService.js", () => ({ getDashboard: vi.fn() }));
vi.mock("../src/services/api/alertsService.js", () => ({
  evaluateAlerts: vi.fn(), getPendingActiveAlerts: vi.fn(), reviewAlert: vi.fn(),
}));

describe("App FE-001 foundation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDashboard.mockResolvedValue({
      period: { name: "Vacaciones", year: 2026 },
      financial: { total_budget: "0.00", total_expenses: "0.00", balance: "0.00", execution_percentage: "0.00" },
      activities: { total: 0, by_status: [], completion_percentage: "0.00", overdue_count: 0 },
      alerts: { upcoming_pending: 0, overdue_pending: 0, high_priority_pending: 0 },
      charts: { activities_by_status: [], budget_vs_expenses_by_category: [], expenses_by_category: [], completion_percentage: "0.00" },
    });
    evaluateAlerts.mockResolvedValue({ data: {} });
    getPendingActiveAlerts.mockResolvedValue([]);
  });

  it("renders the shell, six navigation sections and active period", async () => {
    getPeriods.mockResolvedValue([
      { id: "period-1", name: "Vacaciones decembrinas", year: 2026 },
    ]);
    render(<App />);

    expect(screen.getByRole("navigation", { name: "Navegación principal" })).toBeInTheDocument();
    for (const label of [
      "Dashboard", "Calendario", "Actividades",
      "Presupuesto y gastos", "Informes", "Gestión de datos",
    ]) {
      expect(screen.getAllByRole("button", { name: label }).length).toBeGreaterThan(0);
    }
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Período activo" }))
      .toHaveValue("period-1"));
    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
  });

  it("navigates between sections and marks the active section", async () => {
    getPeriods.mockResolvedValue([{ id: "period-1", name: "Vacaciones", year: 2026 }]);
    render(<App />);
    await screen.findByRole("combobox", { name: "Período activo" });

    fireEvent.click(screen.getByRole("button", { name: "Calendario" }));
    expect(screen.getByRole("heading", { name: "Calendario" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Calendario" })).toHaveAttribute("aria-current", "page");
  });

  it("opens and closes the mobile navigation", async () => {
    getPeriods.mockResolvedValue([{ id: "period-1", name: "Vacaciones", year: 2026 }]);
    render(<App />);
    await screen.findByRole("combobox", { name: "Período activo" });

    fireEvent.click(screen.getByRole("button", { name: "Abrir menú de navegación" }));
    expect(screen.getByRole("dialog", { name: "Menú de navegación" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar menú", exact: true }));
    expect(screen.queryByRole("dialog", { name: "Menú de navegación" })).not.toBeInTheDocument();
  });

  it("shows an empty state and offers contextual navigation to Activities", async () => {
    getPeriods.mockResolvedValue([]);
    render(<App />);

    expect(await screen.findByText("Aún no hay períodos registrados")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ir a Actividades" }));
    expect(screen.getByRole("button", { name: "Actividades" })).toHaveAttribute("aria-current", "page");
  });

  it("shows a retry action after an API error", async () => {
    getPeriods.mockRejectedValueOnce(new Error("API no disponible"))
      .mockResolvedValueOnce([{ id: "period-1", name: "Vacaciones", year: 2026 }]);
    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent("API no disponible");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Período activo" }))
      .toHaveValue("period-1"));
  });
});
