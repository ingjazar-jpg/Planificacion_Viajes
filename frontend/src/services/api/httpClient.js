import { API_BASE_URL } from "../../config/api.js";

export class ApiError extends Error {
  constructor({ status = 0, code = "API_ERROR", message, details = [] } = {}) {
    super(message || "No fue posible completar la solicitud.");
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = Array.isArray(details) ? details : [];
  }
}

async function readResponse(response) {
  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      throw new ApiError({
        status: response.status,
        code: "INVALID_RESPONSE",
        message: "El servidor devolvió una respuesta que no se pudo interpretar.",
      });
    }
  }

  const text = await response.text();
  return text || null;
}

export async function request(path, options = {}) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${normalizedPath}`, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError({
      code: "NETWORK_ERROR",
      message: "No se pudo conectar con el servidor. Verifica que la API local esté iniciada.",
    });
  }

  const payload = await readResponse(response);
  if (!response.ok) {
    const apiError = payload?.error;
    throw new ApiError({
      status: response.status,
      code: apiError?.code || "HTTP_ERROR",
      message: apiError?.message || "La solicitud no pudo ser procesada.",
      details: apiError?.details || [],
    });
  }

  return payload;
}
