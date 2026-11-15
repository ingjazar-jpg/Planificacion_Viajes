import { useEffect, useMemo, useRef } from "react";

const GROUPS = [
  { type: "Vencida", title: "Vencidas" },
  { type: "Próxima", title: "Próximas" },
  { type: "Prioridad alta", title: "Prioridad alta" },
];

function compareStart(a, b) {
  const left = `${a.activity?.start_date || ""}T${a.activity?.start_time || ""}`;
  const right = `${b.activity?.start_date || ""}T${b.activity?.start_time || ""}`;
  return left.localeCompare(right);
}

export function AlertsDrawer({
  open, onClose, alerts, isLoading, error, notice, noticeIsError = false, isReviewing,
  onRetry, onReview, onNavigate,
}) {
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const openerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    openerRef.current = document.activeElement;
    closeRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab" && panelRef.current) {
        const nodes = [...panelRef.current.querySelectorAll("button:not(:disabled), [href], [tabindex]:not([tabindex='-1'])")];
        if (!nodes.length) return;
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      openerRef.current?.focus?.();
    };
  }, [open, onClose]);

  const grouped = useMemo(() => GROUPS.map((group) => ({
    ...group,
    items: alerts.filter((alert) => alert.type === group.type).sort(compareStart),
  })).filter((group) => group.items.length), [alerts]);

  if (!open) return null;
  return (
    <div className="alerts-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <aside className="alerts-drawer" role="dialog" aria-modal="true"
        aria-labelledby="alerts-title" ref={panelRef}>
        <header className="alerts-drawer-header">
          <div><p className="eyebrow">CENTRO DE NOTIFICACIONES</p><h2 id="alerts-title">Alertas pendientes</h2></div>
          <button ref={closeRef} className="icon-button" type="button" onClick={onClose} aria-label="Cerrar alertas">✕</button>
        </header>
        {notice && <p className={noticeIsError ? "alert-notice alert-notice-error" : "alert-notice"} role={noticeIsError ? "alert" : "status"}>{notice}</p>}
        {isLoading ? <p role="status" className="drawer-state">Actualizando alertas…</p> : null}
        {error ? <div className="drawer-error" role="alert">
          <p>{error.message || "No fue posible actualizar las alertas."}</p>
          <button className="state-action" type="button" onClick={onRetry}>Reintentar</button>
        </div> : null}
        {!isLoading && !error && alerts.length === 0 ? (
          <div className="drawer-empty" role="status">
            <span aria-hidden="true">✓</span><h3>No tienes alertas pendientes</h3>
            <p>Las actividades de este período están al día</p>
          </div>
        ) : null}
        {!isLoading && !error && grouped.map((group) => (
          <section className="alert-group" key={group.type}>
            <h3>{group.title}<span>{group.items.length}</span></h3>
            {group.items.map((alert) => (
              <article className="alert-item" key={alert.id}>
                <div className="alert-item-main">
                  <strong>{alert.activity?.name || "Actividad sin nombre"}</strong>
                  <p>{alert.activity?.start_date || "Fecha no disponible"} · {alert.activity?.start_time || "--:--"}</p>
                  <p>Prioridad: {alert.activity?.priority || "No definida"} · Estado: {alert.activity?.status || "No disponible"}</p>
                </div>
                <div className="alert-item-actions">
                  <button type="button" className="text-action" onClick={() => onNavigate(alert.activity_id)}>Ver actividad</button>
                  <button type="button" className="state-action" disabled={isReviewing.includes(alert.id)}
                    onClick={() => onReview(alert.id)}>
                    {isReviewing.includes(alert.id) ? "Guardando…" : "Marcar revisada"}
                  </button>
                </div>
              </article>
            ))}
          </section>
        ))}
      </aside>
    </div>
  );
}
