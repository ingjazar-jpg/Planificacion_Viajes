import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "../../components/common/AsyncState.jsx";
import { usePeriod } from "../../context/PeriodContext.jsx";
import { getCalendar } from "../../services/api/calendarService.js";

const CATEGORIES = [
  "Viajes", "Transporte", "Alojamiento", "Recreación",
  "Turismo", "Reuniones familiares", "Otros",
];
const PRIORITIES = ["Alta", "Media", "Baja"];
const STATUSES = ["Pendiente", "En progreso", "Completada", "Cancelada"];
const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function parseLocalDate(value) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, amount) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() + amount);
  return result;
}

function startOfWeek(date) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const mondayOffset = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - mondayOffset);
  return result;
}

function getVisibleRange(date) {
  const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const lastOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const start = startOfWeek(firstOfMonth);
  const end = addDays(startOfWeek(lastOfMonth), 6);
  return { start_date: toDateKey(start), end_date: toDateKey(end), days: buildDays(start, end) };
}

function buildDays(start, end) {
  const days = [];
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
    days.push(cursor);
  }
  return days;
}

function getInitialDate(period) {
  const today = new Date();
  const todayKey = toDateKey(today);
  if (period?.start_date && period?.end_date
    && todayKey >= period.start_date && todayKey <= period.end_date) {
    return new Date(today.getFullYear(), today.getMonth(), 1);
  }
  const start = parseLocalDate(period?.start_date);
  return start ? new Date(start.getFullYear(), start.getMonth(), 1) : new Date(today.getFullYear(), today.getMonth(), 1);
}

function formatMonth(date) {
  const value = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric" }).format(date);
  return value.charAt(0).toLocaleUpperCase("es-CO") + value.slice(1);
}

function formatLongDate(date) {
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(date);
}

function getActivityStatusClass(status) {
  return `calendar-status-${String(status || "").toLowerCase().replaceAll(" ", "-")}`;
}

function CalendarActivity({ activity, dayKey, onSelect }) {
  const startsToday = activity.start_date === dayKey;
  const endsToday = activity.end_date === dayKey;
  const timeLabel = startsToday
    ? activity.start_time
    : endsToday ? activity.end_time : "Continúa";

  return (
    <button
      type="button"
      className={`calendar-event ${getActivityStatusClass(activity.status)}`}
      aria-label={`${activity.name}, ${activity.status}, ${dayKey}`}
      title={`${activity.name} · ${activity.status} · ${activity.priority}`}
      onClick={() => onSelect(activity)}
    >
      <span className="calendar-event-name">{activity.name}</span>
      <span className="calendar-event-meta">{timeLabel} · {activity.priority}</span>
    </button>
  );
}

function ActivityDetail({ activity, onClose }) {
  return (
    <section className="calendar-activity-detail" role="region" aria-label="Detalle de actividad">
      <div className="calendar-detail-heading">
        <div>
          <p className="eyebrow">DETALLE DE ACTIVIDAD</p>
          <h3>{activity.name}</h3>
        </div>
        <button className="secondary-action" type="button" onClick={onClose}>Cerrar detalle</button>
      </div>
      {activity.description && <p>{activity.description}</p>}
      <dl className="calendar-detail-list">
        <div><dt>Fechas</dt><dd>{activity.start_date} – {activity.end_date}</dd></div>
        <div><dt>Horario</dt><dd>{activity.start_time}–{activity.end_time}</dd></div>
        <div><dt>Categoría</dt><dd>{activity.category}</dd></div>
        <div><dt>Prioridad</dt><dd>{activity.priority}</dd></div>
        <div><dt>Estado</dt><dd>{activity.status}</dd></div>
        {activity.destination && <div><dt>Destino</dt><dd>{activity.destination}</dd></div>}
        {activity.is_overdue && <div><dt>Vencimiento</dt><dd>Actividad vencida</dd></div>}
      </dl>
    </section>
  );
}

