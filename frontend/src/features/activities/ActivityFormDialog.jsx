import { useEffect, useRef, useState } from "react";
import { createActivity, updateActivity } from "../../services/api/activitiesService.js";

const CATEGORIES = [
  "Viajes", "Transporte", "Alojamiento", "Recreación",
  "Turismo", "Reuniones familiares", "Otros",
];
const PRIORITIES = ["Alta", "Media", "Baja"];
const EMPTY_FORM = {
  name: "", description: "", category: "", destination: "",
  start_date: "", end_date: "", start_time: "", end_time: "", priority: "Media",
};

function getInitialForm(activity) {
  if (!activity) return EMPTY_FORM;
  return {
    name: activity.name || "",
    description: activity.description || "",
    category: activity.category || "",
    destination: activity.destination || "",
    start_date: activity.start_date || "",
    end_date: activity.end_date || "",
    start_time: activity.start_time || "",
    end_time: activity.end_time || "",
    priority: activity.priority || "Media",
  };
}

function getFieldErrors(error) {
  const result = {};
  for (const detail of error?.details || []) {
    const field = detail?.field || detail?.loc?.at?.(-1);
    if (field && detail?.message) result[field] = detail.message;
  }
  return result;
}

function ActivityFormDialog({ open, activity = null, period, onClose, onSaved }) {
  const [form, setForm] = useState(() => getInitialForm(activity));
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const closeRef = useRef(null);
  const previousFocusRef = useRef(null);
  const savingRef = useRef(false);
  const requestCloseRef = useRef(null);
  const baselineRef = useRef(getInitialForm(activity));
  savingRef.current = isSaving;

  useEffect(() => {
    if (!open) return undefined;
    const initial = getInitialForm(activity);
    baselineRef.current = initial;
    setForm(initial);
    setError("");
    setFieldErrors({});
    setIsSaving(false);
    previousFocusRef.current = document.activeElement;
    closeRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape" && !savingRef.current) requestCloseRef.current?.();
      if (event.key === "Tab") {
        const dialog = document.querySelector(".activity-dialog");
        const focusable = dialog?.querySelectorAll("button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)");
        if (!focusable?.length) return;
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [open, activity]);

  if (!open) return null;

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: "" }));
    setError("");
  }

  function hasUnsavedChanges() {
    return JSON.stringify(form) !== JSON.stringify(baselineRef.current);
  }

  function requestClose() {
    if (isSaving) return;
    if (hasUnsavedChanges() && !window.confirm("Hay cambios sin guardar. ¿Deseas descartarlos?")) return;
    onClose();
  }
  requestCloseRef.current = requestClose;

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setFieldErrors({});
    const nextErrors = {};
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      category: form.category,
      destination: form.destination.trim() || null,
      start_date: form.start_date,
      end_date: form.end_date,
      start_time: form.start_time,
      end_time: form.end_time,
      priority: form.priority,
    };

    if (!payload.name) nextErrors.name = "El nombre es obligatorio.";
    if (!payload.category) nextErrors.category = "Selecciona una categoría.";
    if (!payload.start_date) nextErrors.start_date = "La fecha inicial es obligatoria.";
    if (!payload.end_date) nextErrors.end_date = "La fecha final es obligatoria.";
    if (!payload.start_time) nextErrors.start_time = "La hora inicial es obligatoria.";
    if (!payload.end_time) nextErrors.end_time = "La hora final es obligatoria.";
    if (!payload.priority) nextErrors.priority = "Selecciona una prioridad.";
    if (payload.start_date && payload.end_date && payload.start_date > payload.end_date) {
      nextErrors.end_date = "La fecha final no puede ser anterior a la inicial.";
    }
    if (payload.start_date && payload.end_date === payload.start_date
      && payload.start_time && payload.end_time && payload.end_time <= payload.start_time) {
      nextErrors.end_time = "La hora final debe ser posterior a la inicial cuando las fechas coinciden.";
    }
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      setError("Revisa los campos señalados antes de guardar.");
      return;
    }

    setIsSaving(true);
    try {
      const saved = activity
        ? await updateActivity(activity.id, { ...payload, status: activity.status })
        : await createActivity({ period_id: period.id, ...payload });
      await onSaved(saved);
      onClose();
    } catch (requestError) {
      setFieldErrors(getFieldErrors(requestError));
      setError(requestError.status === 409
        ? requestError.message || "La actividad entra en conflicto con otra actividad o con el período."
        : requestError.message || "No fue posible guardar la actividad.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="activity-dialog-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !isSaving) requestClose();
    }}>
      <section className="activity-dialog" role="dialog" aria-modal="true"
        aria-labelledby="activity-dialog-title" aria-describedby="activity-dialog-description">
        <header className="activity-dialog-header">
          <div>
            <p className="page-eyebrow">PLANIFICACIÓN</p>
            <h2 id="activity-dialog-title">{activity ? "Editar actividad" : "Crear actividad"}</h2>
            <p id="activity-dialog-description">{period?.name || "Período activo"}</p>
          </div>
          <button ref={closeRef} className="icon-button" type="button"
            aria-label="Cerrar formulario de actividad" onClick={requestClose} disabled={isSaving}>×</button>
        </header>

        <form className="activity-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="activity-name">Nombre <span aria-hidden="true">*</span></label>
          <input id="activity-name" name="name" value={form.name} onChange={updateField}
            autoComplete="off" aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? "activity-name-error" : undefined} />
          {fieldErrors.name && <small id="activity-name-error" className="activity-field-error">{fieldErrors.name}</small>}

          <label htmlFor="activity-description">Descripción</label>
          <textarea id="activity-description" name="description" rows="2" value={form.description} onChange={updateField} />

          <div className="activity-form-grid">
            <div>
              <label htmlFor="activity-category">Categoría <span aria-hidden="true">*</span></label>
              <select id="activity-category" name="category" value={form.category} onChange={updateField}
                aria-invalid={Boolean(fieldErrors.category)}>
                <option value="">Selecciona una categoría</option>
                {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              {fieldErrors.category && <small className="activity-field-error">{fieldErrors.category}</small>}
            </div>
            <div>
              <label htmlFor="activity-priority">Prioridad <span aria-hidden="true">*</span></label>
              <select id="activity-priority" name="priority" value={form.priority} onChange={updateField}
                aria-invalid={Boolean(fieldErrors.priority)}>
                {PRIORITIES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              {fieldErrors.priority && <small className="activity-field-error">{fieldErrors.priority}</small>}
            </div>
          </div>

          <label htmlFor="activity-destination">Destino</label>
          <input id="activity-destination" name="destination" value={form.destination} onChange={updateField} />

          <div className="activity-form-grid">
            <div>
              <label htmlFor="activity-start-date">Fecha inicial <span aria-hidden="true">*</span></label>
              <input id="activity-start-date" name="start_date" type="date" value={form.start_date}
                min={period?.start_date} max={period?.end_date} onChange={updateField}
                aria-invalid={Boolean(fieldErrors.start_date)} />
              {fieldErrors.start_date && <small className="activity-field-error">{fieldErrors.start_date}</small>}
            </div>
            <div>
              <label htmlFor="activity-end-date">Fecha final <span aria-hidden="true">*</span></label>
              <input id="activity-end-date" name="end_date" type="date" value={form.end_date}
                min={form.start_date || period?.start_date} max={period?.end_date} onChange={updateField}
                aria-invalid={Boolean(fieldErrors.end_date)} />
              {fieldErrors.end_date && <small className="activity-field-error">{fieldErrors.end_date}</small>}
            </div>
            <div>
              <label htmlFor="activity-start-time">Hora inicial <span aria-hidden="true">*</span></label>
              <input id="activity-start-time" name="start_time" type="time" value={form.start_time}
                onChange={updateField} aria-invalid={Boolean(fieldErrors.start_time)} />
              {fieldErrors.start_time && <small className="activity-field-error">{fieldErrors.start_time}</small>}
            </div>
            <div>
              <label htmlFor="activity-end-time">Hora final <span aria-hidden="true">*</span></label>
              <input id="activity-end-time" name="end_time" type="time" value={form.end_time}
                onChange={updateField} aria-invalid={Boolean(fieldErrors.end_time)} />
              {fieldErrors.end_time && <small className="activity-field-error">{fieldErrors.end_time}</small>}
            </div>
          </div>

          {error && <p className="activity-form-error" role="alert">{error}</p>}
          <footer className="activity-dialog-footer">
            <button className="secondary-action" type="button" onClick={requestClose} disabled={isSaving}>Cancelar</button>
            <button className="state-action" type="submit" disabled={isSaving}>
              {isSaving ? "Guardando…" : "Guardar actividad"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export default ActivityFormDialog;
