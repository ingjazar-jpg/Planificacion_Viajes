import { request } from "./httpClient.js";

export async function getDashboard(periodId) {
  const response = await request(`/periods/${encodeURIComponent(periodId)}/dashboard`);
  return response.data;
}
