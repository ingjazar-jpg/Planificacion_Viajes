import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ActivitiesPage from "../src/features/activities/ActivitiesPage.jsx";
import { usePeriod } from "../src/context/PeriodContext.jsx";
import {
  createActivity, getActivities, getActivity, updateActivity,
} from "../src/services/api/activitiesService.js";
import { getCalendar } from "../src/services/api/calendarService.js";

vi.mock("../src/context/PeriodContext.jsx", () => ({ usePeriod: vi.fn() }));
vi.mock("../src/services/api/activitiesService.js", () => ({
  createActivity: vi.fn(), getActivities: vi.fn(), getActivity: vi.fn(), updateActivity: vi.fn(),
}));
vi.mock("../src/services/api/calendarService.js", () => ({ getCalendar: vi.fn() }));

const period = { id: "period-1", name: "Vacaciones 2026", year: 2026,
  start_date: "2026-01-01", end_date: "2026-12-31" };
const rows = [{
  id: "activity-1", name: "Viaje familiar", start_date: "2026-12-20", end_date: "2026-12-22",
  start_time: "08:00", end_time: "18:00", category: "Viajes", priority: "Alta",
  status: "Pendiente", destination: "Santa Marta", period_id: "period-1",
  description: "Un viaje de descanso",
}];

describe("ActivitiesPage list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePeriod.mockReturnValue({ selectedPeriodId: period.id, selectedPeriod: period });
    getActivities.mockResolvedValue(rows);
    getActivity.mockResolvedValue(rows[0]);
    createActivity.mockResolvedValue({ ...rows[0], id: "activity-new" });
    updateActivity.mockResolvedValue({ ...rows[0], name: "Viaje actualizado" });
    getCalendar.mockResolvedValue([]);
  });

  it("loads and displays activity fields in the desktop table", async () => {
    render(<ActivitiesPage />);
    expect(await screen.findByRole("table", { name: "Listado de actividades" })).toBeInTheDocument();
    expect(within(screen.getByRole("table", { name: "Listado de actividades" })).getByRole("button", { name: "Viaje familiar" })).toBeInTheDocument();
    expect(getActivities).toHaveBeenCalledWith({
      period_id: period.id, category: "", priority: "", status: "", destination: "", start_date: "", end_date: "",
    });
  });

  it("combines filters and can clear them", async () => {
    render(<ActivitiesPage />);
    const table = await screen.findByRole("table", { name: "Listado de actividades" });
    expect(within(table).getByRole("button", { name: "Viaje familiar" })).toBeInTheDocument();
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

  it("does not query an invalid date range", async () => {
    render(<ActivitiesPage />);
    const table = await screen.findByRole("table", { name: "Listado de actividades" });
    expect(within(table).getByText("Viaje familiar")).toBeInTheDocument();
    const callsBefore = getActivities.mock.calls.length;
    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-12-30" } });
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "2026-12-10" } });
    expect(await screen.findByRole("alert")).toHaveTextContent("no puede ser posterior");
    await waitFor(() => expect(getActivities).toHaveBeenCalledTimes(callsBefore + 1));
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


  it("opens the activity detail from the list and shows the full resource", async () => {
    render(<ActivitiesPage />);
    const table = await screen.findByRole("table", { name: "Listado de actividades" });
    fireEvent.click(within(table).getByRole("button", { name: "Viaje familiar" }));
    expect(await screen.findByRole("dialog", { name: "Viaje familiar" })).toBeInTheDocument();
    expect(screen.getByText("Un viaje de descanso")).toBeInTheDocument();
    expect(getActivity).toHaveBeenCalledWith("activity-1");
  });

  it("creates an activity with the selected period and opens its detail", async () => {
    const created = { ...rows[0], id: "activity-new", name: "Nuevo viaje" };
    createActivity.mockResolvedValue(created);
    getActivity.mockResolvedValue(created);
    render(<ActivitiesPage />);
    await screen.findByRole("table", { name: "Listado de actividades" });
    fireEvent.click(screen.getByRole("button", { name: "Crear actividad" }));
    const dialog = screen.getByRole("dialog", { name: "Crear actividad" });
    fireEvent.change(within(dialog).getByLabelText(/Nombre/), { target: { value: "Nuevo viaje" } });
    fireEvent.change(within(dialog).getByLabelText(/Categoría/), { target: { value: "Viajes" } });
    fireEvent.change(within(dialog).getByLabelText(/Fecha inicial/), { target: { value: "2026-12-20" } });
    fireEvent.change(within(dialog).getByLabelText(/Fecha final/), { target: { value: "2026-12-22" } });
    fireEvent.change(within(dialog).getByLabelText(/Hora inicial/), { target: { value: "08:00" } });
    fireEvent.change(within(dialog).getByLabelText(/Hora final/), { target: { value: "18:00" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Guardar actividad" }));
    await waitFor(() => expect(createActivity).toHaveBeenCalledWith({
      period_id: period.id, name: "Nuevo viaje", description: null, category: "Viajes",
      destination: null, start_date: "2026-12-20", end_date: "2026-12-22",
      start_time: "08:00", end_time: "18:00", priority: "Media",
    }));
    expect(await screen.findByRole("dialog", { name: "Nuevo viaje" })).toBeInTheDocument();
  });

  it("edits the selected activity while preserving its status in the PUT contract", async () => {
    getActivity.mockResolvedValueOnce(rows[0]).mockResolvedValueOnce({ ...rows[0], name: "Viaje actualizado" });
    render(<ActivitiesPage />);
    const table = await screen.findByRole("table", { name: "Listado de actividades" });
    fireEvent.click(within(table).getByRole("button", { name: "Viaje familiar" }));
    const detail = await screen.findByRole("dialog", { name: "Viaje familiar" });
    fireEvent.click(within(detail).getByRole("button", { name: "Editar actividad" }));
    const form = screen.getByRole("dialog", { name: "Editar actividad" });
    fireEvent.change(within(form).getByLabelText(/Nombre/), { target: { value: "Viaje actualizado" } });
    fireEvent.click(within(form).getByRole("button", { name: "Guardar actividad" }));
    await waitFor(() => expect(updateActivity).toHaveBeenCalledWith("activity-1", expect.objectContaining({
      name: "Viaje actualizado", status: "Pendiente",
    })));
    expect(await screen.findByRole("dialog", { name: "Viaje actualizado" })).toBeInTheDocument();
  });

  it("opens the requested activity detail when navigated from an alert", async () => {
    render(<ActivitiesPage activityId="activity-1" />);
    expect(await screen.findByRole("dialog", { name: "Viaje familiar" })).toBeInTheDocument();
    expect(getActivity).toHaveBeenCalledWith("activity-1");
  });

  it("switches to the calendar view", async () => {
    render(<ActivitiesPage />);
    const table = await screen.findByRole("table", { name: "Listado de actividades" });
    expect(within(table).getByText("Viaje familiar")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Calendario", exact: true }));
    expect(await screen.findByRole("heading", { name: "Calendario" })).toBeInTheDocument();
  });
});
