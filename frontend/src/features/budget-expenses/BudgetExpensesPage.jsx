import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "../../components/common/AsyncState.jsx";
import { usePeriod } from "../../context/PeriodContext.jsx";
import { createBudget, getBudget, updateBudget } from "../../services/api/budgetService.js";
import { centsToDecimal, decimalToCents, formatMoneyCOP, getUndistributedCents } from "../../utils/money.js";
import "./BudgetExpensesPage.css";

const CATEGORIES = ["Viajes", "Transporte", "Alojamiento", "Recreación", "Turismo", "Reuniones familiares", "Otros"];
const EMPTY_FORM = { total_budget: "0.00", category_budgets: Object.fromEntries(CATEGORIES.map((item) => [item, "0.00"])) };

function formFromBudget(budget) {
  return {
    total_budget: budget.total_budget,
    category_budgets: Object.fromEntries(CATEGORIES.map((category) => [
      category,
      budget.category_budgets.find((item) => item.category === category)?.allocated_amount
        ?? budget.category_budgets.find((item) => item.category === category)?.amount ?? "0.00",
    ])),
  };
}

function errorMessage(error) {
  if (error?.code === "CATEGORY_BUDGET_EXCEEDS_TOTAL") return "La suma de las asignaciones supera el presupuesto general.";
  return error?.message || "No fue posible completar la operación.";
}

