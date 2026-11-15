import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../src/App.jsx";
import { getPeriods } from "../src/services/api/periodsService.js";

vi.mock("../src/services/api/periodsService.js", () => ({
  getPeriods: vi.fn(),
}));

describe("App FE-001 foundation", () => {
  beforeEach(() => vi.clearAllMocks());

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
