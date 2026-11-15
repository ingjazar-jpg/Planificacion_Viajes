import { usePeriod } from "../../context/PeriodContext.jsx";

function Topbar({ onMenuClick, onAlertsClick, alertCount = 0 }) {
  const { periods, selectedPeriodId, isLoading, error, selectPeriod } = usePeriod();
  let placeholder = "Selecciona un período";
  if (isLoading) placeholder = "Cargando períodos…";
  else if (error) placeholder = "No disponible";
  else if (periods.length === 0) placeholder = "No hay períodos";

  return (
    <header className="topbar">
      <button className="menu-toggle" type="button" aria-label="Abrir menú de navegación" onClick={onMenuClick}>
        <span aria-hidden="true">☰</span>
      </button>
      <div className="topbar-context">
        <label htmlFor="period-selector">Período</label>
        <select id="period-selector" aria-label="Período activo" value={selectedPeriodId || ""}
          disabled={isLoading || Boolean(error) || periods.length === 0}
          onChange={(event) => selectPeriod(event.target.value)}>
          <option value="">{placeholder}</option>
          {periods.map((period) => <option key={period.id} value={period.id}>{period.name} ({period.year})</option>)}
        </select>
      </div>
      <div className="topbar-actions">
        <button className="alerts-button" type="button" onClick={onAlertsClick}
          aria-label={`Abrir alertas: ${alertCount} pendientes`} aria-haspopup="dialog">
          <span aria-hidden="true">🔔</span><span>Alertas</span>
          {alertCount > 0 && <span className="alert-count" aria-label={`${alertCount} pendientes`}>{alertCount > 99 ? "99+" : alertCount}</span>}
        </button>
        <span className="local-indicator"><span className="local-indicator-dot" aria-hidden="true" />Local</span>
      </div>
    </header>
  );
}
export default Topbar;
