import { useCallback, useEffect, useRef, useState } from "react";
import { EmptyState } from "../../components/common/AsyncState.jsx";
import { usePeriod } from "../../context/PeriodContext.jsx";
import { getBudgetComparison } from "../../services/api/reportsService.js";

function sortPeriods(periods) {
  return [...periods].sort((a, b) => {
    const yearDifference = Number(b.year) - Number(a.year);
    if (yearDifference !== 0) return yearDifference;
    return String(b.start_date || "").localeCompare(String(a.start_date || ""));
  });
}

function chooseInitialPeriods(periods, currentFirst, currentSecond) {
  const firstAvailable = periods.some((period) => period.id === currentFirst);
  const secondAvailable = periods.some((period) => period.id === currentSecond);

  if (firstAvailable && secondAvailable && currentFirst !== currentSecond) {
    return [currentFirst, currentSecond];
  }
  if (firstAvailable) {
    return [currentFirst, periods.find((period) => period.id !== currentFirst)?.id || ""];
  }
  if (secondAvailable) {
    return [periods.find((period) => period.id !== currentSecond)?.id || "", currentSecond];
  }
  return [periods[0]?.id || "", periods.find((period) => period.id !== periods[0]?.id)?.id || ""];
}

function formatMoney(value) {
  return value == null ? "—" : `COP ${value}`;
}

function ComparisonSkeletons() {
  return (
    <div className="reports-comparison-skeletons" aria-label="Cargando indicadores comparativos" aria-busy="true">
      {["Presupuesto general", "Total de gastos", "Saldo disponible", "Ejecución"].map((label) => (
        <article className="reports-comparison-skeleton" key={label}>
          <span>{label}</span>
          <div />
          <div />
        </article>
      ))}
    </div>
  );
}

