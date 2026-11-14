function ModulePlaceholder({ title, description }) {
  return (
    <section className="page-content" aria-labelledby="page-title">
      <header className="page-header">
        <div>
          <p className="page-eyebrow">Planificación personal</p>
          <h1 id="page-title">{title}</h1>
          <p className="page-description">{description}</p>
        </div>
      </header>

      <div className="module-placeholder" role="status">
        <span className="placeholder-mark" aria-hidden="true">···</span>
        <h2>Módulo en preparación</h2>
        <p>
          Esta sección se implementará progresivamente y se conectará con los
          contratos definidos en API-001. No se muestran datos de ejemplo.
        </p>
      </div>
    </section>
  );
}

export default ModulePlaceholder;
