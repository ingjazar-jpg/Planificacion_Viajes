import { request } from "./httpClient.js";

export async function getPeriods() {
  const response = await request("/periods");
  if (!Array.isArray(response?.data)) {
    throw new Error("La API devolvió un listado de períodos con formato inválido.");
  }
  return response.data;
}

export async function createPeriod(payload) {
  const response = await request("/periods", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!response?.data?.id) {
    throw new Error("La API no devolvió el período creado.");
  }
  return response.data;
}

export async function updatePeriod(periodId, payload) {
  const response = await request(`/periods/${encodeURIComponent(periodId)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  if (!response?.data?.id) {
    throw new Error("La API no devolvió el período actualizado.");
  }
  return response.data;
}
