import { request } from "./httpClient.js";

export async function evaluateAlerts(periodId) {
  return request("/alerts/evaluate", {
    method: "POST",
    body: JSON.stringify({ period_id: periodId }),
  });
}

export async function getPendingActiveAlerts(periodId) {
  const query = new URLSearchParams({
    period_id: periodId,
    status: "Pendiente",
    condition_active: "true",
  });
  const response = await request(`/alerts?${query.toString()}`);
  return response.data;
}

export async function reviewAlert(alertId) {
  const response = await request(
    `/alerts/${encodeURIComponent(alertId)}/review`,
    { method: "PATCH" },
  );
  return response.data;
}
