import { request } from "./httpClient.js";

export async function getPeriods() {
  const response = await request("/periods");
  if (!Array.isArray(response?.data)) {
    throw new Error("La API devolvió un listado de períodos con formato inválido.");
  }
  return response.data;
}
