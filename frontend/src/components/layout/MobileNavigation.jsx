import { navigationItems } from "../../config/navigation.js";

function MobileNavigation({ activeSection, isOpen, onNavigate, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="mobile-navigation-layer">
      <button
        className="mobile-navigation-backdrop"
        type="button"
        aria-label="Cerrar menú de navegación"
        onClick={onClose}
      />
      <aside
        className="mobile-navigation"
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
      >
        <div className="mobile-navigation-heading">
          <span>Secciones</span>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar menú">
            ×
          </button>
        </div>
        <nav aria-label="Navegación móvil">
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
      </aside>
    </div>
  );
}

export default MobileNavigation;
