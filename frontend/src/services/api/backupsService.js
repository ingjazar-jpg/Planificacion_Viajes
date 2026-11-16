import { request } from "./httpClient.js";

/**
 * Returns the weekly backup catalog exactly as provided by the API.
 * The backend owns filtering, validation status and ordering.
 */
export async function getBackups() {
  const response = await request("/backups");
  if (!Array.isArray(response?.data)) {
    throw new Error("La API devolvió un catálogo de copias de seguridad con formato inválido.");
  }
  return response.data;
}

/**
 * Requests restoration of a weekly backup after the user confirms it.
 * The confirmation flag is deliberately fixed to true by this operation.
 */
export async function restoreBackup(backupId) {
  const response = await request("/backups/restore", {
    method: "POST",
    body: JSON.stringify({
      backup_id: backupId,
      confirmed: true,
    }),
  });

  if (!response?.data) {
    throw new Error("La API no devolvió el resultado de la restauración.");
  }

  return response.data;
}
