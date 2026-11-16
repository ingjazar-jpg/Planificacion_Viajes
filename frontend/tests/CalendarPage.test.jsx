import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CalendarPage from "../src/features/calendar/CalendarPage.jsx";
import { usePeriod } from "../src/context/PeriodContext.jsx";
import { getCalendar } from "../src/services/api/calendarService.js";
import {
  createActivity, deleteActivity, getActivity, updateActivity, updateActivityStatus,
} from "../src/services/api/activitiesService.js";

vi.mock("../src/context/PeriodContext.jsx", () => ({ usePeriod: vi.fn() }));
vi.mock("../src/services/api/calendarService.js", () => ({ getCalendar: vi.fn() }));
vi.mock("../src/services/api/activitiesService.js", () => ({
  createActivity: vi.fn(), deleteActivity: vi.fn(), getActivity: vi.fn(),
  updateActivity: vi.fn(), updateActivityStatus: vi.fn(),
}));

const period = {
  id: "period-2026",
  name: "Vacaciones 2026",
  year: 2026,
  start_date: "2026-01-01",
  end_date: "2026-11-30",
};

const activities = [{
  id: "activity-1",
  period_id: period.id,
  name: "Cena familiar",
  category: "Reuniones familiares",
  destination: "Casa",
  start_date: "2026-11-16",
  end_date: "2026-11-17",
  start_time: "19:00",
  end_time: "22:00",
  priority: "Alta",
  status: "Pendiente",
  is_overdue: false,
}];

