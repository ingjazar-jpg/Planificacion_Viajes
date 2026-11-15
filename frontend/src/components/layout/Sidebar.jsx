import { navigationItems } from "../../config/navigation.js";

function Sidebar({ activeSection, onNavigate }) {
  return (
    <aside className="sidebar" aria-label="Navegación principal">
      <div className="sidebar-brand">
        <span className="brand-mark" aria-hidden="true">VD</span>
        <div>
          <p className="brand-title">Vacaciones</p>
          <p className="brand-subtitle">Planificación decembrina</p>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Navegación principal">
        <p className="navigation-caption">MENÚ PRINCIPAL</p>
        {navigationItems.map((item) => (
          <button
            className={`navigation-link ${activeSection === item.id ? "is-active" : ""}`}
            type="button"
            key={item.id}
            aria-current={activeSection === item.id ? "page" : undefined}
            onClick={() => onNavigate(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <p className="sidebar-footer">Aplicación local</p>
    </aside>
  );
}

export default Sidebar;
