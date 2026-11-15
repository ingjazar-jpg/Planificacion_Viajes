import { apiRequest } from "./httpClient.js";

export async function getDashboard(periodId) {
  const response = await apiRequest(`/periods/${encodeURIComponent(periodId)}/dashboard`);
  return response.data;
}
