import { useEffect, useRef, useState } from "react";
import { usePeriod } from "../../context/PeriodContext.jsx";
import { createPeriod, updatePeriod } from "../../services/api/periodsService.js";

const EMPTY_FORM = { name: "", start_date: "", end_date: "" };

function PeriodManagementDialog({ open, onClose }) {
  const { periods, selectedPeriodId, refreshPeriods, selectPeriod } = usePeriod();
  const [mode, setMode] = useState("list");
  const [editingPeriod, setEditingPeriod] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const closeButtonRef = useRef(null);
  const previousFocusRef = useRef(null);
  const isSavingRef = useRef(false);
  isSavingRef.current = isSaving;

  useEffect(() => {
    if (!open) return undefined;
    previousFocusRef.current = document.activeElement;
    closeButtonRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape" && !isSavingRef.current) onClose();
      if (event.key === "Tab") {
        const dialog = document.querySelector(".period-dialog");
        const focusable = dialog?.querySelectorAll("button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)");
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first.focus();
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      setMode("list");
      setEditingPeriod(null);
      setForm(EMPTY_FORM);
      setError("");
      setIsSaving(false);
    }
  }, [open]);

  if (!open) return null;

  function startCreate() {
    setEditingPeriod(null);
    setForm(EMPTY_FORM);
    setError("");
    setMode("form");
  }

  function startEdit(period) {
    setEditingPeriod(period);
    setForm({
      name: period.name,
      start_date: period.start_date,
      end_date: period.end_date,
    });
    setError("");
    setMode("form");
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const name = form.name.trim();
    if (!name || !form.start_date || !form.end_date) {
      setError("Completa el nombre y las dos fechas del período.");
      return;
    }
    if (form.start_date > form.end_date) {
      setError("La fecha inicial no puede ser posterior a la fecha final.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = { name, start_date: form.start_date, end_date: form.end_date };
      const savedPeriod = editingPeriod
        ? await updatePeriod(editingPeriod.id, payload)
        : await createPeriod(payload);

      const refreshedPeriods = await refreshPeriods();
      if (!refreshedPeriods) {
        setError("El período se guardó, pero no fue posible actualizar el listado. Reintenta la consulta.");
        return;
      }
      if (!editingPeriod && savedPeriod?.id) selectPeriod(savedPeriod.id);
      onClose();
    } catch (requestError) {
      setError(requestError.message || "No fue posible guardar el período.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="period-dialog-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !isSaving) onClose();
    }}>
      <section className="period-dialog" role="dialog" aria-modal="true"
        aria-labelledby="period-dialog-title" aria-describedby="period-dialog-description">
        <header className="period-dialog-header">
          <div>
            <p className="page-eyebrow">CONFIGURACIÓN DEL PERÍODO</p>
            <h2 id="period-dialog-title">Administrar períodos</h2>
            <p id="period-dialog-description">Crea y actualiza los períodos de planificación.</p>
          </div>
          <button ref={closeButtonRef} className="icon-button" type="button"
            aria-label="Cerrar administración de períodos" onClick={onClose} disabled={isSaving}>×</button>
        </header>

        {mode === "list" ? (
          <>
            <div className="period-list-heading">
              <h3>Períodos registrados</h3>
              <button className="state-action" type="button" onClick={startCreate}>Crear período</button>
            </div>
            {periods.length === 0 ? (
              <p className="period-empty" role="status">Todavía no hay períodos. Crea el primero para comenzar.</p>
            ) : (
              <ul className="period-list">
                {periods.map((period) => (
                  <li key={period.id} className="period-list-item">
                    <div>
                      <strong>{period.name}</strong>
                      <span>{period.year} · {period.start_date} — {period.end_date}</span>
                      {period.id === selectedPeriodId && <span className="period-current">Período activo</span>}
                    </div>
                    <button className="text-action" type="button" onClick={() => startEdit(period)}
                      aria-label={`Editar ${period.name}`}>Editar</button>
                  </li>
                ))}
              </ul>
            )}
            <footer className="period-dialog-footer">
              <button className="secondary-action" type="button" onClick={onClose}>Cerrar</button>
            </footer>
          </>
        ) : (
          <form className="period-form" onSubmit={handleSubmit} noValidate>
            <h3>{editingPeriod ? "Editar período" : "Crear período"}</h3>
            <label htmlFor="period-name">Nombre <span aria-hidden="true">*</span></label>
            <input id="period-name" name="name" value={form.name} onChange={updateField}
              maxLength={120} required autoComplete="off" />
            <div className="period-date-grid">
              <div>
                <label htmlFor="period-start-date">Fecha inicial <span aria-hidden="true">*</span></label>
                <input id="period-start-date" name="start_date" type="date" value={form.start_date}
                  onChange={updateField} required />
              </div>
              <div>
                <label htmlFor="period-end-date">Fecha final <span aria-hidden="true">*</span></label>
                <input id="period-end-date" name="end_date" type="date" value={form.end_date}
                  onChange={updateField} min={form.start_date || undefined} required />
              </div>
            </div>
            {error && <p className="period-form-error" role="alert">{error}</p>}
            <footer className="period-dialog-footer">
              <button className="secondary-action" type="button" onClick={() => {
                setMode("list"); setError("");
              }} disabled={isSaving}>Volver</button>
              <button className="state-action" type="submit" disabled={isSaving}>
                {isSaving ? "Guardando…" : "Guardar período"}
              </button>
            </footer>
          </form>
        )}
      </section>
    </div>
  );
}

export default PeriodManagementDialog;
