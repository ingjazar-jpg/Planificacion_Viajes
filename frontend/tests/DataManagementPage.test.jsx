import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import DataManagementPage from "../src/features/data-management/DataManagementPage.jsx";
import { getBackups, restoreBackup } from "../src/services/api/backupsService.js";
import { useDataRecovery } from "../src/context/DataRecoveryContext.jsx";

vi.mock("../src/services/api/backupsService.js", () => ({
  getBackups: vi.fn(),
  restoreBackup: vi.fn(),
}));

vi.mock("../src/context/DataRecoveryContext.jsx", () => ({
  useDataRecovery: vi.fn(),
}));

const validBackup = {
  backup_id: "backup-valid-001",
  created_at: "2026-11-15T10:00:00-05:00",
  type: "weekly",
  validation_status: "valid",
};
const invalidBackup = {
  backup_id: "backup-invalid-002",
  created_at: "2026-11-14T10:00:00-05:00",
  type: "weekly",
  validation_status: "invalid",
};
const unvalidatedBackup = {
  backup_id: "backup-unvalidated-003",
  created_at: "2026-11-13T10:00:00-05:00",
  type: "weekly",
  validation_status: "not_validated",
};

describe("DataManagementPage", () => {
  const completeRestoration = vi.fn();
  const retryRefresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    getBackups.mockResolvedValue([validBackup, invalidBackup, unvalidatedBackup]);
    restoreBackup.mockResolvedValue({
      status: "restored",
      backup_id: validBackup.backup_id,
      restored_at: "2026-11-16T10:00:00-05:00",
      message: "Restauración completada.",
    });
    completeRestoration.mockResolvedValue(true);
    useDataRecovery.mockReturnValue({
      refreshError: null,
      isRefreshing: false,
      restoreSucceeded: false,
      retryRefresh,
      completeRestoration,
    });
  });

  it("loads the catalog and disables restoration for non-valid backups", async () => {
    render(<DataManagementPage />);

    expect(await screen.findByText("Disponible para restaurar")).toBeInTheDocument();
    expect(screen.getByText("No válida")).toBeInTheDocument();
    expect(screen.getByText("Pendiente de validación")).toBeInTheDocument();

    const restoreButtons = screen.getAllByRole("button", { name: "Restaurar" });
    expect(restoreButtons[0]).toBeEnabled();
    expect(restoreButtons[1]).toBeDisabled();
    expect(restoreButtons[2]).toBeDisabled();
    expect(getBackups).toHaveBeenCalledOnce();
  });

  it("shows an informative empty catalog", async () => {
    getBackups.mockResolvedValue([]);
    render(<DataManagementPage />);

    expect(await screen.findByText("No hay copias semanales disponibles")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Restaurar" })).not.toBeInTheDocument();
  });

  it("offers an explicit retry when the catalog request fails", async () => {
    getBackups.mockRejectedValueOnce(new Error("Servicio no disponible"))
      .mockResolvedValueOnce([validBackup]);
    render(<DataManagementPage />);

    expect(await screen.findByText("Servicio no disponible")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Disponible para restaurar")).toBeInTheDocument();
    expect(getBackups).toHaveBeenCalledTimes(2);
  });

  it("does not send a request when the user cancels confirmation", async () => {
    render(<DataManagementPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Restaurar" }));

    expect(screen.getByRole("dialog", { name: "Confirmar restauración" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(restoreBackup).not.toHaveBeenCalled();
  });

  it("confirms restoration and starts the global data refresh after HTTP success", async () => {
    render(<DataManagementPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Restaurar" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar restauración" }));

    await waitFor(() => expect(restoreBackup).toHaveBeenCalledWith(validBackup.backup_id));
    await waitFor(() => expect(completeRestoration).toHaveBeenCalledOnce());
    expect(await screen.findByText("Restauración completada.")).toBeInTheDocument();
    expect(getBackups).toHaveBeenCalledOnce();
  });

  it("keeps restore success and offers GET-only recovery when the global refresh fails", async () => {
    completeRestoration.mockResolvedValue(false);
    useDataRecovery.mockReturnValue({
      refreshError: new Error("Fallo de actualización"),
      isRefreshing: false,
      restoreSucceeded: true,
      retryRefresh,
      completeRestoration,
    });
    render(<DataManagementPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Restaurar" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar restauración" }));

    expect(await screen.findByText(/La restauración se completó correctamente, pero la actualización/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar actualización" })).toBeInTheDocument();
    expect(restoreBackup).toHaveBeenCalledOnce();
  });

  it("refreshes the catalog after a backup is missing", async () => {
    restoreBackup.mockRejectedValue(Object.assign(new Error("No disponible"), {
      status: 404, code: "BACKUP_NOT_FOUND",
    }));
    render(<DataManagementPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Restaurar" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar restauración" }));

    expect(await screen.findByText(/ya no está disponible/)).toBeInTheDocument();
    await waitFor(() => expect(getBackups).toHaveBeenCalledTimes(2));
    expect(completeRestoration).not.toHaveBeenCalled();
  });

  it("does not refresh the catalog automatically after a 500 restore failure", async () => {
    restoreBackup.mockRejectedValue(Object.assign(new Error("Fallo controlado"), {
      status: 500, code: "BACKUP_RESTORE_FAILED",
    }));
    render(<DataManagementPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Restaurar" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar restauración" }));

    expect(await screen.findByText(/Los datos anteriores se conservaron/)).toBeInTheDocument();
    expect(getBackups).toHaveBeenCalledOnce();
    expect(completeRestoration).not.toHaveBeenCalled();
  });
});
