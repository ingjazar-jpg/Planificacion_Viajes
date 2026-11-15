export function LoadingState({ message = "Cargando información…" }) {
  return <p className="async-state" role="status">{message}</p>;
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="async-state async-state-error" role="alert">
      <p>{message || "Ocurrió un error al cargar la información."}</p>
      {onRetry && (
        <button className="state-action" type="button" onClick={onRetry}>
          Reintentar
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, message, actionLabel, onAction }) {
  return (
    <div className="async-state" role="status">
      <strong>{title}</strong>
      <p>{message}</p>
      {actionLabel && onAction && (
        <button className="state-action" type="button" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
