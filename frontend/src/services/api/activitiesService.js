import { request } from "./httpClient.js";

export async function getActivities({
  period_id,
  category,
  priority,
  status,
  destination,
  start_date,
  end_date,
}) {
  const params = new URLSearchParams();
  params.set("period_id", period_id);
  if (category) params.set("category", category);
  if (priority) params.set("priority", priority);
  if (status) params.set("status", status);
  if (destination?.trim()) params.set("destination", destination.trim());
  if (start_date) params.set("start_date", start_date);
  if (end_date) params.set("end_date", end_date);

  const response = await request(`/activities?${params.toString()}`);
  if (!Array.isArray(response?.data)) {
    throw new Error("La API devolvió un listado de actividades con formato inválido.");
  }
  return response.data;
}