function BudgetExpensesPage() {
  const { selectedPeriodId, selectedPeriod } = usePeriod();
  const [tab, setTab] = useState("budget");
  const [budget, setBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const sequence = useRef(0);
  const snapshot = useRef(EMPTY_FORM);

  const loadBudget = useCallback(async (silent = false) => {
    const id = ++sequence.current;
    if (!selectedPeriodId) {
      setBudget(null); setLoading(false); setRefreshing(false); setError(null); return;
    }
    if (silent && budget) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const result = await getBudget(selectedPeriodId);
      if (id === sequence.current) setBudget(result);
    } catch (requestError) {
      if (id !== sequence.current) return;
      if (requestError?.status === 404 && requestError?.code === "BUDGET_NOT_FOUND") {
        setBudget(null); setError(null);
      } else setError(requestError);
    } finally {
      if (id === sequence.current) { setLoading(false); setRefreshing(false); }
    }
  }, [selectedPeriodId, budget]);

  useEffect(() => {
    setBudget(null); setLoading(true); setEditing(false); setForm(EMPTY_FORM); setError(null);
    loadBudget();
    return () => { sequence.current += 1; };
  }, [selectedPeriodId]);

  const undistributed = useMemo(() => {
    try { return getUndistributedCents(form.total_budget, CATEGORIES.map((c) => form.category_budgets[c])); }
    catch { return null; }
  }, [form]);
  const overAllocated = undistributed !== null && undistributed < 0n;
  const dirty = JSON.stringify(form) !== JSON.stringify(snapshot.current);

  function beginEdit() {
    const next = budget ? formFromBudget(budget) : EMPTY_FORM;
    snapshot.current = next; setForm(next); setFormError(""); setEditing(true);
  }
  function discard() {
    if (dirty && !window.confirm("Hay cambios sin guardar. ¿Deseas descartarlos?")) return false;
    setForm(snapshot.current); setFormError(""); setEditing(false); return true;
  }
  function changeTab(next) {
    if (next === tab) return;
    if (editing && !discard()) return;
    setTab(next);
  }

  async function save(event) {
    event.preventDefault();
    if (saving || overAllocated || undistributed === null) return;
    let total;
    let category_budgets;
    try {
      total = decimalToCents(form.total_budget);
      category_budgets = CATEGORIES.map((category) => ({
        category, amount: centsToDecimal(decimalToCents(form.category_budgets[category])),
      }));
      if (total < 0n || category_budgets.some((item) => decimalToCents(item.amount) < 0n)) {
        throw new RangeError("Los importes no pueden ser negativos.");
      }
    } catch (validationError) {
      setFormError(validationError.message); return;
    }
    const payload = { total_budget: centsToDecimal(total), category_budgets };
    setSaving(true); setFormError("");
    try {
      if (budget) await updateBudget(selectedPeriodId, payload);
      else await createBudget(selectedPeriodId, payload);
      const updated = await getBudget(selectedPeriodId);
      setBudget(updated);
      const next = formFromBudget(updated);
      snapshot.current = next; setForm(next); setEditing(false);
    } catch (saveError) {
      setFormError(errorMessage(saveError));
    } finally { setSaving(false); }
  }

  return (
    <div className="budget-expenses-page">
      <header className="budget-expenses-heading">
        <div><p className="page-eyebrow">CONTROL FINANCIERO</p><h1>Presupuesto y gastos</h1>
          <p className="page-description">{selectedPeriod?.name ?? "Período seleccionado"} · Administra el presupuesto y consulta la ejecución.</p></div>
        {refreshing && <span role="status">Actualizando…</span>}
      </header>
      <div className="budget-tabs" role="tablist" aria-label="Secciones de presupuesto y gastos">
        <button type="button" role="tab" aria-selected={tab === "budget"} aria-controls="budget-panel" className={tab === "budget" ? "is-active" : ""} onClick={() => changeTab("budget")}>Presupuesto</button>
        <button type="button" role="tab" aria-selected={tab === "expenses"} aria-controls="expenses-panel" className={tab === "expenses" ? "is-active" : ""} onClick={() => changeTab("expenses")}>Gastos</button>
      </div>
      {tab === "budget" ? <section id="budget-panel" role="tabpanel" className="budget-tab-panel">
        {loading ? <LoadingState message="Consultando el presupuesto del período…" />
          : error ? <ErrorState message={errorMessage(error)} onRetry={() => loadBudget()} />
            : editing ? <form className="budget-editor" onSubmit={save}>
              <div className="budget-section-heading"><div><h2>{budget ? "Editar presupuesto" : "Configurar presupuesto"}</h2><p>Define el presupuesto general y distribúyelo entre las siete categorías.</p></div></div>
              <label className="budget-money-field"><span>Presupuesto general (COP)</span>
                <input aria-label="Presupuesto general" type="text" inputMode="decimal" required value={form.total_budget} onChange={(e) => setForm((v) => ({ ...v, total_budget: e.target.value }))} /></label>
              <div className="budget-editor-grid">{CATEGORIES.map((category) => <label className="budget-money-field" key={category}><span>{category}</span>
                <input aria-label={category} type="text" inputMode="decimal" required value={form.category_budgets[category]}
                  onChange={(e) => setForm((v) => ({ ...v, category_budgets: { ...v.category_budgets, [category]: e.target.value } }))} /></label>)}</div>
              <div className={overAllocated ? "budget-undistributed is-invalid" : "budget-undistributed"}><span>Importe no distribuido</span>
                <strong>{undistributed === null ? "Revisa los importes" : formatMoneyCOP(centsToDecimal(undistributed))}</strong>
                {overAllocated && <p>Las asignaciones superan el presupuesto general. Ajusta los importes antes de guardar.</p>}</div>
              {formError && <p role="alert" className="budget-form-error">{formError}</p>}
              <div className="budget-form-actions"><button type="button" className="secondary-action" disabled={saving} onClick={discard}>Cancelar</button>
                <button type="submit" className="state-action" disabled={saving || overAllocated || undistributed === null}>{saving ? "Guardando…" : "Guardar presupuesto"}</button></div>
            </form>
            : budget ? <>
              <div className="budget-section-heading"><div><h2>Resumen del presupuesto</h2><p>Indicadores calculados por el sistema para el período activo.</p></div>
                <button type="button" className="state-action" onClick={beginEdit}>Editar presupuesto</button></div>
              <div className="budget-metrics-grid">
                <article className="budget-metric-card"><span>Presupuesto general</span><strong>{formatMoneyCOP(budget.total_budget)}</strong></article>
                <article className="budget-metric-card"><span>Total gastado</span><strong>{formatMoneyCOP(budget.total_expenses)}</strong></article>
                <article className="budget-metric-card"><span>Saldo disponible</span><strong className={decimalToCents(budget.general_balance) < 0n ? "is-negative" : ""}>{formatMoneyCOP(budget.general_balance)}</strong></article>
                <article className="budget-metric-card"><span>Ejecución</span><strong>{budget.execution_percentage}%</strong></article>
              </div>
              <div className="budget-section-heading budget-categories-heading"><div><h2>Distribución por categoría</h2><p>Asignación, gasto real y saldo de cada categoría.</p></div></div>
              <div className="budget-category-grid">{CATEGORIES.map((category) => {
                const item = budget.category_budgets.find((entry) => entry.category === category);
                const allocated = item?.allocated_amount ?? "0.00"; const spent = item?.spent_amount ?? "0.00";
                const balance = item?.balance ?? "0.00"; const over = item?.over_budget ?? false;
                return <article key={category} className={over ? "budget-category-card is-over-budget" : "budget-category-card"}>
                  <div className="budget-category-card-heading"><h3>{category}</h3>{over && <span className="budget-over-budget-label">Sobreejecutada</span>}</div>
                  <dl><div><dt>Asignado</dt><dd>{formatMoneyCOP(allocated)}</dd></div><div><dt>Gastado</dt><dd>{formatMoneyCOP(spent)}</dd></div>
                    <div><dt>Saldo</dt><dd className={decimalToCents(balance) < 0n ? "is-negative" : ""}>{formatMoneyCOP(balance)}</dd></div></dl>
                </article>;
              })}</div>
            </> : <EmptyState title="Este período aún no tiene presupuesto"
              message="Puedes configurar un presupuesto y distribuirlo entre las siete categorías. También puedes registrar gastos desde la pestaña Gastos."
              actionLabel="Configurar presupuesto" onAction={beginEdit} />}
      </section> : <section id="expenses-panel" role="tabpanel" className="budget-tab-panel">
        <EmptyState title="Gestión de gastos" message="La consulta, los filtros y el registro de gastos se incorporarán en el siguiente bloque de FE-004." />
      </section>}
    </div>
  );
}
export default BudgetExpensesPage;
