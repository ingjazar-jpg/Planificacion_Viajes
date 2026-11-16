import { useEffect, useRef } from "react";
import { ErrorState, LoadingState } from "../../components/common/AsyncState.jsx";

function ActivityDetailDialog({ open, activity, isLoading, error, onClose, onRetry, onEdit }) {
  const closeRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    previousFocusRef.current = document.activeElement;
    closeRef.current?.focus();
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
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
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="activity-dialog-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="activity-dialog" role="dialog" aria-modal="true"
        aria-labelledby="activity-detail-title">
        <header className="activity-dialog-header">
          <div>
            <p className="page-eyebrow">DETALLE DE ACTIVIDAD</p>
            <h2 id="activity-detail-title">{activity?.name || "Actividad"}</h2>
          </div>
          <button ref={closeRef} className="icon-button" type="button"
            aria-label="Cerrar detalle de actividad" onClick={onClose}>×</button>
        </header>
        {isLoading ? <LoadingState message="Consultando actividad…" /> : null}
        {error ? <ErrorState message={error.message} onRetry={onRetry} /> : null}
        {!isLoading && !error && activity ? (
          <>
            {activity.description && <p className="activity-detail-description">{activity.description}</p>}
            <dl className="activity-detail-grid">
              <div><dt>Fechas</dt><dd>{activity.start_date} – {activity.end_date}</dd></div>
              <div><dt>Horario</dt><dd>{activity.start_time} – {activity.end_time}</dd></div>
              <div><dt>Categoría</dt><dd>{activity.category}</dd></div>
              <div><dt>Prioridad</dt><dd>{activity.priority}</dd></div>
              <div><dt>Estado</dt><dd>{activity.status}</dd></div>
              <div><dt>Destino</dt><dd>{activity.destination || "No especificado"}</dd></div>
              {activity.is_overdue && <div><dt>Vencimiento</dt><dd>Actividad vencida</dd></div>}
            </dl>
            <footer className="activity-dialog-footer">
              <button className="secondary-action" type="button" onClick={onClose}>Cerrar</button>
              <button className="state-action" type="button" onClick={() => onEdit(activity)}>Editar actividad</button>
            </footer>
          </>
        ) : null}
      </section>
    </div>
  );
}

export default ActivityDetailDialog;
