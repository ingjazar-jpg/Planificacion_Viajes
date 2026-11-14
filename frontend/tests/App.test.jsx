import { render, screen } from "@testing-library/react";
import App from "../src/App.jsx";

describe("App", () => {
  it("muestra el título del sistema y su estado inicial", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", {
        name: "Sistema de Planificación y Control de Vacaciones Decembrinas",
      }),
    ).toBeInTheDocument();

    expect(screen.getByRole("status")).toHaveTextContent(
      "Interfaz en preparación",
    );
  });
});
