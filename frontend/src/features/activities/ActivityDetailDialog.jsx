import { useEffect, useRef } from "react";
import { ErrorState, LoadingState } from "../../components/common/AsyncState.jsx";

function ActivityDetailDialog({
  open, activity, isLoading, error, onClose, onRetry, onEdit,
  onChangeStatus, onDelete, isMutating = false, actionError = "",
}) {
  const closeRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    previousFocusRef.current = document.activeElement;
    closeRef.current?.focus();
    function handleKeyDown(event) {
      if (event.key === "Escape" && !isMutating) onClose();
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
  }, [open, onClose, isMutating]);

  if (!open) return null;

  function requestCancel() {
    if (!activity || isMutating) return;
    if (!window.confirm("¿Deseas cancelar esta actividad? Se conservará en el período con estado Cancelada.")) return;
    onChangeStatus("Cancelada");
  }

  function requestDelete() {
    if (!activity || isMutating) return;
    const confirmed = window.confirm(
      "¿Eliminar definitivamente esta actividad? También se eliminarán todos sus gastos asociados, el historial de modificaciones de esos gastos, las alertas asociadas y el historial de eventos de esas alertas. Esta acción no se puede deshacer.",
    );
    if (confirmed) onDelete();
  }

  const nextStatus = activity?.status === "Pendiente" ? "En progreso"
    : activity?.status === "En progreso" ? "Completada" : null;
  const nextStatusLabel = nextStatus === "En progreso" ? "Iniciar actividad" : "Completar actividad";

  return (
    <div className="activity-dialog-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !isMutating) onClose();
    }}>
      <section className="activity-dialog" role="dialog" aria-modal="true"
        aria-labelledby="activity-detail-title">
        <header className="activity-dialog-header">
          <div>
            <p className="page-eyebrow">DETALLE DE ACTIVIDAD</p>
            <h2 id="activity-detail-title">{activity?.name || "Actividad"}</h2>
          </div>
          <button ref={closeRef} className="icon-button" type="button"
            aria-label="Cerrar detalle de actividad" onClick={onClose} disabled={isMutating}>×</button>
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
            {actionError && <p className="activity-form-error" role="alert">{actionError}</p>}
            <footer className="activity-dialog-footer activity-lifecycle-actions">
              <button className="secondary-action" type="button" onClick={onClose} disabled={isMutating}>Cerrar</button>
              {nextStatus && (
                <button className="state-action" type="button" disabled={isMutating}
                  onClick={() => onChangeStatus(nextStatus)}>
                  {isMutating ? "Actualizando…" : nextStatusLabel}
                </button>
              )}
              {activity.status !== "Cancelada" && (
                <button className="secondary-action" type="button" onClick={requestCancel} disabled={isMutating}>
                  Cancelar actividad
                </button>
              )}
              {activity.status !== "Completada" && activity.status !== "Cancelada" && (
                <button className="secondary-action" type="button" onClick={() => onEdit(activity)} disabled={isMutating}>
                  Editar actividad
                </button>
              )}
              <button className="danger-action" type="button" onClick={requestDelete} disabled={isMutating}>
                Eliminar actividad
              </button>
            </footer>
          </>
        ) : null}
      </section>
    </div>
  );
}

export default ActivityDetailDialog;