function CalendarPage() {
  const { selectedPeriodId, selectedPeriod } = usePeriod();
  const [visibleDate, setVisibleDate] = useState(() => new Date());
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");
  const [status, setStatus] = useState("");
  const [activities, setActivities] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const requestSequence = useRef(0);

  useEffect(() => {
    setVisibleDate(getInitialDate(selectedPeriod));
    setSelectedDate(null);
    setSelectedActivity(null);
    setActivities([]);
  }, [selectedPeriodId, selectedPeriod?.start_date, selectedPeriod?.end_date]);

  const range = useMemo(() => getVisibleRange(visibleDate), [visibleDate]);

  const loadCalendar = useCallback(async () => {
    const requestId = ++requestSequence.current;
    if (!selectedPeriodId) {
      setActivities([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setActivities([]);
    try {
      const result = await getCalendar({
        period_id: selectedPeriodId,
        start_date: range.start_date,
        end_date: range.end_date,
        category,
        priority,
        status,
      });
      if (requestId === requestSequence.current) setActivities(result);
    } catch (requestError) {
      if (requestId === requestSequence.current) {
        setActivities([]);
        setError(requestError);
      }
    } finally {
      if (requestId === requestSequence.current) setIsLoading(false);
    }
  }, [selectedPeriodId, range.start_date, range.end_date, category, priority, status]);

  useEffect(() => {
    loadCalendar();
    return () => { requestSequence.current += 1; };
  }, [loadCalendar]);

  const goToMonth = (offset) => {
    setVisibleDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
    setSelectedDate(null);
    setSelectedActivity(null);
  };

  const goToToday = () => {
    setVisibleDate(getInitialDate(selectedPeriod));
    setSelectedDate(null);
    setSelectedActivity(null);
  };

  const clearFilters = () => {
    setCategory("");
    setPriority("");
    setStatus("");
  };

  const selectActivity = (activity) => {
    setSelectedDate(activity.start_date);
    setSelectedActivity(activity);
  };

  const activitiesForDate = useMemo(() => {
    if (!selectedDate) return [];
    return activities.filter((activity) => activity.start_date <= selectedDate
      && activity.end_date >= selectedDate);
  }, [activities, selectedDate]);

  const monthDays = range.days;
  const hasFilters = Boolean(category || priority || status);

  if (!selectedPeriodId || !selectedPeriod) {
    return <EmptyState title="Selecciona un período" message="Elige un período para consultar su calendario." />;
  }

  return (
    <div className="calendar-page">
      <header className="page-header">
        <div>
          <p className="page-eyebrow">PLANIFICACIÓN</p>
          <h1>Calendario</h1>
          <p className="page-description">{selectedPeriod.name} · Consulta mensual de actividades.</p>
        </div>
      </header>

      <section className="calendar-panel" aria-label="Calendario de actividades">
        <div className="calendar-toolbar">
          <div className="calendar-month-navigation">
            <button className="secondary-action" type="button" aria-label="Mes anterior" onClick={() => goToMonth(-1)}>‹</button>
            <h2>{formatMonth(visibleDate)}</h2>
            <button className="secondary-action" type="button" aria-label="Mes siguiente" onClick={() => goToMonth(1)}>›</button>
            <button className="secondary-action calendar-today-button" type="button" onClick={goToToday}>Hoy</button>
          </div>
          <p className="calendar-period-label">{selectedPeriod.name}</p>
        </div>

        <div className="calendar-filters" aria-label="Filtros del calendario">
          <label>
            <span>Categoría</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">Todas</option>
              {CATEGORIES.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label>
            <span>Prioridad</span>
            <select value={priority} onChange={(event) => setPriority(event.target.value)}>
              <option value="">Todas</option>
              {PRIORITIES.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label>
            <span>Estado</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">Todos</option>
              {STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          {hasFilters && <button className="text-action calendar-clear-filters" type="button" onClick={clearFilters}>Limpiar filtros</button>}
        </div>
        <p className="calendar-filter-note">Las actividades canceladas se incluyen por defecto.</p>

        {isLoading ? (
          <LoadingState message="Cargando actividades del calendario…" />
        ) : error ? (
          <ErrorState message={error.message} onRetry={loadCalendar} />
        ) : (
          <>
            <div className="calendar-grid" role="grid" aria-label="Calendario mensual">
              <div className="calendar-weekdays" role="row">
                {WEEKDAYS.map((day) => <div role="columnheader" key={day}>{day}</div>)}
              </div>
              {Array.from({ length: Math.ceil(monthDays.length / 7) }, (_, weekIndex) => (
                <div className="calendar-week" role="row" key={weekIndex}>
                  {monthDays.slice(weekIndex * 7, weekIndex * 7 + 7).map((day) => {
                    const dayKey = toDateKey(day);
                    const dayActivities = activities.filter((activity) => (
                      activity.start_date <= dayKey && activity.end_date >= dayKey
                    ));
                    const isCurrentMonth = day.getMonth() === visibleDate.getMonth();
                    const isToday = dayKey === toDateKey(new Date());
                    const isSelected = selectedDate === dayKey;
                    return (
                      <div
                        className={`calendar-day ${isCurrentMonth ? "" : "calendar-day-outside"} ${isSelected ? "calendar-day-selected" : ""}`}
                        role="gridcell"
                        key={dayKey}
                        aria-label={formatLongDate(day)}
                      >
                        <button
                          type="button"
                          className={`calendar-day-number ${isToday ? "calendar-day-today" : ""}`}
                          aria-label={`Seleccionar ${formatLongDate(day)}`}
                          aria-current={isToday ? "date" : undefined}
                          aria-pressed={isSelected}
                          onClick={() => { setSelectedDate(dayKey); setSelectedActivity(null); }}
                        >
                          {day.getDate()}
                        </button>
                        <div className="calendar-day-events">
                          {dayActivities.map((activity) => (
                            <CalendarActivity
                              key={activity.id}
                              activity={activity}
                              dayKey={dayKey}
                              onSelect={selectActivity}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {activities.length === 0 && !hasFilters && (
              <p className="calendar-empty-note" role="status">No hay actividades para este mes</p>
            )}
            {activities.length === 0 && hasFilters && (
              <p className="calendar-empty-note" role="status">No hay actividades que coincidan con los filtros. Puedes limpiar los filtros para ver todas.</p>
            )}
            {selectedDate && (
              <section className="calendar-day-agenda" role="region" aria-label={`Actividades del ${formatLongDate(parseLocalDate(selectedDate))}`}>
                <div className="calendar-agenda-heading">
                  <h3>{formatLongDate(parseLocalDate(selectedDate))}</h3>
                  <button className="text-action" type="button" onClick={() => setSelectedDate(null)}>Cerrar día</button>
                </div>
                {activitiesForDate.length === 0 ? (
                  <p>No hay actividades programadas para este día.</p>
                ) : (
                  <ul>
                    {activitiesForDate.map((activity) => (
                      <li key={activity.id}>
                        <button className="calendar-agenda-item" type="button" onClick={() => setSelectedActivity(activity)}>
                          <strong>{activity.name}</strong>
                          <span>{activity.start_time}–{activity.end_time} · {activity.status} · {activity.priority}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
            {selectedActivity && <ActivityDetail activity={selectedActivity} onClose={() => setSelectedActivity(null)} />}
          </>
        )}
      </section>
    </div>
  );
}

export default CalendarPage;
