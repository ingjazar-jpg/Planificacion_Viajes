import { beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "../src/services/api/httpClient.js";
import { getBackups, restoreBackup } from "../src/services/api/backupsService.js";

vi.mock("../src/services/api/httpClient.js", () => ({ request: vi.fn() }));

describe("backupsService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requests the weekly backup catalog without query parameters", async () => {
    const backups = [
      {
        backup_id: "backup-1",
        created_at: "2026-11-15T10:00:00-05:00",
        type: "weekly",
        validation_status: "valid",
      },
    ];
    request.mockResolvedValue({ data: backups });

    await expect(getBackups()).resolves.toEqual(backups);
    expect(request).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledWith("/backups");
  });

  it("accepts an empty backup catalog", async () => {
    request.mockResolvedValue({ data: [] });

    await expect(getBackups()).resolves.toEqual([]);
  });

  it("rejects a malformed backup catalog response", async () => {
    request.mockResolvedValue({ data: {} });

    await expect(getBackups()).rejects.toThrow(
      "La API devolvió un catálogo de copias de seguridad con formato inválido.",
    );
  });

  it("restores a backup using the exact confirmation contract", async () => {
    const result = {
      status: "restored",
      backup_id: "backup-1",
      restored_at: "2026-11-16T10:00:00-05:00",
      message: "Restauración completada.",
    };
    request.mockResolvedValue({ data: result });

    await expect(restoreBackup("backup-1")).resolves.toEqual(result);
    expect(request).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledWith("/backups/restore", {
      method: "POST",
      body: JSON.stringify({
        backup_id: "backup-1",
        confirmed: true,
      }),
    });
  });

  it("rejects a restore response without data", async () => {
    request.mockResolvedValue({});

    await expect(restoreBackup("backup-1")).rejects.toThrow(
      "La API no devolvió el resultado de la restauración.",
    );
  });

  it("propagates API errors without changing their contract", async () => {
    const apiError = Object.assign(new Error("La copia ya no está disponible."), {
      status: 404,
      code: "BACKUP_NOT_FOUND",
      details: [],
    });
    request.mockRejectedValue(apiError);

    await expect(getBackups()).rejects.toBe(apiError);
  });
});
