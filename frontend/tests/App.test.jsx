import { fireEvent, render, screen } from "@testing-library/react";
import App from "../src/App.jsx";

describe("App", () => {
  it("muestra el dashboard inicial y los controles globales pendientes de API", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Dashboard" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("combobox", { name: "Período" }),
    ).toBeDisabled();

    expect(
      screen.getByRole("button", {
        name: "Alertas disponibles al conectar la API",
      }),
    ).toBeDisabled();
  });

  it("permite navegar entre las secciones definidas en UI-001", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Calendario" }));

    expect(
      screen.getByRole("heading", { name: "Calendario" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Calendario" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("abre y cierra la navegación móvil", () => {
    render(<App />);

    fireEvent.click(
      screen.getByRole("button", { name: "Abrir menú de navegación" }),
    );

    expect(
      screen.getByRole("dialog", { name: "Menú de navegación" }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Cerrar menú", exact: true }),
    );

    expect(
      screen.queryByRole("dialog", { name: "Menú de navegación" }),
    ).not.toBeInTheDocument();
  });
});
