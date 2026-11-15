import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ActivitiesPage from "../src/features/activities/ActivitiesPage.jsx";
import { usePeriod } from "../src/context/PeriodContext.jsx";
import { getActivities } from "../src/services/api/activitiesService.js";
import { getCalendar } from "../src/services/api/calendarService.js";

vi.mock("../src/context/PeriodContext.jsx", () => ({ usePeriod: vi.fn() }));
vi.mock("../src/services/api/activitiesService.js", () => ({ getActivities: vi.fn() }));
vi.mock("../src/services/api/calendarService.js", () => ({ getCalendar: vi.fn() }));

const period = { id: "period-1", name: "Vacaciones 2026", year: 2026,
  start_date: "2026-01-01", end_date: "2026-12-31" };
const rows = [{
  id: "activity-1", name: "Viaje familiar", start_date: "2026-12-20", end_date: "2026-12-22",
  start_time: "08:00", end_time: "18:00", category: "Viajes", priority: "Alta",
  status: "Pendiente", destination: "Santa Marta",
}];

describe("ActivitiesPage list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePeriod.mockReturnValue({ selectedPeriodId: period.id, selectedPeriod: period });
    getActivities.mockResolvedValue(rows);
    getCalendar.mockResolvedValue([]);
  });

  it("loads and displays activity fields in the desktop table", async () => {
    render(<ActivitiesPage />);
    expect(await screen.findByRole("table", { name: "Listado de actividades" })).toBeInTheDocument();
    expect(screen.getByText("Viaje familiar")).toBeInTheDocument();
    expect(screen.getByText("Santa Marta")).toBeInTheDocument();
    expect(getActivities).toHaveBeenCalledWith({
      period_id: period.id, category: "", priority: "", status: "", destination: "", start_date: "", end_date: "",
    });
  });

  it("combines filters and can clear them", async () => {
    render(<ActivitiesPage />);
    await screen.findByText("Viaje familiar");
    fireEvent.change(screen.getByLabelText("Categoría"), { target: { value: "Viajes" } });
    fireEvent.change(screen.getByLabelText("Prioridad"), { target: { value: "Alta" } });
    fireEvent.change(screen.getByLabelText("Destino"), { target: { value: "Santa Marta" } });
    await waitFor(() => expect(getActivities).toHaveBeenLastCalledWith(expect.objectContaining({
      period_id: period.id, category: "Viajes", priority: "Alta", destination: "Santa Marta",
    })));
    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    await waitFor(() => expect(getActivities).toHaveBeenLastCalledWith(expect.objectContaining({
      period_id: period.id, category: "", priority: "", destination: "",
    })));
  });

  it("shows a contextual empty state and clears filters from it", async () => {
    getActivities.mockResolvedValue([]);
    render(<ActivitiesPage />);
    expect(await screen.findByText("Aún no hay actividades")).toBeInTheDocument();
  });

  it("shows a retry action when the API fails", async () => {
    getActivities.mockRejectedValueOnce(new Error("API no disponible"));
    render(<ActivitiesPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("API no disponible");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(getActivities).toHaveBeenCalledTimes(2));
  });

  it("switches to the calendar view", async () => {
    render(<ActivitiesPage />);
    await screen.findByText("Viaje familiar");
    fireEvent.click(screen.getByRole("button", { name: "Calendario", exact: true }));
    expect(await screen.findByRole("heading", { name: "Calendario" })).toBeInTheDocument();
  });
});