function ComparisonResults({ data }) {
  if (!data?.period_1 || !data?.period_2) {
    return <EmptyState title="Comparación no disponible" message="La API no devolvió los datos completos de ambos períodos." />;
  }

  const first = data.period_1;
  const second = data.period_2;
  const indicators = [
    { key: "total_budget", label: "Presupuesto general", format: formatMoney },
    { key: "total_expenses", label: "Total de gastos", format: formatMoney },
    { key: "balance", label: "Saldo disponible", format: formatMoney },
    { key: "execution_percentage", label: "Ejecución", format: (value) => value == null ? "—" : `${value}%` },
  ];

  return (
    <>
      <div className="reports-comparison-metrics">
        {indicators.map((indicator) => (
          <article className="reports-comparison-metric" key={indicator.key}>
            <h3>{indicator.label}</h3>
            <div className="reports-comparison-metric-values">
              <div><span>{first.name}</span><strong>{indicator.format(first[indicator.key])}</strong></div>
              <div><span>{second.name}</span><strong>{indicator.format(second[indicator.key])}</strong></div>
            </div>
          </article>
        ))}
      </div>
      <section className="reports-section">
        <h3>Comparación lado a lado</h3>
        <div className="reports-table-wrap reports-comparison-table-wrap">
          <table className="reports-table reports-comparison-table">
            <thead>
              <tr><th>Indicador</th><th>{first.name} ({first.year})</th><th>{second.name} ({second.year})</th></tr>
            </thead>
            <tbody>
              {indicators.map((indicator) => (
                <tr key={indicator.key}>
                  <th scope="row">{indicator.label}</th>
                  <td>{indicator.format(first[indicator.key])}</td>
                  <td>{indicator.format(second[indicator.key])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {first.total_budget === "0.00" && <p className="reports-note">{first.name}: este período no tiene presupuesto registrado.</p>}
        {second.total_budget === "0.00" && <p className="reports-note">{second.name}: este período no tiene presupuesto registrado.</p>}
      </section>
    </>
  );
}

export default function HistoricalComparison({ isActive }) {
  const { refreshPeriods } = usePeriod();
  const [periods, setPeriods] = useState([]);
  const [periodsLoading, setPeriodsLoading] = useState(true);
  const [periodsError, setPeriodsError] = useState(null);
  const [firstPeriodId, setFirstPeriodId] = useState("");
  const [secondPeriodId, setSecondPeriodId] = useState("");
  const [comparison, setComparison] = useState(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState(null);
  const [retryComparison, setRetryComparison] = useState(0);
  const periodsRequestId = useRef(0);
  const comparisonRequestId = useRef(0);

  const loadPeriods = useCallback(async () => {
    const requestId = ++periodsRequestId.current;
    setPeriodsLoading(true);
    setPeriodsError(null);
    setComparison(null);
    setComparisonError(null);
    try {
      const result = await refreshPeriods();
      if (requestId !== periodsRequestId.current) return;
      if (!Array.isArray(result)) throw new Error("No fue posible consultar los períodos disponibles.");
      const sorted = sortPeriods(result);
      setPeriods(sorted);
      const [nextFirst, nextSecond] = chooseInitialPeriods(sorted, firstPeriodId, secondPeriodId);
      setFirstPeriodId(nextFirst);
      setSecondPeriodId(nextSecond);
    } catch (error) {
      if (requestId !== periodsRequestId.current) return;
      setPeriodsError(error);
    } finally {
      if (requestId === periodsRequestId.current) setPeriodsLoading(false);
    }
  }, [refreshPeriods, firstPeriodId, secondPeriodId]);

  useEffect(() => {
    if (isActive) loadPeriods();
    return () => { periodsRequestId.current += 1; };
  }, [isActive, loadPeriods]);

  useEffect(() => {
    if (!isActive || periodsLoading || periodsError || periods.length < 2 ||
      !firstPeriodId || !secondPeriodId || firstPeriodId === secondPeriodId) return undefined;

    const requestId = ++comparisonRequestId.current;
    const controller = new AbortController();
    setComparison(null);
    setComparisonError(null);
    setComparisonLoading(true);

    getBudgetComparison(firstPeriodId, secondPeriodId, { signal: controller.signal })
      .then((response) => {
        if (requestId === comparisonRequestId.current) setComparison(response?.data || null);
      })
      .catch((error) => {
        if (requestId === comparisonRequestId.current && error?.name !== "AbortError") {
          setComparisonError(error);
        }
      })
      .finally(() => {
        if (requestId === comparisonRequestId.current) setComparisonLoading(false);
      });

    return () => {
      controller.abort();
      comparisonRequestId.current += 1;
    };
  }, [isActive, periodsLoading, periodsError, periods.length, firstPeriodId, secondPeriodId, retryComparison]);

  function retry() {
    setComparisonError(null);
    setRetryComparison((value) => value + 1);
  }

  const canCompare = periods.length >= 2 && firstPeriodId && secondPeriodId && firstPeriodId !== secondPeriodId;
  const firstOptions = periods.filter((period) => period.id !== secondPeriodId || period.id === firstPeriodId);
  const secondOptions = periods.filter((period) => period.id !== firstPeriodId || period.id === secondPeriodId);

  return (
    <div className="reports-comparison" hidden={!isActive}>
      <header className="reports-section-heading">
        <div><h2>Comparación histórica</h2><p>Compara los resultados presupuestarios de dos períodos.</p></div>
      </header>
      <section className="reports-comparison-selectors" aria-label="Selección de períodos para comparar">
        <label>Primer período
          <select value={firstPeriodId} disabled={periodsLoading || Boolean(periodsError) || periods.length < 2}
            onChange={(event) => { setFirstPeriodId(event.target.value); setComparison(null); }}>
            {firstOptions.map((period) => <option key={period.id} value={period.id}>{period.name} ({period.year})</option>)}
          </select>
        </label>
        <label>Segundo período
          <select value={secondPeriodId} disabled={periodsLoading || Boolean(periodsError) || periods.length < 2}
            onChange={(event) => { setSecondPeriodId(event.target.value); setComparison(null); }}>
            {secondOptions.map((period) => <option key={period.id} value={period.id}>{period.name} ({period.year})</option>)}
          </select>
        </label>
      </section>

      {periodsLoading ? (
        <div className="reports-comparison-period-skeleton" aria-live="polite">Cargando períodos disponibles…</div>
      ) : periodsError ? (
        <div className="reports-comparison-error" role="alert">
          <p>No fue posible cargar los períodos disponibles.</p>
          <button type="button" onClick={loadPeriods}>Reintentar</button>
        </div>
      ) : periods.length < 2 ? (
        <EmptyState title="Períodos insuficientes" message="Se necesitan al menos dos períodos disponibles para realizar una comparación." />
      ) : comparisonLoading ? (
        <ComparisonSkeletons />
      ) : comparisonError ? (
        <div className="reports-comparison-error" role="alert">
          <p>No fue posible generar la comparación. Tus períodos seleccionados se conservaron.</p>
          <button type="button" onClick={retry}>Reintentar comparación</button>
        </div>
      ) : canCompare ? (
        <ComparisonResults data={comparison} />
      ) : (
        <EmptyState title="Selecciona dos períodos" message="Elige dos períodos diferentes para comparar sus resultados." />
      )}
    </div>
  );
}
