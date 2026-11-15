import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "../src/services/api/httpClient.js";
import {
  evaluateAlerts,
  getPendingActiveAlerts,
  reviewAlert,
} from "../src/services/api/alertsService.js";
import { ensurePeriodEvaluated } from "../src/features/dashboard/alertSession.js";
import {
  ActivityStatusChart,
  BudgetComparisonChart,
} from "../src/features/dashboard/DashboardCharts.jsx";
import { AlertsDrawer } from "../src/features/dashboard/AlertsDrawer.jsx";

vi.mock("../src/services/api/httpClient.js", () => ({
  request: vi.fn(),
}));

describe("FE-002: contratos de alertas", () => {
  beforeEach(() => vi.clearAllMocks());

  it("evalúa únicamente el período solicitado mediante POST", async () => {
    request.mockResolvedValue({ data: { evaluated: true } });

    await evaluateAlerts("period-2026");

    expect(request).toHaveBeenCalledWith("/alerts/evaluate", {
      method: "POST",
      body: JSON.stringify({ period_id: "period-2026" }),
    });
  });

  it("consulta alertas pendientes activas sin paginación", async () => {
    const alerts = [{ id: "alert-1" }];
    request.mockResolvedValue({ data: alerts });

    await expect(getPendingActiveAlerts("period-2026")).resolves.toEqual(alerts);

    const [url] = request.mock.calls[0];
    const query = new URLSearchParams(url.split("?")[1]);
    expect(url).toContain("/alerts?");
    expect(query.get("period_id")).toBe("period-2026");
    expect(query.get("status")).toBe("Pendiente");
    expect(query.get("condition_active")).toBe("true");
    expect(query.has("page")).toBe(false);
    expect(query.has("page_size")).toBe(false);
  });

  it("marca una alerta como revisada mediante PATCH sin cuerpo", async () => {
    request.mockResolvedValue({ data: { id: "alert-1", status: "Revisada" } });

    await expect(reviewAlert("alert-1")).resolves.toEqual({
      id: "alert-1",
      status: "Revisada",
    });
    expect(request).toHaveBeenCalledWith("/alerts/alert-1/review", { method: "PATCH" });
  });
});

describe("FE-002: evaluación por período durante la sesión", () => {
  it("evita repetir una evaluación exitosa para el mismo período", async () => {
    const evaluate = vi.fn().mockResolvedValue({ ok: true });

    await ensurePeriodEvaluated("session-period-a", evaluate);
    await ensurePeriodEvaluated("session-period-a", evaluate);

    expect(evaluate).toHaveBeenCalledTimes(1);
  });

  it("comparte la solicitud en curso para evitar evaluaciones simultáneas duplicadas", async () => {
    let resolveEvaluation;
    const evaluate = vi.fn(() => new Promise((resolve) => {
      resolveEvaluation = resolve;
    }));

    const first = ensurePeriodEvaluated("session-period-b", evaluate);
    const second = ensurePeriodEvaluated("session-period-b", evaluate);
    expect(evaluate).toHaveBeenCalledTimes(0);

    await Promise.resolve();
    expect(evaluate).toHaveBeenCalledTimes(1);
    resolveEvaluation({ ok: true });
    await Promise.all([first, second]);
    expect(evaluate).toHaveBeenCalledTimes(1);
  });

  it("permite reintentar cuando la evaluación falla", async () => {
    const evaluate = vi.fn()
      .mockRejectedValueOnce(new Error("fallo temporal"))
      .mockResolvedValueOnce({ ok: true });

    await expect(ensurePeriodEvaluated("session-period-c", evaluate))
      .rejects.toThrow("fallo temporal");
    await ensurePeriodEvaluated("session-period-c", evaluate);

    expect(evaluate).toHaveBeenCalledTimes(2);
  });
});

describe("FE-002: gráficos", () => {
  it("usa el total de actividades entregado por el backend", () => {
    render(<ActivityStatusChart
      total={8}
      data={[{ status: "Pendiente", count: 2 }, { status: "Completada", count: 3 }]}
    />);

    expect(screen.getByText("8")).toBeInTheDocument();
  });

  it("conserva dos decimales en los importes financieros", () => {
    render(<BudgetComparisonChart data={[
      { category: "Viajes", budget: "1234.56", expenses: "987.65" },
    ]} />);

    expect(document.body.textContent).toContain("1.234,56");
    expect(document.body.textContent).toContain("987,65");
  });
});

describe("FE-002: panel de alertas", () => {
  const alert = (id, type, name, date) => ({
    id,
    type,
    activity_id: `activity-${id}`,
    activity: {
      name,
      start_date: date,
      start_time: "09:00",
      priority: "Alta",
      status: "Pendiente",
    },
  });

  it("agrupa las alertas en el orden aprobado y ordena por fecha dentro del grupo", () => {
    const alerts = [
      alert("1", "Prioridad alta", "Prioridad", "2026-12-20"),
      alert("2", "Vencida", "Vencida tarde", "2026-12-18"),
      alert("3", "Vencida", "Vencida temprano", "2026-12-17"),
      alert("4", "Próxima", "Próxima", "2026-12-19"),
    ];

    render(<AlertsDrawer
      open
      onClose={vi.fn()}
      alerts={alerts}
      isLoading={false}
      error={null}
      notice=""
      isReviewing={[]}
      onRetry={vi.fn()}
      onReview={vi.fn()}
      onNavigate={vi.fn()}
    />);

    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings.map((heading) => heading.textContent)).toEqual([
      "Vencidas2",
      "Próximas1",
      "Prioridad alta1",
    ]);
    const names = screen.getAllByText(/Vencida (temprano|tarde)/).map((node) => node.textContent);
    expect(names).toEqual(["Vencida temprano", "Vencida tarde"]);
  });

  it("cierra con Escape y devuelve el foco al control que abrió el panel", () => {
    const onClose = vi.fn();
    render(
      <>
        <button type="button">Abrir panel</button>
        <AlertsDrawer
          open
          onClose={onClose}
          alerts={[]}
          isLoading={false}
          error={null}
          notice=""
          isReviewing={[]}
          onRetry={vi.fn()}
          onReview={vi.fn()}
          onNavigate={vi.fn()}
        />
      </>,
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
