import { useCallback, useEffect, useRef, useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "../../components/common/AsyncState.jsx";
import { usePeriod } from "../../context/PeriodContext.jsx";
import {
  getActivitiesReport,
  getBudgetReport,
  getGeneralReport,
} from "../../services/api/reportsService.js";
import HistoricalComparison from "./HistoricalComparison.jsx";
import "./ReportsPage.css";

const REPORT_TABS = [
  { id: "general", label: "General" },
  { id: "activities", label: "Actividades" },
  { id: "budget", label: "Presupuesto y gastos" },
  { id: "comparison", label: "Comparación histórica" },
];

const REPORT_LOADERS = {
  general: getGeneralReport,
  activities: getActivitiesReport,
  budget: getBudgetReport,
};

const INITIAL_REPORT_STATE = {
  general: { data: null, meta: null, page: 1, pageSize: 20, isLoading: false, error: null },
  activities: { data: null, meta: null, page: 1, pageSize: 20, isLoading: false, error: null },
  budget: { data: null, meta: null, page: 1, pageSize: 20, isLoading: false, error: null },
};

function Metric({ label, value }) {
  return <article className="reports-metric"><span>{label}</span><strong>{value ?? "—"}</strong></article>;
}

function Money({ value }) {
  // El valor decimal se presenta como texto: no se convierte ni se recalcula en frontend.
  return <span>{value == null ? "—" : `COP ${value}`}</span>;
}

function ReportHeader({ period }) {
  return (
    <header className="reports-section-heading">
      <div>
        <h2>{period?.name || "Informe del período"}</h2>
        <p>{period?.start_date || "Fecha inicial no disponible"} – {period?.end_date || "Fecha final no disponible"}</p>
      </div>
      {period?.year && <span className="reports-period-year">{period.year}</span>}
    </header>
  );
}

function StatusSummary({ summary }) {
  const statuses = summary?.by_status || [];
  return (
    <section className="reports-section" aria-labelledby="reports-status-title">
      <h3 id="reports-status-title">Resumen de actividades</h3>
      <div className="reports-metrics-grid">
        <Metric label="Total" value={summary?.total ?? 0} />
        {["Pendiente", "En progreso", "Completada", "Cancelada"].map((status) => (
          <Metric key={status} label={status} value={statuses.find((item) => item.status === status)?.count ?? 0} />
        ))}
        <Metric label="Cumplimiento" value={summary?.completion_percentage == null ? "—" : `${summary.completion_percentage}%`} />
      </div>
    </section>
  );
}

function ActivityResults({ activities = [] }) {
  if (!activities.length) {
    return <EmptyState title="Sin actividades" message="No hay actividades para los criterios seleccionados." />;
  }
  return (
    <>
      <div className="reports-table-wrap">
        <table className="reports-table">
          <thead><tr><th>Actividad</th><th>Fechas</th><th>Categoría</th><th>Prioridad</th><th>Estado</th></tr></thead>
          <tbody>{activities.map((item) => (
            <tr key={item.id} className={item.status === "Cancelada" ? "is-cancelled" : ""}>
              <td><strong>{item.name}</strong>{item.destination && <small>{item.destination}</small>}</td>
              <td>{item.start_date} – {item.end_date}</td>
              <td>{item.category}</td><td>{item.priority}</td><td><span className="reports-status">{item.status}</span></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <ul className="reports-activity-cards">
        {activities.map((item) => (
          <li key={item.id} className={item.status === "Cancelada" ? "is-cancelled" : ""}>
            <strong>{item.name}</strong>
            <span>{item.start_date} – {item.end_date}</span>
            <span>{item.category} · {item.priority}</span>
            <span className="reports-status">{item.status}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function Pagination({ meta, page, pageSize, onPageChange, onPageSizeChange, isLoading }) {
  if (!meta) return null;
  return (
    <nav className="reports-pagination" aria-label="Paginación del informe">
      <span>{meta.total} registros</span>
      <label>Registros por página
        <select value={pageSize} disabled={isLoading} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
          {[10, 20, 50].map((size) => <option key={size} value={size}>{size}</option>)}
        </select>
      </label>
      <button type="button" disabled={isLoading || page <= 1} onClick={() => onPageChange(page - 1)}>Anterior</button>
      <span>Página {page} de {meta.total_pages}</span>
      <button type="button" disabled={isLoading || page >= meta.total_pages} onClick={() => onPageChange(page + 1)}>Siguiente</button>
    </nav>
  );
}

function GeneralReport({ report }) {
  const { period, budget, activities, expenses, summary } = report;
  return (
    <>
      <ReportHeader period={period} />
      <section className="reports-section">
        <h3>Resumen presupuestario</h3>
        <div className="reports-metrics-grid">
          <Metric label="Presupuesto" value={<Money value={budget?.total_budget} />} />
          <Metric label="Gastos" value={<Money value={budget?.total_expenses} />} />
          <Metric label="Saldo" value={<Money value={budget?.balance} />} />
          <Metric label="Ejecución" value={budget?.execution_percentage == null ? "—" : `${budget.execution_percentage}%`} />
        </div>
        {budget?.total_budget === "0.00" && <p className="reports-note">Este período no tiene presupuesto registrado.</p>}
      </section>
      <StatusSummary summary={activities} />
      <section className="reports-section">
        <h3>Gastos del período</h3>
        <div className="reports-metrics-grid reports-metrics-grid-compact">
          <Metric label="Total de gastos" value={<Money value={expenses?.total} />} />
          <Metric label="Registros" value={expenses?.count ?? 0} />
        </div>
        <ExpenseResults items={expenses?.items || []} />
      </section>
      <section className="reports-section">
        <h3>Resumen de resultados</h3>
        {summary ? <p className="reports-summary-text">{summary}</p> : <EmptyState title="Sin resultados" message="No hay resultados de actividades para los criterios seleccionados." />}
      </section>
    </>
  );
}

function ExpenseResults({ items }) {
  if (!items.length) return <EmptyState title="Sin gastos" message="No hay gastos para los criterios seleccionados." />;
  return (
    <div className="reports-table-wrap">
      <table className="reports-table">
        <thead><tr><th>Concepto</th><th>Fecha</th><th>Categoría</th><th>Importe</th></tr></thead>
        <tbody>{items.map((item) => (
          <tr key={item.id}><td>{item.concept}</td><td>{item.date}</td><td>{item.category}</td><td><Money value={item.amount} /></td></tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function ActivitiesReport({ report }) {
  return (
    <>
      <ReportHeader period={report.period} />
      <StatusSummary summary={report.summary} />
      <section className="reports-section">
        <h3>Detalle de actividades</h3>
        <ActivityResults activities={report.activities} />
      </section>
    </>
  );
}

function BudgetReport({ report }) {
  const { period, budget, expenses } = report;
  return (
    <>
      <ReportHeader period={period} />
      <section className="reports-section">
        <h3>Indicadores presupuestarios</h3>
        <div className="reports-metrics-grid">
          <Metric label="Presupuesto" value={<Money value={budget?.total_budget} />} />
          <Metric label="Gastos" value={<Money value={expenses?.total} />} />
          <Metric label="Saldo" value={<Money value={expenses?.balance} />} />
          <Metric label="Ejecución" value={expenses?.execution_percentage == null ? "—" : `${expenses.execution_percentage}%`} />
        </div>
        {budget?.total_budget === "0.00" && <p className="reports-note">Este período no tiene presupuesto registrado.</p>}
      </section>
      <section className="reports-section">
        <h3>Presupuesto por categoría</h3>
        <div className="reports-category-grid">
          {(budget?.categories || []).map((item) => (
            <article key={item.category} className={item.over_budget ? "reports-category is-over-budget" : "reports-category"}>
              <h4>{item.category}</h4>
              <dl>
                <div><dt>Asignado</dt><dd><Money value={item.allocated_budget} /></dd></div>
                <div><dt>Gastos</dt><dd><Money value={item.expenses} /></dd></div>
                <div><dt>Saldo</dt><dd><Money value={item.balance} /></dd></div>
              </dl>
              {item.over_budget && <span className="reports-warning">Sobreejecución</span>}
            </article>
          ))}
        </div>
      </section>
      <section className="reports-section">
        <h3>Gastos por actividad</h3>
        <div className="reports-groups">
          {(expenses?.by_activity || []).map((item) => (
            <article key={item.activity_id || "unassigned"} className="reports-group">
              <strong>{item.activity_name}</strong>
              <span>{item.count} gastos</span>
              <b><Money value={item.total} /></b>
            </article>
          ))}
        </div>
        <h3>Gastos por categoría</h3>
        <div className="reports-groups">
          {(expenses?.by_category || []).map((item) => (
            <article key={item.category} className="reports-group">
              <strong>{item.category}</strong><span>{item.count} gastos</span><b><Money value={item.total} /></b>
            </article>
          ))}
        </div>
      </section>
      <section className="reports-section">
        <h3>Detalle de gastos</h3>
        <ExpenseResults items={expenses?.items || []} />
      </section>
    </>
  );
}

function ReportsPage() {
  const { selectedPeriodId } = usePeriod();
  const [activeTab, setActiveTab] = useState("general");
  const [reports, setReports] = useState(INITIAL_REPORT_STATE);
  const requestSequences = useRef({ general: 0, activities: 0, budget: 0 });
  const reportsRef = useRef(reports);
  reportsRef.current = reports;

  const loadReport = useCallback(async (reportType, page = 1, pageSize = 20, force = false) => {
    if (!selectedPeriodId || !REPORT_LOADERS[reportType]) return;
    const current = reportsRef.current[reportType];
    if (!force && current.data && current.page === page && current.pageSize === pageSize) return;

    const requestId = ++requestSequences.current[reportType];
    setReports((state) => ({
      ...state,
      [reportType]: { ...state[reportType], isLoading: true, error: null, data: null, meta: null, page, pageSize },
    }));
    try {
      const response = await REPORT_LOADERS[reportType](selectedPeriodId, { page, page_size: pageSize });
      if (requestId !== requestSequences.current[reportType]) return;
      setReports((state) => ({
        ...state,
        [reportType]: { ...state[reportType], data: response?.data || null, meta: response?.meta || null, isLoading: false, error: null, page, pageSize },
      }));
    } catch (error) {
      if (requestId !== requestSequences.current[reportType]) return;
      setReports((state) => ({
        ...state,
        [reportType]: { ...state[reportType], data: null, meta: null, isLoading: false, error, page, pageSize },
      }));
    }
  }, [selectedPeriodId]);

  useEffect(() => {
    reportsRef.current = INITIAL_REPORT_STATE;
    setReports(INITIAL_REPORT_STATE);
    Object.keys(requestSequences.current).forEach((key) => { requestSequences.current[key] += 1; });
  }, [selectedPeriodId]);

  useEffect(() => {
    if (activeTab !== "comparison") loadReport(activeTab);
  }, [activeTab, loadReport]);

  function changePage(reportType, page) {
    const current = reports[reportType];
    loadReport(reportType, page, current.pageSize, true);
  }

  function changePageSize(reportType, pageSize) {
    loadReport(reportType, 1, pageSize, true);
  }

  const activeReport = reports[activeTab];
  const retry = () => loadReport(activeTab, activeReport.page, activeReport.pageSize, true);

  return (
    <div className="reports-page">
      <header className="reports-page-heading">
        <div>
          <p className="page-eyebrow">CONSULTA Y ANÁLISIS</p>
          <h1>Informes</h1>
          <p>Consulta los resultados del período y revisa su evolución presupuestaria.</p>
        </div>
      </header>
      <div className="reports-tabs" role="tablist" aria-label="Tipos de informe">
        {REPORT_TABS.map((tab) => (
          <button key={tab.id} type="button" role="tab" id={`reports-tab-${tab.id}`}
            aria-selected={activeTab === tab.id} aria-controls={`reports-panel-${tab.id}`}
            className={activeTab === tab.id ? "is-active" : ""}
            onClick={() => setActiveTab(tab.id)}>{tab.label}</button>
        ))}
      </div>
      <section className="reports-panel" role="tabpanel" id={`reports-panel-${activeTab}`}
        aria-labelledby={`reports-tab-${activeTab}`} tabIndex="0">
        {!selectedPeriodId && activeTab !== "comparison" ? (
          <EmptyState title="Selecciona un período" message="Crea o selecciona un período para consultar sus informes." />
        ) : activeTab === "comparison" ? (
          null
        ) : activeReport?.isLoading ? (
          <LoadingState message="Generando informe…" />
        ) : activeReport?.error ? (
          <ErrorState message={activeReport.error.message} onRetry={retry} />
        ) : !activeReport?.data ? (
          <EmptyState title="Informe no disponible" message="No se recibieron datos para mostrar." actionLabel="Reintentar" onAction={retry} />
        ) : (
          <>
            {activeTab === "general" && <GeneralReport report={activeReport.data} />}
            {activeTab === "activities" && <ActivitiesReport report={activeReport.data} />}
            {activeTab === "budget" && <BudgetReport report={activeReport.data} />}
            <Pagination meta={activeReport.meta} page={activeReport.page} pageSize={activeReport.pageSize}
              isLoading={activeReport.isLoading} onPageChange={(page) => changePage(activeTab, page)}
              onPageSizeChange={(size) => changePageSize(activeTab, size)} />
          </>
        )}
      </section>
      <HistoricalComparison isActive={activeTab === "comparison"} />
    </div>
  );
}

export default ReportsPage;
