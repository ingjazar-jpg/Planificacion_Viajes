import { useMemo } from "react";

const STATUS_LABELS = ["Pendiente", "En progreso", "Completada", "Cancelada"];
const STATUS_COLORS = ["#d9a441", "#477da8", "#2e8b68", "#8a929e"];
const money = (value) => Number(value || 0);
const cop = (value) => new Intl.NumberFormat("es-CO", {
  style: "currency", currency: "COP", maximumFractionDigits: 0,
}).format(money(value));

function ChartCard({ title, children, description }) {
  return (
    <section className="dashboard-card chart-card" aria-label={title}>
      <h3>{title}</h3>
      {description && <p className="chart-description">{description}</p>}
      {children}
    </section>
  );
}

export function ActivityStatusChart({ data = [] }) {
  const total = data.reduce((sum, item) => sum + Number(item.count || 0), 0);
  const segments = useMemo(() => {
    let offset = 0;
    return STATUS_LABELS.map((status, index) => {
      const value = Number(data.find((item) => item.status === status)?.count || 0);
      const segment = { status, value, offset, color: STATUS_COLORS[index] };
      offset += total ? (value / total) * 100 : 0;
      return segment;
    }).filter((item) => item.value > 0);
  }, [data, total]);

  return (
    <ChartCard title="Actividades por estado" description="Distribución de actividades del período.">
      {total === 0 ? <p className="chart-empty">No hay actividades registradas en este período.</p> : (
        <div className="donut-layout">
          <svg viewBox="0 0 120 120" role="img" aria-label={segments.map((s) => `${s.status}: ${s.value}`).join(", ")}>
            <circle cx="60" cy="60" r="44" fill="none" stroke="#e8edf2" strokeWidth="16" />
            {segments.map((item) => (
              <circle key={item.status} cx="60" cy="60" r="44" fill="none"
                stroke={item.color} strokeWidth="16" pathLength="100"
                strokeDasharray={`${(item.value / total) * 100} 100`}
                strokeDashoffset={-item.offset} transform="rotate(-90 60 60)" />
            ))}
            <text x="60" y="57" textAnchor="middle" className="donut-total">{total}</text>
            <text x="60" y="72" textAnchor="middle" className="donut-caption">actividades</text>
          </svg>
          <ul className="chart-legend">
            {STATUS_LABELS.map((status, index) => {
              const value = Number(data.find((item) => item.status === status)?.count || 0);
              return <li key={status}><span className="legend-dot" style={{ background: STATUS_COLORS[index] }} />
                <span>{status}</span><strong>{value}</strong></li>;
            })}
          </ul>
        </div>
      )}
    </ChartCard>
  );
}

function HorizontalBars({ rows, keys, labels }) {
  const max = Math.max(1, ...rows.flatMap((row) => keys.map((key) => money(row[key]))));
  return (
    <div className="horizontal-bars">
      {rows.length === 0 ? <p className="chart-empty">No hay datos para este período.</p> : rows.map((row) => (
        <div className="bar-row" key={row.category}>
          <span className="bar-category">{row.category}</span>
          <div className="bar-series">
            {keys.map((key, index) => <div className="bar-track" key={key}>
              <div className={`bar-fill bar-series-${index}`} style={{ width: `${(money(row[key]) / max) * 100}%` }} />
              <span>{cop(row[key])}</span>
            </div>)}
          </div>
        </div>
      ))}
      <div className="bar-legend">{labels.map((label, index) => <span key={label}>
        <i className={`legend-dot bar-series-${index}`} />{label}</span>)}</div>
    </div>
  );
}

export function BudgetComparisonChart({ data = [] }) {
  return <ChartCard title="Presupuesto vs. gastos por categoría">
    <HorizontalBars rows={data} keys={["budget", "expenses"]} labels={["Presupuesto", "Gastos"]} />
  </ChartCard>;
}

export function ExpenseCategoryChart({ data = [] }) {
  return <ChartCard title="Gastos por categoría">
    <HorizontalBars rows={data} keys={["expenses"]} labels={["Gastos"]} />
  </ChartCard>;
}

export function ComplianceIndicator({ value = "0.00" }) {
  const percentage = Math.max(0, Math.min(100, money(value)));
  const circumference = 2 * Math.PI * 43;
  return <ChartCard title="Cumplimiento de actividades">
    <div className="compliance-wrap">
      <svg viewBox="0 0 110 110" role="img" aria-label={`Cumplimiento: ${value} por ciento`}>
        <circle cx="55" cy="55" r="43" fill="none" stroke="#e8edf2" strokeWidth="10" />
        <circle cx="55" cy="55" r="43" fill="none" stroke="#2e6b5b" strokeWidth="10"
          strokeLinecap="round" strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - percentage / 100)}
          transform="rotate(-90 55 55)" />
        <text x="55" y="60" textAnchor="middle" className="compliance-value">{percentage.toFixed(2)}%</text>
      </svg>
      <p>Actividades completadas sobre las actividades no canceladas.</p>
    </div>
  </ChartCard>;
}