describe("CalendarPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePeriod.mockReturnValue({
      selectedPeriodId: period.id,
      selectedPeriod: period,
    });
    getCalendar.mockResolvedValue(activities);
    getActivity.mockResolvedValue(activities[0]);
    createActivity.mockResolvedValue(activities[0]);
    updateActivity.mockResolvedValue(activities[0]);
    deleteActivity.mockResolvedValue(null);
    updateActivityStatus.mockImplementation(async (_id, status) => ({ ...activities[0], status }));
  });

  it("opens the current month, queries the visible inclusive range and shows a multi-day activity", async () => {
    render(<CalendarPage />);

    expect(await screen.findByRole("heading", { name: "Noviembre de 2026" })).toBeInTheDocument();
    expect((await screen.findAllByRole("button", { name: /Cena familiar/ })).length).toBeGreaterThan(0);
    expect(getCalendar).toHaveBeenCalledWith(expect.objectContaining({
      period_id: period.id,
      start_date: "2026-10-26",
      end_date: "2026-12-06",
    }));
    expect(screen.getByRole("option", { name: "Reuniones familiares" })).toBeInTheDocument();
  });

  it("navigates months without clearing the selected filters", async () => {
    render(<CalendarPage />);
    await screen.findByRole("heading", { name: "Noviembre de 2026" });

    fireEvent.change(screen.getByLabelText("Categoría"), { target: { value: "Viajes" } });
    fireEvent.click(screen.getByRole("button", { name: "Mes anterior" }));

    await waitFor(() => expect(screen.getByRole("heading", { name: "Octubre de 2026" })).toBeInTheDocument());
    expect(getCalendar).toHaveBeenLastCalledWith(expect.objectContaining({
      period_id: period.id,
      category: "Viajes",
    }));
    expect(screen.getByLabelText("Categoría")).toHaveValue("Viajes");
  });

  it("combines filters and clears them on request", async () => {
    render(<CalendarPage />);
    await screen.findByRole("heading", { name: "Noviembre de 2026" });

    fireEvent.change(screen.getByLabelText("Categoría"), { target: { value: "Viajes" } });
    fireEvent.change(screen.getByLabelText("Prioridad"), { target: { value: "Alta" } });
    fireEvent.change(screen.getByLabelText("Estado"), { target: { value: "Cancelada" } });

    await waitFor(() => expect(getCalendar).toHaveBeenLastCalledWith(expect.objectContaining({
      category: "Viajes",
      priority: "Alta",
      status: "Cancelada",
    })));

    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    await waitFor(() => expect(getCalendar).toHaveBeenLastCalledWith(expect.objectContaining({
      category: "",
      priority: "",
      status: "",
    })));
  });

  it("opens the selected day agenda and activity detail", async () => {
    render(<CalendarPage />);
    await screen.findByRole("heading", { name: "Noviembre de 2026" });

    await screen.findAllByRole("button", { name: /Cena familiar/ });
    fireEvent.click(screen.getByRole("button", { name: /16 de noviembre de 2026/ }));
    expect(screen.getByRole("region", { name: /Actividades del lunes, 16 de noviembre/ })).toBeInTheDocument();

    const dayAgenda = screen.getByRole("region", { name: /Actividades del lunes, 16 de noviembre/ });
    fireEvent.click(within(dayAgenda).getByRole("button", { name: /Cena familiar/ }));
    const detail = await screen.findByRole("dialog", { name: "Cena familiar" });
    expect(detail).toHaveTextContent("Casa");
    expect(detail).toHaveTextContent("19:00–22:00");
    expect(getActivity).toHaveBeenCalledWith("activity-1");
  });


  it("supports approved status transitions from the calendar activity detail", async () => {
    render(<CalendarPage />);
    await screen.findByRole("heading", { name: "Noviembre de 2026" });
    const event = (await screen.findAllByRole("button", { name: /Cena familiar/ }))[0];
    fireEvent.click(event);
    const detail = await screen.findByRole("dialog", { name: "Cena familiar" });
    fireEvent.click(within(detail).getByRole("button", { name: "Iniciar actividad" }));
    await waitFor(() => expect(updateActivityStatus).toHaveBeenCalledWith("activity-1", "En progreso"));
    expect(await screen.findByText("En progreso")).toBeInTheDocument();
    expect(getCalendar).toHaveBeenCalledTimes(2);
  });

  it("limits dense day cells and keeps every event available in the day agenda", async () => {
    const denseActivities = Array.from({ length: 4 }, (_, index) => ({
      ...activities[0],
      id: `dense-${index + 1}`,
      name: `Actividad ${index + 1}`,
      start_date: "2026-11-16",
      end_date: "2026-11-16",
    }));
    getCalendar.mockResolvedValue(denseActivities);
    render(<CalendarPage />);

    const moreButton = await screen.findByRole("button", { name: /Ver más actividades/ });
    fireEvent.click(moreButton);
    const agenda = screen.getByRole("region", { name: /Actividades del lunes, 16 de noviembre/ });
    expect(within(agenda).getAllByRole("button", { name: /Actividad [1-4]/ })).toHaveLength(4);
  });

  it("ignores a late response from the previous month", async () => {
    let resolvePrevious;
    const nextActivity = { ...activities[0], id: "activity-next", name: "Plan de viaje", start_date: "2026-10-01", end_date: "2026-10-02" };
    getCalendar
      .mockImplementationOnce(() => new Promise((resolve) => { resolvePrevious = resolve; }))
      .mockResolvedValueOnce([nextActivity]);
    render(<CalendarPage />);

    await waitFor(() => expect(getCalendar).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Mes anterior" }));
    expect((await screen.findAllByRole("button", { name: /Plan de viaje/ })).length).toBeGreaterThan(0);

    resolvePrevious(activities);
    await waitFor(() => expect(screen.queryByRole("button", { name: /Cena familiar/ })).not.toBeInTheDocument());
  });

  it("shows an empty state when the API returns no activities", async () => {
    getCalendar.mockResolvedValue([]);
    render(<CalendarPage />);

    expect(await screen.findByText("No hay actividades para este mes")).toBeInTheDocument();
  });

  it("shows a retry action when the calendar request fails", async () => {
    getCalendar.mockRejectedValueOnce(new Error("API no disponible"));
    render(<CalendarPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("API no disponible");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect((await screen.findAllByRole("button", { name: /Cena familiar/ })).length).toBeGreaterThan(0);
  });
});
