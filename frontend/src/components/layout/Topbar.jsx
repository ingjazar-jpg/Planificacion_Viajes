function Topbar({ onMenuClick }) {
  return (
    <header className="topbar">
      <button
        className="menu-toggle"
        type="button"
        aria-label="Abrir menú de navegación"
        onClick={onMenuClick}
      >
        <span aria-hidden="true">☰</span>
      </button>

      <div className="topbar-context">
        <label htmlFor="period-selector">Período</label>
        <select id="period-selector" disabled defaultValue="">
          <option value="">Disponible al conectar la API</option>
        </select>
      </div>

      <div className="topbar-actions">
        <button
          className="alerts-button"
          type="button"
          disabled
          aria-label="Alertas disponibles al conectar la API"
          title="Las alertas estarán disponibles al conectar la API"
        >
          <span aria-hidden="true">♧</span>
          <span>Alertas</span>
        </button>
        <span className="local-indicator">
          <span className="local-indicator-dot" aria-hidden="true" />
          Local
        </span>
      </div>
    </header>
  );
}

export default Topbar;
