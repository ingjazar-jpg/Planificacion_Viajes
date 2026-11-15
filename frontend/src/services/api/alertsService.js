import { apiRequest } from "./httpClient.js";

export async function evaluateAlerts(periodId) {
  return apiRequest("/alerts/evaluate", {
    method: "POST",
    body: { period_id: periodId },
  });
}

export async function getPendingActiveAlerts(periodId) {
  const query = new URLSearchParams({
    period_id: periodId,
    status: "Pendiente",
    condition_active: "true",
  });
  const response = await apiRequest(`/alerts?${query.toString()}`);
  return response.data;
}

export async function reviewAlert(alertId) {
  const response = await apiRequest(
    `/alerts/${encodeURIComponent(alertId)}/review`,
    { method: "PATCH" },
  );
  return response.data;
}
