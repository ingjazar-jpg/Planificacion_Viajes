import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PeriodManagementDialog from "../src/features/activities/PeriodManagementDialog.jsx";
import { usePeriod } from "../src/context/PeriodContext.jsx";
import { createPeriod, updatePeriod } from "../src/services/api/periodsService.js";

vi.mock("../src/context/PeriodContext.jsx", () => ({ usePeriod: vi.fn() }));
vi.mock("../src/services/api/periodsService.js", () => ({
  createPeriod: vi.fn(),
  updatePeriod: vi.fn(),
}));

const periods = [{
  id: "period-2026",
  name: "Vacaciones 2026",
  year: 2026,
  start_date: "2026-12-20",
  end_date: "2027-01-10",
}];

describe("PeriodManagementDialog", () => {
  const refreshPeriods = vi.fn();
  const selectPeriod = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    usePeriod.mockReturnValue({
      periods,
      selectedPeriodId: periods[0].id,
      refreshPeriods,
      selectPeriod,
    });
    refreshPeriods.mockResolvedValue(periods);
    createPeriod.mockResolvedValue({ ...periods[0], id: "period-created" });
    updatePeriod.mockResolvedValue(periods[0]);
  });

  it("lists periods and does not expose a delete action", () => {
    render(<PeriodManagementDialog open onClose={onClose} />);

    expect(screen.getByRole("dialog", { name: "Administrar períodos" })).toBeInTheDocument();
    expect(screen.getByText("Vacaciones 2026")).toBeInTheDocument();
    expect(screen.getByText("Período activo")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /eliminar/i })).not.toBeInTheDocument();
  });

  it("creates a period with only the contractual fields and selects it", async () => {
    refreshPeriods.mockResolvedValueOnce([...periods, { ...periods[0], id: "period-created", name: "Navidad 2027" }]);
    render(<PeriodManagementDialog open onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Crear período" }));
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: " Navidad 2027 " } });
    fireEvent.change(screen.getByLabelText(/Fecha inicial/), { target: { value: "2027-12-18" } });
    fireEvent.change(screen.getByLabelText(/Fecha final/), { target: { value: "2028-01-08" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar período" }));

    await waitFor(() => expect(createPeriod).toHaveBeenCalledWith({
      name: "Navidad 2027",
      start_date: "2027-12-18",
      end_date: "2028-01-08",
    }));
    expect(refreshPeriods).toHaveBeenCalledWith("period-created");
    expect(selectPeriod).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("updates an existing period with the complete allowed body", async () => {
    render(<PeriodManagementDialog open onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Editar Vacaciones 2026" }));
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: "Vacaciones familiares 2026" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar período" }));

    await waitFor(() => expect(updatePeriod).toHaveBeenCalledWith("period-2026", {
      name: "Vacaciones familiares 2026",
      start_date: "2026-12-20",
      end_date: "2027-01-10",
    }));
    expect(refreshPeriods).toHaveBeenCalledOnce();
    expect(selectPeriod).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("keeps the form open and values when the API rejects a conflicting range", async () => {
    updatePeriod.mockRejectedValueOnce(new Error("El período dejaría actividades fuera de rango."));
    render(<PeriodManagementDialog open onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Editar Vacaciones 2026" }));
    fireEvent.change(screen.getByLabelText(/Fecha final/), { target: { value: "2026-12-25" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar período" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("El período dejaría actividades fuera de rango.");
    expect(screen.getByLabelText(/Fecha final/)).toHaveValue("2026-12-25");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("validates an invalid date range before making an API request", async () => {
    render(<PeriodManagementDialog open onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Crear período" }));
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: "Período inválido" } });
    fireEvent.change(screen.getByLabelText(/Fecha inicial/), { target: { value: "2027-12-20" } });
    fireEvent.change(screen.getByLabelText(/Fecha final/), { target: { value: "2027-12-10" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar período" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("La fecha inicial no puede ser posterior");
    expect(createPeriod).not.toHaveBeenCalled();
  });
});
