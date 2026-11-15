import { request } from "./httpClient.js";

export async function getCalendar({
  period_id,
  start_date,
  end_date,
  category,
  priority,
  status,
}) {
  const params = new URLSearchParams();
  params.set("period_id", period_id);
  params.set("start_date", start_date);
  params.set("end_date", end_date);
  if (category) params.set("category", category);
  if (priority) params.set("priority", priority);
  if (status) params.set("status", status);

  const response = await request(`/calendar?${params.toString()}`);
  if (!Array.isArray(response?.data)) {
    throw new Error("La API devolvió un calendario con formato inválido.");
  }
  return response.data;
}
