import { request } from "./httpClient.js";

function assertBudgetResponse(response, operation) {
  if (
    !response?.data
    || typeof response.data !== "object"
    || Array.isArray(response.data)
    || typeof response.data.id !== "string"
  ) {
    throw new Error(`La API devolvió una respuesta inválida al ${operation} el presupuesto.`);
  }
  return response.data;
}

export async function getBudget(periodId) {
  if (!periodId) {
    throw new TypeError("Se requiere el identificador del período para consultar el presupuesto.");
  }

  const response = await request(
    `/periods/${encodeURIComponent(periodId)}/budget`,
  );

  if (
    !response?.data
    || typeof response.data !== "object"
    || Array.isArray(response.data)
  ) {
    throw new Error("La API devolvió un presupuesto con formato inválido.");
  }

  return response.data;
}

export async function createBudget(periodId, payload) {
  if (!periodId) {
    throw new TypeError("Se requiere el identificador del período para crear el presupuesto.");
  }

  const response = await request(
    `/periods/${encodeURIComponent(periodId)}/budget`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );

  return assertBudgetResponse(response, "crear");
}

export async function updateBudget(periodId, payload) {
  if (!periodId) {
    throw new TypeError("Se requiere el identificador del período para actualizar el presupuesto.");
  }

  const response = await request(
    `/periods/${encodeURIComponent(periodId)}/budget`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );

  return assertBudgetResponse(response, "actualizar");
}
