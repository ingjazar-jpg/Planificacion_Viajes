import { useCallback, useEffect, useRef, useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "../../components/common/AsyncState.jsx";
import { usePeriod } from "../../context/PeriodContext.jsx";
import { getActivities, getActivity } from "../../services/api/activitiesService.js";
import ActivityDetailDialog from "./ActivityDetailDialog.jsx";
import ActivityFormDialog from "./ActivityFormDialog.jsx";
import CalendarPage from "../calendar/CalendarPage.jsx";

const CATEGORIES = [
  "Viajes", "Transporte", "Alojamiento", "Recreación",
  "Turismo", "Reuniones familiares", "Otros",
];
const PRIORITIES = ["Alta", "Media", "Baja"];
const STATUSES = ["Pendiente", "En progreso", "Completada", "Cancelada"];
const EMPTY_FILTERS = {
  category: "", priority: "", status: "", destination: "", start_date: "", end_date: "",
};

function ActivitiesPage({ activityId = null }) {
  const { selectedPeriodId, selectedPeriod } = usePeriod();
  const [view, setView] = useState("list");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [selectedActivityId, setSelectedActivityId] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const requestSequence = useRef(0);
  const detailRequestSequence = useRef(0);

  const loadActivities = useCallback(async () => {
    const requestId = ++requestSequence.current;
    if (!selectedPeriodId) {
      setActivities([]);
      setIsLoading(false);
      setError(null);
      return false;
    }
    if (filters.start_date && filters.end_date && filters.start_date > filters.end_date) {
      setActivities([]);
      setIsLoading(false);
      setError(null);
      return false;
    }
    setIsLoading(true);
    setError(null);
    setActivities([]);
    try {
      const result = await getActivities({ period_id: selectedPeriodId, ...filters });
      if (requestId === requestSequence.current) setActivities(result);
      return true;
    } catch (requestError) {
      if (requestId === requestSequence.current) {
        setActivities([]);
        setError(requestError);
      }
      return false;
    } finally {
      if (requestId === requestSequence.current) setIsLoading(false);
    }
  }, [selectedPeriodId, filters]);

  useEffect(() => {
    loadActivities();
    return () => { requestSequence.current += 1; };
  }, [loadActivities]);

  useEffect(() => {
    setFilters(EMPTY_FILTERS);
    setActivities([]);
    setError(null);
    setSelectedActivityId(null);
    setSelectedActivity(null);
    setDetailError(null);
  }, [selectedPeriodId]);

  useEffect(() => {
    if (activityId) {
      setView("list");
      setSelectedActivityId(activityId);
    }
  }, [activityId, selectedPeriodId]);

  const loadActivityDetail = useCallback(async (id = selectedActivityId) => {
    if (!id) return;
    const requestId = ++detailRequestSequence.current;
    setIsDetailLoading(true);
    setDetailError(null);
    setSelectedActivity(null);
    try {
      const result = await getActivity(id);
      if (requestId !== detailRequestSequence.current) return;
      if (result.period_id !== selectedPeriodId) {
        setDetailError(new Error("La actividad no pertenece al período seleccionado."));
        return;
      }
      setSelectedActivity(result);
    } catch (requestError) {
      if (requestId === detailRequestSequence.current) setDetailError(requestError);
    } finally {
      if (requestId === detailRequestSequence.current) setIsDetailLoading(false);
    }
  }, [selectedActivityId, selectedPeriodId]);

  useEffect(() => {
    if (!selectedActivityId) {
      setSelectedActivity(null);
      setDetailError(null);
      setIsDetailLoading(false);
      return undefined;
    }
    loadActivityDetail(selectedActivityId);
    return () => { detailRequestSequence.current += 1; };
  }, [selectedActivityId, loadActivityDetail]);

  function updateFilter(event) {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function openCreateForm() {
    setEditingActivity(null);
    setIsFormOpen(true);
  }

  const openEditForm = useCallback((activity) => {
    setEditingActivity(activity);
    setSelectedActivityId(null);
    setIsFormOpen(true);
  }, []);

  const closeActivityDetail = useCallback(() => setSelectedActivityId(null), []);
  const retryActivityDetail = useCallback(
    () => loadActivityDetail(selectedActivityId),
    [loadActivityDetail, selectedActivityId],
  );

  async function handleSaved(savedActivity) {
    await loadActivities();
    setIsFormOpen(false);
    setEditingActivity(null);
    setSelectedActivityId(savedActivity.id);
  }

  const hasFilters = Object.values(filters).some(Boolean);
  const hasDateRangeError = filters.start_date && filters.end_date
    && filters.start_date > filters.end_date;

  if (view === "calendar") {
    return (
      <div className="activities-page">
        <div className="activities-view-switch" role="group" aria-label="Vista de actividades">
          <button type="button" className="secondary-action" onClick={() => setView("calendar")} aria-pressed="true">Calendario</button>
          <button type="button" className="secondary-action" onClick={() => setView("list")} aria-pressed="false">Listado</button>
        </div>
        <CalendarPage />
      </div>
    );
  }

  return (
    <div className="activities-page">
      <header className="page-heading activities-heading">
        <div>
          <p className="page-eyebrow">PLANIFICACIÓN</p>
          <h1>Actividades</h1>
          <p className="page-description">{selectedPeriod?.name ?? "Período activo"} · Consulta y administra tus actividades.</p>
        </div>
        <div className="activities-heading-actions">
          <div className="activities-view-switch" role="group" aria-label="Vista de actividades">
            <button className="secondary-action" type="button" onClick={() => setView("calendar")} aria-pressed="false">Calendario</button>
            <button className="secondary-action" type="button" onClick={() => setView("list")} aria-pressed="true">Listado</button>
          </div>
          <button className="state-action" type="button" onClick={openCreateForm} disabled={!selectedPeriodId}>Crear actividad</button>
        </div>
      </header>

      <section className="activities-panel" aria-label="Listado de actividades">
        <div className="activities-list-heading">
          <h2>Actividades del período</h2>
          <span>{isLoading ? "Consultando…" : `${activities.length} actividades`}</span>
        </div>

        <div className="activity-filters" aria-label="Filtros del listado">
          <label>
            <span>Categoría</span>
            <select name="category" value={filters.category} onChange={updateFilter}>
              <option value="">Todas</option>
              {CATEGORIES.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label>
            <span>Prioridad</span>
            <select name="priority" value={filters.priority} onChange={updateFilter}>
              <option value="">Todas</option>
              {PRIORITIES.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label>
            <span>Estado</span>
            <select name="status" value={filters.status} onChange={updateFilter}>
              <option value="">Todos</option>
              {STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label>
            <span>Destino</span>
            <input name="destination" value={filters.destination} onChange={updateFilter}
              placeholder="Filtrar por destino" />
          </label>
          <label>
            <span>Desde</span>
            <input name="start_date" type="date" value={filters.start_date} onChange={updateFilter} />
          </label>
          <label>
            <span>Hasta</span>
            <input name="end_date" type="date" value={filters.end_date} onChange={updateFilter} />
          </label>
          {hasFilters && <button className="text-action activity-clear-filters" type="button"
            onClick={() => setFilters(EMPTY_FILTERS)}>Limpiar filtros</button>}
        </div>

        {hasDateRangeError && (
          <p className="activity-filter-error" role="alert">La fecha inicial del filtro no puede ser posterior a la fecha final.</p>
        )}

        {isLoading ? (
          <LoadingState message="Cargando actividades…" />
        ) : error ? (
          <ErrorState message={error.message} onRetry={loadActivities} />
        ) : activities.length === 0 ? (
          hasFilters ? (
            <EmptyState title="Sin coincidencias" message="No hay actividades que coincidan con los filtros seleccionados."
              actionLabel="Limpiar filtros" onAction={() => setFilters(EMPTY_FILTERS)} />
          ) : (
            <EmptyState title="Aún no hay actividades" message="Este período todavía no tiene actividades planificadas."
              actionLabel="Crear actividad" onAction={openCreateForm} />
          )
        ) : (
          <>
            <div className="activities-table-wrap">
              <table className="activities-table" aria-label="Listado de actividades">
                <thead><tr>
                  <th scope="col">Actividad</th><th scope="col">Fechas</th><th scope="col">Horario</th>
                  <th scope="col">Categoría</th><th scope="col">Prioridad</th><th scope="col">Estado</th>
                </tr></thead>
                <tbody>{activities.map((item) => (
                  <tr key={item.id} data-activity-id={item.id}>
                    <td><button className="activity-name-link" type="button" onClick={() => setSelectedActivityId(item.id)}>{item.name}</button></td>
                    <td>{item.start_date} – {item.end_date}</td>
                    <td>{item.start_time}–{item.end_time}</td>
                    <td>{item.category}</td><td>{item.priority}</td>
                    <td><span className={`activity-status activity-status-${String(item.status).toLowerCase().replaceAll(" ", "-")}`}>{item.status}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <ul className="activities-cards">
              {activities.map((item) => (
                <li className="activity-card" key={item.id} data-activity-id={item.id}>
                  <button className="activity-card-title" type="button" onClick={() => setSelectedActivityId(item.id)}>{item.name}</button>
                  <dl>
                    <div><dt>Fechas</dt><dd>{item.start_date} – {item.end_date}</dd></div>
                    <div><dt>Horario</dt><dd>{item.start_time}–{item.end_time}</dd></div>
                    <div><dt>Categoría</dt><dd>{item.category}</dd></div>
                    <div><dt>Prioridad</dt><dd>{item.priority}</dd></div>
                    <div><dt>Estado</dt><dd>{item.status}</dd></div>
                  </dl>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <ActivityFormDialog open={isFormOpen} activity={editingActivity} period={selectedPeriod}
        onClose={() => { setIsFormOpen(false); setEditingActivity(null); }} onSaved={handleSaved} />
      <ActivityDetailDialog open={Boolean(selectedActivityId)} activity={selectedActivity}
        isLoading={isDetailLoading} error={detailError} onRetry={retryActivityDetail}
        onClose={closeActivityDetail} onEdit={openEditForm} />
    </div>
  );
}

export default ActivitiesPage;
