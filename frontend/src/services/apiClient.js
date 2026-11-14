const DEFAULT_API_URL = "http://localhost:8000/api/v1";

export const API_BASE_URL = (
  import.meta.env.VITE_API_URL || DEFAULT_API_URL
).replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message, status, payload = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

/**
 * Centraliza las solicitudes HTTP del frontend.
 * Devuelve el cuerpo de respuesta sin alterar el contrato definido por API-001.
 */
export async function apiRequest(path, options = {}) {
  const { body, headers = {}, ...requestOptions } = options;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const response = await fetch(`${API_BASE_URL}${normalizedPath}`, {
    ...requestOptions,
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && payload.message
        ? payload.message
        : `La solicitud falló con el código HTTP ${response.status}.`;
    throw new ApiError(message, response.status, payload);
  }

  return payload;
}
