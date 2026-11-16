import { useCallback, useEffect, useRef, useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "../../components/common/AsyncState.jsx";
import { usePeriod } from "../../context/PeriodContext.jsx";
import {
  getActivitiesReport,
  getBudgetReport,
  getGeneralReport,
} from "../../services/api/reportsService.js";
import { getActivities } from "../../services/api/activitiesService.js";
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

const REPORT_FILTER_FIELDS = {
  general: ["start_date", "end_date", "category", "status", "activity_id", "priority", "min_amount", "max_amount"],
  activities: ["start_date", "end_date", "category", "status", "activity_id", "priority"],
  budget: ["start_date", "end_date", "category", "activity_id", "min_amount", "max_amount"],
};
const CATEGORIES = ["Viajes", "Transporte", "Alojamiento", "Recreación", "Turismo", "Reuniones familiares", "Otros"];
const STATUSES = ["Pendiente", "En progreso", "Completada", "Cancelada"];
const PRIORITIES = ["Alta", "Media", "Baja"];
const EMPTY_FILTERS = { start_date: "", end_date: "", category: "", status: "", activity_id: "", priority: "", min_amount: "", max_amount: "" };
const createReportState = () => ({
  general: { data: null, meta: null, page: 1, pageSize: 20, isLoading: false, error: null, pendingFilters: { ...EMPTY_FILTERS }, appliedFilters: {}, filtersOpen: false },
  activities: { data: null, meta: null, page: 1, pageSize: 20, isLoading: false, error: null, pendingFilters: { ...EMPTY_FILTERS }, appliedFilters: {}, filtersOpen: false },
  budget: { data: null, meta: null, page: 1, pageSize: 20, isLoading: false, error: null, pendingFilters: { ...EMPTY_FILTERS }, appliedFilters: {}, filtersOpen: false },
});
const INITIAL_REPORT_STATE = createReportState();

function amountToCents(value) {
  if (!value) return null;
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}
function validateReportFilters(filters) {
  if (Boolean(filters.start_date) !== Boolean(filters.end_date)) return "Debes indicar las dos fechas del rango.";
  if (filters.start_date && filters.start_date > filters.end_date) return "La fecha inicial no puede ser posterior a la fecha final.";
  for (const key of ["min_amount", "max_amount"]) {
    if (filters[key] && !/^\\d+(?:\\.\\d{1,2})?$/.test(filters[key])) return "Los importes deben ser decimales no negativos con máximo dos decimales.";
  }
  if (filters.min_amount && filters.max_amount && amountToCents(filters.min_amount) > amountToCents(filters.max_amount)) {
    return "El importe mínimo no puede superar el importe máximo.";
  }
  return "";
}
function filtersEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

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

function ReportFilters({ reportType, report, onPendingChange, onToggle, onApply, onClear, activities, activitiesLoading, activitiesError, onLoadActivities }) {
  const applicable = REPORT_FILTER_FIELDS[reportType];
  const pending = report.pendingFilters;
  const validationError = validateReportFilters(pending);
  const hasApplied = Object.keys(report.appliedFilters).length > 0;
  const hasPending = applicable.some((key) => (pending[key] || "") !== (report.appliedFilters[key] || ""));
  const isBusy = report.isLoading;
  const set = (key, value) => onPendingChange(reportType, key, value);
  const show = (key) => applicable.includes(key);
  return (
    <section className="reports-filter-panel" aria-label="Filtros del informe">
      <div className="reports-filter-heading">
        <div><strong>Filtros</strong>{(hasApplied || hasPending) && <span className="reports-filter-count">Filtros activos o pendientes</span>}</div>
        <button type="button" aria-expanded={report.filtersOpen} onClick={() => onToggle(reportType)}>
          {report.filtersOpen ? "Ocultar filtros" : "Mostrar filtros"}
        </button>
      </div>
      {report.filtersOpen && (
        <div className="reports-filter-content">
          <div className="reports-filter-grid">
            {show("start_date") && <label>Desde<input aria-label="Fecha inicial" type="date" value={pending.start_date} disabled={isBusy} onChange={(e) => set("start_date", e.target.value)} /></label>}
            {show("end_date") && <label>Hasta<input aria-label="Fecha final" type="date" value={pending.end_date} disabled={isBusy} onChange={(e) => set("end_date", e.target.value)} /></label>}
            {show("category") && <label>Categoría<select aria-label="Categoría" value={pending.category} disabled={isBusy} onChange={(e) => set("category", e.target.value)}><option value="">Todas</option>{CATEGORIES.map((v) => <option key={v} value={v}>{v}</option>)}</select></label>}
            {show("status") && <label>Estado<select aria-label="Estado" value={pending.status} disabled={isBusy} onChange={(e) => set("status", e.target.value)}><option value="">Todos</option>{STATUSES.map((v) => <option key={v} value={v}>{v}</option>)}</select></label>}
            {show("priority") && <label>Prioridad<select aria-label="Prioridad" value={pending.priority} disabled={isBusy} onChange={(e) => set("priority", e.target.value)}><option value="">Todas</option>{PRIORITIES.map((v) => <option key={v} value={v}>{v}</option>)}</select></label>}
            {show("activity_id") && <label>Actividad<select aria-label="Actividad" value={pending.activity_id} disabled={isBusy || activitiesLoading || Boolean(activitiesError)} onFocus={onLoadActivities} onChange={(e) => set("activity_id", e.target.value)}><option value="">Todas</option>{activities.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.start_date} – {item.end_date})</option>)}</select>{activitiesLoading && <small>Cargando actividades…</small>}{activitiesError && <small role="alert">{activitiesError.message} <button type="button" onClick={onLoadActivities}>Reintentar</button></small>}{!activitiesLoading && !activitiesError && activities.length === 0 && <small>No hay actividades disponibles.</small>}</label>}
            {show("min_amount") && <label>Importe mínimo<input aria-label="Importe mínimo" inputMode="decimal" placeholder="0.00" value={pending.min_amount} disabled={isBusy} onChange={(e) => set("min_amount", e.target.value)} /></label>}
            {show("max_amount") && <label>Importe máximo<input aria-label="Importe máximo" inputMode="decimal" placeholder="0.00" value={pending.max_amount} disabled={isBusy} onChange={(e) => set("max_amount", e.target.value)} /></label>}
          </div>
          {validationError && <p className="reports-filter-error" role="alert">{validationError}</p>}
          <div className="reports-filter-actions">
            <button type="button" disabled={isBusy || !hasPending || Boolean(validationError)} onClick={() => onApply(reportType)}>Aplicar filtros</button>
            <button type="button" disabled={isBusy || (!hasApplied && !applicable.some((key) => pending[key]))} onClick={() => onClear(reportType)}>Limpiar filtros</button>
          </div>
        </div>
      )}
    </section>
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
  const [activityOptions, setActivityOptions] = useState([]);
  const [activityOptionsLoading, setActivityOptionsLoading] = useState(false);
  const [activityOptionsError, setActivityOptionsError] = useState(null);
  const [activityOptionsLoaded, setActivityOptionsLoaded] = useState(false);
  const activityOptionsSequence = useRef(0);
  const requestSequences = useRef({ general: 0, activities: 0, budget: 0 });
  const reportsRef = useRef(reports);
  reportsRef.current = reports;

  const loadReport = useCallback(async (reportType, page = 1, pageSize = 20, force = false, filters = reportsRef.current[reportType]?.appliedFilters || {}) => {
    if (!selectedPeriodId || !REPORT_LOADERS[reportType]) return;
    const current = reportsRef.current[reportType];
    if (!force && current.data && current.page === page && current.pageSize === pageSize) return;

    const requestId = ++requestSequences.current[reportType];
    setReports((state) => ({
      ...state,
      [reportType]: { ...state[reportType], isLoading: true, error: null, data: null, meta: null, page, pageSize },
    }));
    try {
      const response = await REPORT_LOADERS[reportType](selectedPeriodId, { filters, page, page_size: pageSize });
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
    setReports(createReportState());
    setActivityOptions([]);
    setActivityOptionsLoading(false);
    setActivityOptionsLoaded(false);
    setActivityOptionsError(null);
    activityOptionsSequence.current += 1;
    Object.keys(requestSequences.current).forEach((key) => { requestSequences.current[key] += 1; });
  }, [selectedPeriodId]);

  useEffect(() => {
    if (activeTab !== "comparison") loadReport(activeTab);
  }, [activeTab, loadReport]);

  function changePage(reportType, page) {
    const current = reports[reportType];
    loadReport(reportType, page, current.pageSize, true, current.appliedFilters);
  }

  function changePageSize(reportType, pageSize) {
    const current = reports[reportType];
    loadReport(reportType, 1, pageSize, true, current.appliedFilters);
  }

  function updatePendingFilter(reportType, key, value) {
    setReports((state) => ({
      ...state,
      [reportType]: { ...state[reportType], pendingFilters: { ...state[reportType].pendingFilters, [key]: value } },
    }));
  }

  function toggleFilters(reportType) {
    const shouldOpen = !reportsRef.current[reportType].filtersOpen;
    setReports((state) => ({
      ...state,
      [reportType]: { ...state[reportType], filtersOpen: shouldOpen },
    }));
    if (shouldOpen && REPORT_FILTER_FIELDS[reportType].includes("activity_id")) loadActivityOptions();
  }

  function applyFilters(reportType) {
    const current = reportsRef.current[reportType];
    const error = validateReportFilters(current.pendingFilters);
    if (error || current.isLoading) return;
    const appliedFilters = Object.fromEntries(
      REPORT_FILTER_FIELDS[reportType].filter((key) => current.pendingFilters[key]).map((key) => [key, current.pendingFilters[key]]),
    );
    setReports((state) => ({
      ...state,
      [reportType]: { ...state[reportType], appliedFilters, page: 1 },
    }));
    loadReport(reportType, 1, current.pageSize, true, appliedFilters);
  }

  function clearFilters(reportType) {
    const current = reportsRef.current[reportType];
    if (current.isLoading) return;
    setReports((state) => ({
      ...state,
      [reportType]: { ...state[reportType], pendingFilters: { ...EMPTY_FILTERS }, appliedFilters: {}, page: 1 },
    }));
    loadReport(reportType, 1, current.pageSize, true, {});
  }

  const loadActivityOptions = useCallback(async () => {
    if (!selectedPeriodId || activityOptionsLoaded || activityOptionsLoading) return;
    const sequence = ++activityOptionsSequence.current;
    setActivityOptionsLoading(true);
    setActivityOptionsError(null);
    try {
      const result = await getActivities({ period_id: selectedPeriodId });
      if (sequence !== activityOptionsSequence.current) return;
      setActivityOptions(Array.isArray(result) ? result : []);
      setActivityOptionsLoaded(true);
    } catch (error) {
      if (sequence === activityOptionsSequence.current) setActivityOptionsError(error);
    } finally {
      if (sequence === activityOptionsSequence.current) setActivityOptionsLoading(false);
    }
  }, [selectedPeriodId, activityOptionsLoaded, activityOptionsLoading]);

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
        ) : (
          <>
            <ReportFilters reportType={activeTab} report={activeReport}
              onPendingChange={updatePendingFilter} onToggle={toggleFilters}
              onApply={applyFilters} onClear={clearFilters}
              activities={activityOptions} activitiesLoading={activityOptionsLoading}
              activitiesError={activityOptionsError} onLoadActivities={loadActivityOptions} />
            {activeReport?.isLoading ? (
          <LoadingState message="Generando informe…" />
        ) : activeReport?.error ? (
          <ErrorState message={activeReport.error.message} onRetry={retry} />
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
          </>
        )}
        <HistoricalComparison isActive={activeTab === "comparison"} />
      </section>
    </div>
  );
}

export default ReportsPage;
