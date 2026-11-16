import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BudgetExpensesPage from "../src/features/budget-expenses/BudgetExpensesPage.jsx";
import { usePeriod } from "../src/context/PeriodContext.jsx";
import { createBudget, getBudget, updateBudget } from "../src/services/api/budgetService.js";
import { createExpense, getExpenses } from "../src/services/api/expensesService.js";
import { getActivities } from "../src/services/api/activitiesService.js";
vi.mock("../src/context/PeriodContext.jsx", () => ({ usePeriod: vi.fn() }));
vi.mock("../src/services/api/budgetService.js", () => ({ createBudget: vi.fn(), getBudget: vi.fn(), updateBudget: vi.fn() }));
vi.mock("../src/services/api/expensesService.js", () => ({ createExpense: vi.fn(), getExpenses: vi.fn() }));
vi.mock("../src/services/api/activitiesService.js", () => ({ getActivities: vi.fn() }));
const period = { id: "period-1", name: "Vacaciones 2026" };
const budget = { id:"budget-1",period_id:period.id,total_budget:"5000000.00",total_expenses:"850000.00",general_balance:"4150000.00",execution_percentage:"17.00",category_budgets:["Viajes","Transporte","Alojamiento","Recreación","Turismo","Reuniones familiares","Otros"].map((category)=>({category,allocated_amount:category==="Viajes"?"2500000.00":category==="Alojamiento"?"1500000.00":"0.00",spent_amount:category==="Alojamiento"?"850000.00":"0.00",balance:category==="Alojamiento"?"650000.00":category==="Viajes"?"2500000.00":"0.00",over_budget:false})) };
describe("BudgetExpensesPage",()=>{
 beforeEach(()=>{vi.clearAllMocks();usePeriod.mockReturnValue({selectedPeriodId:period.id,selectedPeriod:period});getBudget.mockResolvedValue(budget);getExpenses.mockResolvedValue([]);createExpense.mockResolvedValue({id:"expense-new",concept:"Compra de prueba",amount:"125.50",date:"2026-12-01",category:"Viajes",activity_id:null});getActivities.mockResolvedValue([]);createBudget.mockResolvedValue({id:"budget-new"});updateBudget.mockResolvedValue(budget);});
 it("renders backend indicators and all seven categories",async()=>{render(<BudgetExpensesPage/>);expect(await screen.findByText("Resumen del presupuesto")).toBeInTheDocument();expect(screen.getByText("$ 5.000.000,00")).toBeInTheDocument();for(const c of ["Viajes","Transporte","Alojamiento","Recreación","Turismo","Reuniones familiares","Otros"])expect(screen.getByRole("heading",{name:c})).toBeInTheDocument();});
 it("treats BUDGET_NOT_FOUND as the expected empty state",async()=>{getBudget.mockRejectedValueOnce(Object.assign(new Error("Sin presupuesto"),{status:404,code:"BUDGET_NOT_FOUND"}));render(<BudgetExpensesPage/>);expect(await screen.findByText("Este período aún no tiene presupuesto")).toBeInTheDocument();});
 it("retries failed requests",async()=>{getBudget.mockRejectedValueOnce(new Error("API no disponible"));render(<BudgetExpensesPage/>);expect(await screen.findByRole("alert")).toHaveTextContent("API no disponible");fireEvent.click(screen.getByRole("button",{name:"Reintentar"}));await waitFor(()=>expect(getBudget).toHaveBeenCalledTimes(2));});
 it("creates a complete seven-category budget",async()=>{getBudget.mockRejectedValueOnce(Object.assign(new Error("Sin presupuesto"),{status:404,code:"BUDGET_NOT_FOUND"})).mockResolvedValue(budget);render(<BudgetExpensesPage/>);fireEvent.click(await screen.findByRole("button",{name:"Configurar presupuesto"}));fireEvent.change(screen.getByLabelText("Presupuesto general"),{target:{value:"5000000.00"}});fireEvent.change(screen.getByLabelText("Viajes"),{target:{value:"2500000.00"}});fireEvent.click(screen.getByRole("button",{name:"Guardar presupuesto"}));await waitFor(()=>expect(createBudget).toHaveBeenCalledWith(period.id,expect.objectContaining({total_budget:"5000000.00",category_budgets:expect.arrayContaining([{category:"Viajes",amount:"2500000.00"}])})));});
 it("blocks allocations above the general budget",async()=>{render(<BudgetExpensesPage/>);fireEvent.click(await screen.findByRole("button",{name:"Editar presupuesto"}));fireEvent.change(screen.getByLabelText("Presupuesto general"),{target:{value:"100.00"}});fireEvent.change(screen.getByLabelText("Viajes"),{target:{value:"150.00"}});expect(screen.getByRole("button",{name:"Guardar presupuesto"})).toBeDisabled();});
 it("confirms discarding edits before changing tabs",async()=>{const confirm=vi.spyOn(window,"confirm").mockReturnValue(false);render(<BudgetExpensesPage/>);fireEvent.click(await screen.findByRole("button",{name:"Editar presupuesto"}));fireEvent.change(screen.getByLabelText("Presupuesto general"),{target:{value:"5200000.00"}});fireEvent.click(screen.getByRole("tab",{name:"Gastos"}));expect(confirm).toHaveBeenCalled();expect(screen.getByRole("tab",{name:"Presupuesto"})).toHaveAttribute("aria-selected","true");});
 it("updates an existing budget through PUT",async()=>{render(<BudgetExpensesPage/>);fireEvent.click(await screen.findByRole("button",{name:"Editar presupuesto"}));fireEvent.change(screen.getByLabelText("Presupuesto general"),{target:{value:"5100000.00"}});fireEvent.click(screen.getByRole("button",{name:"Guardar presupuesto"}));await waitFor(()=>expect(updateBudget).toHaveBeenCalledWith(period.id,expect.objectContaining({total_budget:"5100000.00"})));});

 it("loads the complete expense collection and sorts globally by date descending",async()=>{
  getExpenses.mockResolvedValueOnce([
   {id:"e1",date:"2026-12-01",concept:"Compra temprana",category:"Otros",amount:"100.00",activity_id:null},
   {id:"e2",date:"2026-12-20",concept:"Compra reciente",category:"Viajes",amount:"250.00",activity_id:null},
   {id:"e3",date:"2026-12-10",concept:"Compra media",category:"Transporte",amount:"150.00",activity_id:null},
  ]);
  render(<BudgetExpensesPage/>);
  fireEvent.click(await screen.findByRole("tab",{name:"Gastos"}));
  expect((await screen.findAllByText("Compra reciente")).length).toBeGreaterThan(0);
  expect(screen.getAllByRole("row").slice(1).map((row)=>row.cells[1].textContent)).toEqual(["Compra reciente","Compra media","Compra temprana"]);
  expect(getExpenses).toHaveBeenCalledWith({period_id:period.id,start_date:"",end_date:"",category:"",activity_id:"",min_amount:"",max_amount:""});
 });
 it("applies combined filters and resets local pagination",async()=>{
  getExpenses.mockResolvedValue(Array.from({length:22},(_,i)=>({id:`e${i}`,date:`2026-12-${String(22-i).padStart(2,"0")}`,concept:`Gasto ${i}`,category:"Viajes",amount:"10.00",activity_id:null})));
  render(<BudgetExpensesPage/>);
  fireEvent.click(await screen.findByRole("tab",{name:"Gastos"}));
  expect((await screen.findAllByText("Gasto 0")).length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole("button",{name:"Siguiente"}));
  expect(screen.getByText("Página 2 de 2")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Filtrar por categoría"),{target:{value:"Viajes"}});
  fireEvent.change(screen.getByLabelText("Fecha desde"),{target:{value:"2026-12-01"}});
  fireEvent.click(screen.getByRole("button",{name:"Aplicar filtros"}));
  await waitFor(()=>expect(getExpenses).toHaveBeenLastCalledWith({period_id:period.id,start_date:"2026-12-01",end_date:"",category:"Viajes",activity_id:"",min_amount:"",max_amount:""}));
  expect(screen.getByText("Página 1 de 2")).toBeInTheDocument();
 });

 it("registers an expense using the active period and exact decimal amount",async()=>{
  render(<BudgetExpensesPage/>);
  fireEvent.click(await screen.findByRole("tab",{name:"Gastos"}));
  fireEvent.click(screen.getByRole("button",{name:"Registrar gasto"}));
  fireEvent.change(screen.getByLabelText("Concepto"),{target:{value:"Compra de prueba"}});
  fireEvent.change(screen.getByLabelText("Importe del gasto"),{target:{value:"125.50"}});
  fireEvent.change(screen.getByLabelText("Fecha del gasto"),{target:{value:"2026-12-01"}});
  fireEvent.click(screen.getByRole("button",{name:"Guardar gasto"}));
  await waitFor(()=>expect(createExpense).toHaveBeenCalledWith({
   period_id:period.id,concept:"Compra de prueba",amount:"125.50",date:"2026-12-01",category:"Viajes",
   description:null,activity_id:null,observations:null
  }));
 });
 it("blocks a zero-value expense without calling the API",async()=>{
  render(<BudgetExpensesPage/>);
  fireEvent.click(await screen.findByRole("tab",{name:"Gastos"}));
  fireEvent.click(screen.getByRole("button",{name:"Registrar gasto"}));
  fireEvent.change(screen.getByLabelText("Concepto"),{target:{value:"Importe cero"}});
  fireEvent.change(screen.getByLabelText("Importe del gasto"),{target:{value:"0.00"}});
  fireEvent.change(screen.getByLabelText("Fecha del gasto"),{target:{value:"2026-12-01"}});
  fireEvent.click(screen.getByRole("button",{name:"Guardar gasto"}));
  expect(await screen.findByRole("alert")).toHaveTextContent("El importe debe ser mayor que cero.");
  expect(createExpense).not.toHaveBeenCalled();
 });
});
