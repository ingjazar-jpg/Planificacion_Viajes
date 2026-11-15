import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  ActivityStatusChart, BudgetComparisonChart, ComplianceIndicator, ExpenseCategoryChart,
} from "../src/features/dashboard/DashboardCharts.jsx";

describe("Dashboard SVG charts", () => {
  it("shows an informative empty state when there are no activities", () => {
    render(<ActivityStatusChart data={[]} />);
    expect(screen.getByText("No hay actividades registradas en este período.")).toBeInTheDocument();
  });

  it("renders the status legend and counts from the API response", () => {
    render(<ActivityStatusChart data={[
      { status: "Pendiente", count: 2 }, { status: "Completada", count: 3 },
    ]} />);
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
    expect(screen.getByText("Completada")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("renders budget and expenses labels without inventing data", () => {
    render(<BudgetComparisonChart data={[
      { category: "Viajes", budget: "100.00", expenses: "25.00" },
    ]} />);
    expect(screen.getByText("Viajes")).toBeInTheDocument();
    expect(screen.getByText("Presupuesto")).toBeInTheDocument();
    expect(screen.getByText("Gastos")).toBeInTheDocument();
  });

  it("renders expense categories and the completion percentage", () => {
    render(<>
      <ExpenseCategoryChart data={[{ category: "Transporte", expenses: "0.00" }]} />
      <ComplianceIndicator value="0.00" />
    </>);
    expect(screen.getByText("Transporte")).toBeInTheDocument();
    expect(screen.getByText("0.00%")).toBeInTheDocument();
  });
});
