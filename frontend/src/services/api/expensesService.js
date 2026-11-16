import { request } from "./httpClient.js";

function assertExpenseResponse(response, operation) {
  if (
    !response?.data
    || typeof response.data !== "object"
    || Array.isArray(response.data)
    || typeof response.data.id !== "string"
  ) {
    throw new Error(`La API devolvió una respuesta inválida al ${operation} el gasto.`);
  }
  return response.data;
}

function assertCollectionResponse(response, resource) {
  if (!Array.isArray(response?.data)) {
    throw new Error(`La API devolvió un listado de ${resource} con formato inválido.`);
  }
  return response.data;
}

export async function getExpenses({
  period_id,
  start_date,
  end_date,
  category,
  activity_id,
  min_amount,
  max_amount,
} = {}) {
  if (!period_id) {
    throw new TypeError("Se requiere period_id para consultar los gastos.");
  }

  const params = new URLSearchParams();
  params.set("period_id", period_id);

  const filters = {
    start_date,
    end_date,
    category,
    activity_id,
    min_amount,
    max_amount,
  };

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }

  // FE-004 D43: no enviar page ni page_size. El orden y la paginación
  // se aplican sobre el conjunto completo recibido por el frontend.
  const response = await request(`/expenses?${params.toString()}`);
  return assertCollectionResponse(response, "gastos");
}

export async function createExpense(payload) {
  const response = await request("/expenses", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return assertExpenseResponse(response, "crear");
}

export async function getExpense(expenseId) {
  if (!expenseId) {
    throw new TypeError("Se requiere el identificador del gasto.");
  }

  const response = await request(
    `/expenses/${encodeURIComponent(expenseId)}`,
  );
  return assertExpenseResponse(response, "consultar");
}

export async function replaceExpense(expenseId, payload) {
  if (!expenseId) {
    throw new TypeError("Se requiere el identificador del gasto.");
  }

  const response = await request(
    `/expenses/${encodeURIComponent(expenseId)}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
  return assertExpenseResponse(response, "reemplazar");
}

export async function updateExpense(expenseId, payload) {
  if (!expenseId) {
    throw new TypeError("Se requiere el identificador del gasto.");
  }

  const response = await request(
    `/expenses/${encodeURIComponent(expenseId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
  return assertExpenseResponse(response, "actualizar");
}

export async function deleteExpense(expenseId) {
  if (!expenseId) {
    throw new TypeError("Se requiere el identificador del gasto.");
  }

  return request(
    `/expenses/${encodeURIComponent(expenseId)}`,
    { method: "DELETE" },
  );
}

export async function getExpenseHistory(expenseId) {
  if (!expenseId) {
    throw new TypeError("Se requiere el identificador del gasto.");
  }

  const response = await request(
    `/expenses/${encodeURIComponent(expenseId)}/history`,
  );
  return assertCollectionResponse(response, "historial de gastos");
}
