import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "../../components/common/AsyncState.jsx";
import { usePeriod } from "../../context/PeriodContext.jsx";
import { getActivities } from "../../services/api/activitiesService.js";
import { createBudget, getBudget, updateBudget } from "../../services/api/budgetService.js";
import { createExpense, deleteExpense, getExpense, getExpenseHistory, getExpenses, updateExpense } from "../../services/api/expensesService.js";
import { centsToDecimal, decimalToCents, formatMoneyCOP, getUndistributedCents } from "../../utils/money.js";
import "./BudgetExpensesPage.css";

const CATEGORIES = ["Viajes", "Transporte", "Alojamiento", "Recreación", "Turismo", "Reuniones familiares", "Otros"];
const EMPTY_FORM = { total_budget: "0.00", category_budgets: Object.fromEntries(CATEGORIES.map((item) => [item, "0.00"])) };
const EMPTY_FILTERS = { start_date: "", end_date: "", category: "", activity_id: "", min_amount: "", max_amount: "" };
const EMPTY_EXPENSE_FORM = { concept: "", amount: "", date: "", category: CATEGORIES[0], activity_id: "", description: "", observations: "" };

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

function sortExpensesByDate(expenses) {
  return [...expenses].sort((a, b) => String(b.date).localeCompare(String(a.date)));
}
function formatHistoryDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value ?? "Fecha no disponible");
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" }).format(date);
}
const HISTORY_FIELD_LABELS = { concept: "Concepto", amount: "Importe", date: "Fecha", category: "Categoría", activity_id: "Actividad", description: "Descripción", observations: "Observaciones" };
function historyValue(field, value, activityNames) {
  if (value === null || value === undefined || value === "") return "Sin valor";
  if (field === "amount" && typeof value === "string") { try { return formatMoneyCOP(value); } catch { return value; } }
  if (field === "activity_id") return activityNames.get(value) ?? String(value);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
function historyFields(event) {
  return [...new Set([...Object.keys(event.previous_values ?? {}), ...Object.keys(event.new_values ?? {})])];
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
  const [expenses, setExpenses] = useState([]);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [expensesError, setExpensesError] = useState(null);
  const [activities, setActivities] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState(EMPTY_EXPENSE_FORM);
  const [optionalOpen, setOptionalOpen] = useState(false);
  const [activitySearch, setActivitySearch] = useState("");
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);
  const [expenseNotice, setExpenseNotice] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTab, setDetailTab] = useState("information");
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [expenseHistory, setExpenseHistory] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [editingExpense, setEditingExpense] = useState(false);
  const [editExpenseForm, setEditExpenseForm] = useState(null);
  const [editOptionalOpen, setEditOptionalOpen] = useState(false);
  const [editExpenseError, setEditExpenseError] = useState("");
  const [savingExpense, setSavingExpense] = useState(false);
  const [deletingExpense, setDeletingExpense] = useState(false);
  const detailSequence = useRef(0);
  const budgetSequence = useRef(0);
  const expenseSequence = useRef(0);
  const snapshot = useRef(EMPTY_FORM);

  const loadBudget = useCallback(async (silent = false) => {
    const id = ++budgetSequence.current;
    if (!selectedPeriodId) {
      setBudget(null); setLoading(false); setRefreshing(false); setError(null); return;
    }
    if (silent && budget) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const result = await getBudget(selectedPeriodId);
      if (id === budgetSequence.current) setBudget(result);
    } catch (requestError) {
      if (id !== budgetSequence.current) return;
      if (requestError?.status === 404 && requestError?.code === "BUDGET_NOT_FOUND") {
        setBudget(null); setError(null);
      } else setError(requestError);
    } finally {
      if (id === budgetSequence.current) { setLoading(false); setRefreshing(false); }
    }
  }, [selectedPeriodId, budget]);

  const loadExpenses = useCallback(async (queryFilters = appliedFilters) => {
    const id = ++expenseSequence.current;
    if (!selectedPeriodId) {
      setExpenses([]); setExpensesLoading(false); setExpensesError(null); return;
    }
    setExpensesLoading(true);
    setExpensesError(null);
    try {
      const result = await getExpenses({ period_id: selectedPeriodId, ...queryFilters });
      if (id === expenseSequence.current) setExpenses(sortExpensesByDate(result));
    } catch (requestError) {
      if (id === expenseSequence.current) setExpensesError(requestError);
    } finally {
      if (id === expenseSequence.current) setExpensesLoading(false);
    }
  }, [selectedPeriodId, appliedFilters]);

  useEffect(() => {
    setBudget(null); setLoading(true); setEditing(false); setForm(EMPTY_FORM); setError(null);
    loadBudget();
    return () => { budgetSequence.current += 1; };
  }, [selectedPeriodId]);

  useEffect(() => {
    setExpenses([]); setFilters(EMPTY_FILTERS); setAppliedFilters(EMPTY_FILTERS);
    setPage(1);
    if (!selectedPeriodId) setActivities([]);
    else getActivities({ period_id: selectedPeriodId })
      .then(setActivities)
      .catch(() => setActivities([]));
    return () => { expenseSequence.current += 1; };
  }, [selectedPeriodId]);

  useEffect(() => {
    loadExpenses(appliedFilters);
  }, [appliedFilters, loadExpenses]);

  const undistributed = useMemo(() => {
    try { return getUndistributedCents(form.total_budget, CATEGORIES.map((c) => form.category_budgets[c])); }
    catch { return null; }
  }, [form]);
  const overAllocated = undistributed !== null && undistributed < 0n;
  const dirty = JSON.stringify(form) !== JSON.stringify(snapshot.current);
  const activityNames = useMemo(() => new Map(activities.map((activity) => [activity.id, activity.title ?? activity.name ?? "Actividad"])), [activities]);
  const pageCount = Math.max(1, Math.ceil(expenses.length / pageSize));
  const visibleExpenses = expenses.slice((page - 1) * pageSize, page * pageSize);
  const hasFilters = Object.values(appliedFilters).some(Boolean);
  const filteredActivities = activities.filter((activity) => String(activity.title ?? activity.name ?? "").toLocaleLowerCase().includes(activitySearch.trim().toLocaleLowerCase()));

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

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

  function applyFilters(event) {
    event.preventDefault();
    setPage(1);
    setAppliedFilters({ ...filters });
  }

  async function submitExpense(event) {
    event.preventDefault();
    if (creating || !selectedPeriodId) return;
    let amount;
    try {
      amount = decimalToCents(expenseForm.amount);
      if (amount <= 0n) throw new RangeError("El importe debe ser mayor que cero.");
    } catch (validationError) {
      setCreateError(validationError.message);
      return;
    }
    const payload = {
      period_id: selectedPeriodId,
      concept: expenseForm.concept.trim(),
      amount: centsToDecimal(amount),
      date: expenseForm.date,
      category: expenseForm.category,
      description: expenseForm.description.trim() || null,
      activity_id: expenseForm.activity_id || null,
      observations: expenseForm.observations.trim() || null,
    };
    if (!payload.concept || !payload.date || !payload.category) {
      setCreateError("Completa concepto, fecha, categoría e importe.");
      return;
    }
    setCreating(true);
    setCreateError("");
    try {
      await createExpense(payload);
      setCreateOpen(false);
      setExpenseForm(EMPTY_EXPENSE_FORM);
      setActivitySearch("");
      setOptionalOpen(false);
      setPage(1);
      await Promise.all([loadExpenses(appliedFilters), loadBudget(true)]);
      setExpenseNotice("Gasto registrado correctamente.");
    } catch (requestError) {
      setCreateError(errorMessage(requestError));
    } finally {
      setCreating(false);
    }
  }

  const loadExpenseDetail = useCallback(async (expenseId) => {
    const requestId = ++detailSequence.current;
    setDetailLoading(true); setDetailError(null);
    try {
      const [detail, history] = await Promise.all([getExpense(expenseId), getExpenseHistory(expenseId)]);
      if (requestId !== detailSequence.current) return;
      setSelectedExpense(detail);
      setExpenseHistory([...history].sort((a, b) => String(a.modified_at).localeCompare(String(b.modified_at))));
    } catch (requestError) {
      if (requestId === detailSequence.current) setDetailError(requestError);
    } finally {
      if (requestId === detailSequence.current) setDetailLoading(false);
    }
  }, []);
  function openExpenseDetail(expense) {
    setSelectedExpense(expense); setExpenseHistory([]); setDetailTab("information");
    setDetailError(null); setDetailOpen(true); loadExpenseDetail(expense.id);
  }
  function closeExpenseDetail() {
    if (savingExpense || deletingExpense) return;
    detailSequence.current += 1; setDetailOpen(false); setDetailLoading(false);
    setDetailError(null); setSelectedExpense(null); setExpenseHistory([]);
    setEditingExpense(false); setEditExpenseForm(null); setEditExpenseError("");
  }
  function beginExpenseEdit() {
    if (!selectedExpense) return;
    setEditExpenseForm({
      concept: selectedExpense.concept ?? "", amount: selectedExpense.amount ?? "",
      date: selectedExpense.date ?? "", category: selectedExpense.category ?? CATEGORIES[0],
      activity_id: selectedExpense.activity_id ?? "", description: selectedExpense.description ?? "",
      observations: selectedExpense.observations ?? "",
    });
    setEditOptionalOpen(Boolean(selectedExpense.description || selectedExpense.observations));
    setEditExpenseError(""); setEditingExpense(true);
  }
  function cancelExpenseEdit() {
    if (savingExpense) return;
    setEditingExpense(false); setEditExpenseForm(null); setEditExpenseError("");
  }
  async function saveExpenseChanges(event) {
    event.preventDefault();
    if (savingExpense || !selectedExpense || !editExpenseForm) return;
    let amount;
    try {
      amount = decimalToCents(editExpenseForm.amount);
      if (amount <= 0n) throw new RangeError("El importe debe ser mayor que cero.");
    } catch (validationError) { setEditExpenseError(validationError.message); return; }
    const values = {
      concept: editExpenseForm.concept.trim(), amount: centsToDecimal(amount),
      date: editExpenseForm.date, category: editExpenseForm.category,
      activity_id: editExpenseForm.activity_id || null,
      description: editExpenseForm.description.trim() || null,
      observations: editExpenseForm.observations.trim() || null,
    };
    if (!values.concept || !values.date || !values.category) {
      setEditExpenseError("Completa concepto, fecha, categoría e importe."); return;
    }
    const payload = {};
    for (const field of ["concept", "amount", "date", "category", "activity_id", "description", "observations"]) {
      const previous = field === "amount" ? centsToDecimal(decimalToCents(selectedExpense.amount)) : (selectedExpense[field] ?? null);
      if (values[field] !== previous) payload[field] = values[field];
    }
    if (!Object.keys(payload).length) {
      setEditingExpense(false); setEditExpenseForm(null);
      setExpenseNotice("No hay cambios para guardar."); return;
    }
    setSavingExpense(true); setEditExpenseError("");
    try {
      const updated = await updateExpense(selectedExpense.id, payload);
      setSelectedExpense((current) => ({ ...current, ...values, ...(updated ?? {}) }));
      setExpenses((current) => sortExpensesByDate(current.map((item) =>
        item.id === selectedExpense.id ? { ...item, ...values, ...(updated ?? {}) } : item
      )));
      setEditingExpense(false); setEditExpenseForm(null);
      await Promise.all([loadExpenses(appliedFilters), loadBudget(true), loadExpenseDetail(selectedExpense.id)]);
      setExpenseNotice("Gasto actualizado correctamente.");
    } catch (requestError) { setEditExpenseError(errorMessage(requestError)); }
    finally { setSavingExpense(false); }
  }
  async function removeSelectedExpense() {
    if (!selectedExpense || deletingExpense || savingExpense) return;
    const activity = selectedExpense.activity_id ? activityNames.get(selectedExpense.activity_id) ?? "Actividad asociada" : "Sin actividad";
    const confirmation = [
      "¿Eliminar definitivamente este gasto?", "",
      "Concepto: " + selectedExpense.concept,
      "Importe: " + formatMoneyCOP(selectedExpense.amount),
      "Fecha: " + selectedExpense.date,
      "Categoría: " + selectedExpense.category,
      "Actividad: " + activity, "",
      "Esta acción también eliminará definitivamente todo el historial del gasto y no se puede deshacer.",
    ].join("\n");
    if (!window.confirm(confirmation)) return;
    setDeletingExpense(true); setDetailError(null);
    try {
      await deleteExpense(selectedExpense.id);
      setExpenses((current) => current.filter((item) => item.id !== selectedExpense.id));
      closeExpenseDetail(); await loadBudget(true);
      setExpenseNotice("Gasto eliminado correctamente. Su historial también fue eliminado.");
    } catch (requestError) { setDetailError(requestError); }
    finally { setDeletingExpense(false); }
  }


  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setPage(1);
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
        <div className="budget-section-heading"><div><h2>Gastos del período</h2><p>Consulta el conjunto completo, filtra y ordena por fecha más reciente.</p></div><button type="button" className="state-action" onClick={() => { setCreateError(""); setCreateOpen(true); }}>Registrar gasto</button></div>
        <form className="expense-filters" onSubmit={applyFilters}>
          <label>Desde<input aria-label="Fecha desde" type="date" value={filters.start_date} onChange={(e) => setFilters((v) => ({ ...v, start_date: e.target.value }))} /></label>
          <label>Hasta<input aria-label="Fecha hasta" type="date" value={filters.end_date} onChange={(e) => setFilters((v) => ({ ...v, end_date: e.target.value }))} /></label>
          <label>Categoría<select aria-label="Filtrar por categoría" value={filters.category} onChange={(e) => setFilters((v) => ({ ...v, category: e.target.value }))}><option value="">Todas</option>{CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label>Actividad<select aria-label="Filtrar por actividad" value={filters.activity_id} onChange={(e) => setFilters((v) => ({ ...v, activity_id: e.target.value }))}><option value="">Todas</option>{activities.map((activity) => <option key={activity.id} value={activity.id}>{activity.title ?? activity.name ?? "Actividad"}</option>)}</select></label>
          <label>Importe mínimo<input aria-label="Importe mínimo" type="text" inputMode="decimal" placeholder="0.00" value={filters.min_amount} onChange={(e) => setFilters((v) => ({ ...v, min_amount: e.target.value }))} /></label>
          <label>Importe máximo<input aria-label="Importe máximo" type="text" inputMode="decimal" placeholder="0.00" value={filters.max_amount} onChange={(e) => setFilters((v) => ({ ...v, max_amount: e.target.value }))} /></label>
          <div className="expense-filter-actions"><button className="state-action" type="submit">Aplicar filtros</button><button className="secondary-action" type="button" onClick={clearFilters}>Limpiar</button></div>
        </form>
        {expensesLoading ? <LoadingState message="Consultando gastos…" />
          : expensesError ? <ErrorState message={errorMessage(expensesError)} onRetry={() => loadExpenses()} />
            : expenses.length === 0 ? <EmptyState title={hasFilters ? "No hay gastos que coincidan" : "Aún no hay gastos registrados"}
              message={hasFilters ? "Prueba ajustar o limpiar los filtros." : "Los gastos registrados para este período aparecerán aquí."}
              actionLabel={hasFilters ? "Limpiar filtros" : "Registrar gasto"} onAction={hasFilters ? clearFilters : () => { setCreateError(""); setCreateOpen(true); }} />
              : <>
                <div className="expense-list-toolbar"><span>{expenses.length} {expenses.length === 1 ? "gasto" : "gastos"}</span>
                  <label>Mostrar<select aria-label="Tamaño de página" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                    <option value={10}>10</option><option value={20}>20</option><option value={50}>50</option>
                  </select></label></div>
                <div className="expense-table-wrap"><table className="expense-table">
                  <thead><tr><th>Fecha</th><th>Concepto</th><th>Categoría</th><th>Actividad</th><th>Importe</th><th>Acciones</th></tr></thead>
                  <tbody>{visibleExpenses.map((expense) => <tr key={expense.id}>
                    <td>{expense.date}</td><td>{expense.concept}</td><td>{expense.category}</td>
                    <td>{expense.activity_id ? activityNames.get(expense.activity_id) ?? "Actividad asociada" : "Sin actividad"}</td>
                    <td>{formatMoneyCOP(expense.amount)}</td><td><button type="button" className="text-action" onClick={() => openExpenseDetail(expense)}>Ver detalle</button></td>
                  </tr>)}</tbody>
                </table></div>
                <div className="expense-mobile-list">{visibleExpenses.map((expense) => <article className="expense-mobile-card" key={expense.id}>
                  <div><span>{expense.date}</span><strong>{formatMoneyCOP(expense.amount)}</strong></div><h3>{expense.concept}</h3>
                  <p>{expense.category} · {expense.activity_id ? activityNames.get(expense.activity_id) ?? "Actividad asociada" : "Sin actividad"}</p>
                  <button type="button" className="text-action" onClick={() => openExpenseDetail(expense)}>Ver detalle</button>
                </article>)}</div>
                <nav className="expense-pagination" aria-label="Paginación de gastos">
                  <span>Página {page} de {pageCount}</span>
                  <div><button type="button" className="secondary-action" disabled={page <= 1} onClick={() => setPage((v) => v - 1)}>Anterior</button>
                    <button type="button" className="secondary-action" disabled={page >= pageCount} onClick={() => setPage((v) => v + 1)}>Siguiente</button></div>
                </nav>
              </>}
      </section>}
      {expenseNotice && <p className="expense-success" role="status">{expenseNotice}<button type="button" aria-label="Cerrar notificación" onClick={() => setExpenseNotice("")}>×</button></p>}
      {detailOpen && <div className="expense-drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeExpenseDetail(); }}>
        <aside className="expense-drawer expense-detail-drawer" role="dialog" aria-modal="true" aria-labelledby="expense-detail-title">
          <div className="expense-drawer-heading"><div><p className="page-eyebrow">DETALLE DEL GASTO</p><h2 id="expense-detail-title">{selectedExpense?.concept ?? "Consultando gasto…"}</h2>
            <p>{selectedExpense?.date ?? ""} · {selectedExpense ? formatMoneyCOP(selectedExpense.amount) : ""}</p></div>
            <button type="button" className="secondary-action" aria-label="Cerrar detalle" disabled={savingExpense || deletingExpense} onClick={closeExpenseDetail}>×</button></div>
          <div className="expense-detail-tabs" role="tablist" aria-label="Detalle del gasto">
            <button type="button" role="tab" aria-selected={detailTab === "information"} disabled={editingExpense || savingExpense} className={detailTab === "information" ? "is-active" : ""} onClick={() => setDetailTab("information")}>Información</button>
            <button type="button" role="tab" aria-selected={detailTab === "history"} disabled={editingExpense || savingExpense} className={detailTab === "history" ? "is-active" : ""} onClick={() => setDetailTab("history")}>Historial</button>
          </div>
          {detailLoading && <LoadingState message="Consultando detalle e historial…" />}
          {detailError && <ErrorState message={errorMessage(detailError)} onRetry={() => selectedExpense && loadExpenseDetail(selectedExpense.id)} />}
          {!detailLoading && !detailError && selectedExpense && detailTab === "information" && editingExpense && editExpenseForm && <form className="expense-create-form" onSubmit={saveExpenseChanges}>
            <label>Concepto<input aria-label="Concepto del gasto (edición)" required maxLength={160} value={editExpenseForm.concept} onChange={(event) => setEditExpenseForm((value) => ({ ...value, concept: event.target.value }))} /></label>
            <label>Importe (COP)<input aria-label="Importe del gasto (edición)" required type="text" inputMode="decimal" value={editExpenseForm.amount} onChange={(event) => setEditExpenseForm((value) => ({ ...value, amount: event.target.value }))} /></label>
            <label>Fecha<input aria-label="Fecha del gasto (edición)" required type="date" value={editExpenseForm.date} onChange={(event) => setEditExpenseForm((value) => ({ ...value, date: event.target.value }))} /></label>
            <label>Categoría<select aria-label="Categoría del gasto (edición)" required value={editExpenseForm.category} onChange={(event) => setEditExpenseForm((value) => ({ ...value, category: event.target.value }))}>{CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
            <label>Actividad (opcional)<input aria-label="Buscar actividad (edición)" type="search" placeholder="Buscar actividad…" value={activitySearch} onChange={(event) => setActivitySearch(event.target.value)} />
              <select aria-label="Actividad asociada (edición)" value={editExpenseForm.activity_id} onChange={(event) => setEditExpenseForm((value) => ({ ...value, activity_id: event.target.value }))}><option value="">Sin actividad</option>{filteredActivities.map((activity) => <option key={activity.id} value={activity.id}>{activity.title ?? activity.name ?? "Actividad"}</option>)}</select>
            </label>
            <button type="button" className="expense-optional-toggle" aria-expanded={editOptionalOpen} onClick={() => setEditOptionalOpen((value) => !value)}>{editOptionalOpen ? "Ocultar campos opcionales" : "Mostrar campos opcionales"}</button>
            {editOptionalOpen && <div className="expense-optional-fields">
              <label>Descripción<textarea aria-label="Descripción del gasto (edición)" rows="3" value={editExpenseForm.description} onChange={(event) => setEditExpenseForm((value) => ({ ...value, description: event.target.value }))} /></label>
              <label>Observaciones<textarea aria-label="Observaciones del gasto (edición)" rows="3" value={editExpenseForm.observations} onChange={(event) => setEditExpenseForm((value) => ({ ...value, observations: event.target.value }))} /></label>
            </div>}
            {editExpenseError && <p role="alert" className="budget-form-error">{editExpenseError}</p>}
            <div className="budget-form-actions"><button type="button" className="secondary-action" disabled={savingExpense} onClick={cancelExpenseEdit}>Cancelar</button>
              <button type="submit" className="state-action" disabled={savingExpense}>{savingExpense ? "Guardando…" : "Guardar cambios"}</button></div>
          </form>}
          {!detailLoading && !detailError && selectedExpense && detailTab === "information" && !editingExpense && <>
            <dl className="expense-detail-fields">
              <div><dt>Concepto</dt><dd>{selectedExpense.concept}</dd></div><div><dt>Importe</dt><dd>{formatMoneyCOP(selectedExpense.amount)}</dd></div>
              <div><dt>Fecha</dt><dd>{selectedExpense.date}</dd></div><div><dt>Categoría</dt><dd>{selectedExpense.category}</dd></div>
              <div><dt>Actividad</dt><dd>{selectedExpense.activity_id ? activityNames.get(selectedExpense.activity_id) ?? "Actividad asociada" : "Sin actividad"}</dd></div>
              <div><dt>Descripción</dt><dd>{selectedExpense.description || "Sin descripción"}</dd></div><div><dt>Observaciones</dt><dd>{selectedExpense.observations || "Sin observaciones"}</dd></div>
              <div><dt>Registrado</dt><dd>{selectedExpense.created_at ? formatHistoryDate(selectedExpense.created_at) : "No disponible"}</dd></div>
              <div><dt>Última actualización</dt><dd>{selectedExpense.updated_at ? formatHistoryDate(selectedExpense.updated_at) : "No disponible"}</dd></div>
            </dl>
            <div className="expense-detail-actions">
              <button type="button" className="secondary-action" disabled={savingExpense || deletingExpense} onClick={beginExpenseEdit}>Editar gasto</button>
              <button type="button" className="danger-action" disabled={savingExpense || deletingExpense} onClick={removeSelectedExpense}>{deletingExpense ? "Eliminando…" : "Eliminar gasto"}</button>
            </div>
          </>}
          {!detailLoading && !detailError && selectedExpense && detailTab === "history" && (expenseHistory.length === 0
            ? <p className="expense-history-empty">Este gasto no tiene eventos de historial.</p>
            : <ol className="expense-history-timeline">{expenseHistory.map((entry) => <li key={entry.id}><article className="expense-history-event">
              <div className="expense-history-event-heading"><strong>{entry.modification_type}</strong><time dateTime={entry.modified_at}>{formatHistoryDate(entry.modified_at)}</time></div>
              <dl>{historyFields(entry).map((field) => <div key={field}><dt>{HISTORY_FIELD_LABELS[field] ?? field}</dt><dd>
                {entry.modification_type === "Creación" ? <span>{historyValue(field, entry.new_values?.[field], activityNames)}</span>
                  : <span><del>{historyValue(field, entry.previous_values?.[field], activityNames)}</del><span aria-hidden="true"> → </span><strong>{historyValue(field, entry.new_values?.[field], activityNames)}</strong></span>}
              </dd></div>)}</dl>
            </article></li>)}</ol>)}
        </aside>
      </div>}
      {createOpen && <div className="expense-drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !creating) setCreateOpen(false); }}>
        <aside className="expense-drawer" role="dialog" aria-modal="true" aria-labelledby="expense-create-title">
          <div className="expense-drawer-heading"><div><p className="page-eyebrow">NUEVO REGISTRO</p><h2 id="expense-create-title">Registrar gasto</h2><p>Período: {selectedPeriod?.name ?? "Período seleccionado"}</p></div>
            <button type="button" className="secondary-action" aria-label="Cerrar formulario" disabled={creating} onClick={() => setCreateOpen(false)}>×</button></div>
          <form className="expense-create-form" onSubmit={submitExpense}>
            <label>Concepto<input aria-label="Concepto" required maxLength={160} value={expenseForm.concept} onChange={(event) => setExpenseForm((value) => ({ ...value, concept: event.target.value }))} /></label>
            <label>Importe (COP)<input aria-label="Importe del gasto" required type="text" inputMode="decimal" placeholder="0.00" value={expenseForm.amount} onChange={(event) => setExpenseForm((value) => ({ ...value, amount: event.target.value }))} /></label>
            <label>Fecha<input aria-label="Fecha del gasto" required type="date" value={expenseForm.date} onChange={(event) => setExpenseForm((value) => ({ ...value, date: event.target.value }))} /></label>
            <label>Categoría<select aria-label="Categoría del gasto" required value={expenseForm.category} onChange={(event) => setExpenseForm((value) => ({ ...value, category: event.target.value }))}>{CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
            <label>Actividad (opcional)<input aria-label="Buscar actividad" type="search" placeholder="Buscar actividad…" value={activitySearch} onChange={(event) => setActivitySearch(event.target.value)} />
              <select aria-label="Actividad asociada" value={expenseForm.activity_id} onChange={(event) => setExpenseForm((value) => ({ ...value, activity_id: event.target.value }))}><option value="">Sin actividad</option>{filteredActivities.map((activity) => <option key={activity.id} value={activity.id}>{activity.title ?? activity.name ?? "Actividad"}</option>)}</select>
            </label>
            <button type="button" className="expense-optional-toggle" aria-expanded={optionalOpen} onClick={() => setOptionalOpen((value) => !value)}>{optionalOpen ? "Ocultar campos opcionales" : "Añadir descripción y observaciones"}</button>
            {optionalOpen && <div className="expense-optional-fields">
              <label>Descripción<textarea aria-label="Descripción" rows="3" value={expenseForm.description} onChange={(event) => setExpenseForm((value) => ({ ...value, description: event.target.value }))} /></label>
              <label>Observaciones<textarea aria-label="Observaciones" rows="3" value={expenseForm.observations} onChange={(event) => setExpenseForm((value) => ({ ...value, observations: event.target.value }))} /></label>
            </div>}
            {createError && <p role="alert" className="budget-form-error">{createError}</p>}
            <div className="budget-form-actions"><button type="button" className="secondary-action" disabled={creating} onClick={() => setCreateOpen(false)}>Cancelar</button>
              <button type="submit" className="state-action" disabled={creating}>{creating ? "Registrando…" : "Guardar gasto"}</button></div>
          </form>
        </aside>
      </div>}
    </div>
  );
}
export default BudgetExpensesPage;
