import { useCallback, useEffect, useRef, useState } from "react";
import { usePeriod } from "../../context/PeriodContext.jsx";
import { getDashboard } from "../../services/api/dashboardService.js";
import { ErrorState, LoadingState } from "../../components/common/AsyncState.jsx";
import {
  ActivityStatusChart, BudgetComparisonChart, ComplianceIndicator, ExpenseCategoryChart,
} from "./DashboardCharts.jsx";

const currency = (value) => new Intl.NumberFormat("es-CO", {
  style: "currency", currency: "COP", maximumFractionDigits: 2,
}).format(Number(value || 0));

function Metric({ label, value }) {
  return <article className="metric-card"><span>{label}</span><strong>{value}</strong></article>;
}

function DashboardPage() {
  const { selectedPeriodId, selectedPeriod } = usePeriod();
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const requestSequence = useRef(0);

  const loadDashboard = useCallback(async () => {
    const requestId = ++requestSequence.current;
    if (!selectedPeriodId) { setDashboard(null); setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);
    try {
      const data = await getDashboard(selectedPeriodId);
      if (requestId === requestSequence.current) setDashboard(data);
    } catch (requestError) {
      if (requestId === requestSequence.current) {
        setDashboard(null);
        setError(requestError);
      }
    } finally {
      if (requestId === requestSequence.current) setIsLoading(false);
    }
  }, [selectedPeriodId]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  if (isLoading) return <LoadingState message="Cargando el resumen del período…" />;
  if (error) return <ErrorState message={error.message} onRetry={loadDashboard} />;
  if (!selectedPeriodId) return <div className="dashboard-heading"><h1>Dashboard</h1><p>Selecciona o crea un período para consultar el resumen.</p></div>;
  if (!dashboard) return null;

  const { financial, activities, charts } = dashboard;
  const statuses = activities.by_status || [];
  return (
    <div className="dashboard-page">
      <header className="dashboard-heading">
        <div><p className="eyebrow">RESUMEN DEL PERÍODO</p><h1>Dashboard</h1>
          <p>{dashboard.period?.name || selectedPeriod?.name || "Período seleccionado"} · Indicadores y seguimiento de tus vacaciones decembrinas.</p></div>
        <span className="period-tag">{dashboard.period?.year || selectedPeriod?.year}</span>
      </header>
      <section className="metric-section" aria-labelledby="financial-title">
        <h2 id="financial-title">Resumen financiero</h2>
        <div className="metrics-grid">
          <Metric label="Presupuesto general" value={currency(financial.total_budget)} />
          <Metric label="Total de gastos" value={currency(financial.total_expenses)} />
          <Metric label="Saldo general" value={currency(financial.balance)} />
          <Metric label="Ejecución" value={`${financial.execution_percentage}%`} />
        </div>
      </section>
      <section className="metric-section" aria-labelledby="activities-title">
        <h2 id="activities-title">Resumen de actividades</h2>
        <div className="metrics-grid">
          <Metric label="Total de actividades" value={activities.total} />
          <Metric label="Completadas" value={statuses.find((item) => item.status === "Completada")?.count || 0} />
          <Metric label="En progreso" value={statuses.find((item) => item.status === "En progreso")?.count || 0} />
          <Metric label="Pendientes" value={statuses.find((item) => item.status === "Pendiente")?.count || 0} />
          <Metric label="Canceladas" value={statuses.find((item) => item.status === "Cancelada")?.count || 0} />
          <Metric label="Cumplimiento" value={`${activities.completion_percentage}%`} />
          <Metric label="Actividades vencidas" value={activities.overdue_count} />
        </div>
      </section>
      <section className="metric-section" aria-labelledby="alerts-summary-title">
        <h2 id="alerts-summary-title">Alertas pendientes</h2>
        <div className="metrics-grid">
          <Metric label="Próximas" value={dashboard.alerts.upcoming_pending} />
          <Metric label="Vencidas" value={dashboard.alerts.overdue_pending} />
          <Metric label="Prioridad alta" value={dashboard.alerts.high_priority_pending} />
        </div>
      </section>
      <section className="charts-grid" aria-label="Gráficos del período">
        <ActivityStatusChart data={charts.activities_by_status || []} total={activities.total} />
        <BudgetComparisonChart data={charts.budget_vs_expenses_by_category || []} />
        <ExpenseCategoryChart data={charts.expenses_by_category || []} />
        <ComplianceIndicator value={charts.completion_percentage} />
      </section>
    </div>
  );
}
export default DashboardPage;
