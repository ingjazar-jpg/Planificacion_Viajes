import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AlertsDrawer } from "../src/features/dashboard/AlertsDrawer.jsx";

const records = [
  { id: "a2", activity_id: "activity-2", type: "Próxima", activity: { name: "Viaje tarde", start_date: "2026-12-22", start_time: "12:00", priority: "Media", status: "Pendiente" } },
  { id: "a1", activity_id: "activity-1", type: "Vencida", activity: { name: "Actividad vencida", start_date: "2026-12-20", start_time: "08:00", priority: "Alta", status: "En progreso" } },
  { id: "a3", activity_id: "activity-3", type: "Próxima", activity: { name: "Viaje temprano", start_date: "2026-12-22", start_time: "07:00", priority: "Baja", status: "Pendiente" } },
  { id: "a4", activity_id: "activity-4", type: "Prioridad alta", activity: { name: "Urgente", start_date: "2026-12-21", start_time: "09:00", priority: "Alta", status: "Pendiente" } },
];

describe("AlertsDrawer", () => {
  it("groups alerts in the approved order and sorts each group by start date", () => {
    const { container } = render(<AlertsDrawer open alerts={records} isReviewing={[]}
      onClose={vi.fn()} onRetry={vi.fn()} onReview={vi.fn()} onNavigate={vi.fn()} />);
    const headings = [...container.querySelectorAll(".alert-group h3")].map((node) => node.textContent.replace(/\d+$/, ""));
    expect(headings).toEqual(["Vencidas", "Próximas", "Prioridad alta"]);
    const names = [...container.querySelectorAll(".alert-item-main strong")].map((node) => node.textContent);
    expect(names).toEqual(["Actividad vencida", "Viaje temprano", "Viaje tarde", "Urgente"]);
  });

  it("shows the approved empty state and keeps the dialog open", () => {
    render(<AlertsDrawer open alerts={[]} isReviewing={[]} onClose={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "Alertas pendientes" })).toBeInTheDocument();
    expect(screen.getByText("No tienes alertas pendientes")).toBeInTheDocument();
    expect(screen.getByText("Las actividades de este período están al día")).toBeInTheDocument();
  });

  it("passes the activity identifier to navigation", () => {
    const onNavigate = vi.fn();
    render(<AlertsDrawer open alerts={[records[0]]} isReviewing={[]} onClose={vi.fn()} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole("button", { name: "Ver actividad" }));
    expect(onNavigate).toHaveBeenCalledWith("activity-2");
  });
});
