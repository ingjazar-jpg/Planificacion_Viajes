import { API_BASE_URL } from "../../config/api.js";
import { ApiError, request } from "./httpClient.js";

const REPORT_ENDPOINTS = Object.freeze({
  general: "general",
  activities: "activities",
  budget: "budget",
});

const REPORT_FILTERS = Object.freeze({
  general: ["start_date", "end_date", "category", "status", "activity_id", "priority", "min_amount", "max_amount"],
  activities: ["start_date", "end_date", "category", "status", "activity_id", "priority"],
  budget: ["start_date", "end_date", "category", "activity_id", "min_amount", "max_amount"],
});

function buildReportParams(reportType, filters = {}, pagination = null) {
  const allowedFilters = REPORT_FILTERS[reportType];
  if (!allowedFilters) {
    throw new TypeError(`Tipo de informe no válido: ${reportType}`);
  }

  const params = new URLSearchParams();
  for (const key of allowedFilters) {
    const value = filters[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      // Los importes se mantienen como cadenas para preservar la precisión decimal.
      params.set(key, String(value).trim());
    }
  }

  if (pagination?.page != null && pagination?.page_size != null) {
    params.set("page", String(pagination.page));
    params.set("page_size", String(pagination.page_size));
  }

  return params;
}

async function getReport(reportType, periodId, { filters = {}, page, page_size, signal } = {}) {
  const endpoint = REPORT_ENDPOINTS[reportType];
  if (!endpoint) throw new TypeError(`Tipo de informe no válido: ${reportType}`);
  if (!periodId) throw new TypeError("Se requiere un período para consultar el informe.");

  const params = buildReportParams(reportType, filters, { page, page_size });
  const query = params.toString();
  const path = `/periods/${encodeURIComponent(periodId)}/reports/${endpoint}${query ? `?${query}` : ""}`;
  return request(path, { signal });
}

export function getGeneralReport(periodId, options = {}) {
  return getReport("general", periodId, options);
}

export function getActivitiesReport(periodId, options = {}) {
  return getReport("activities", periodId, options);
}

export function getBudgetReport(periodId, options = {}) {
  return getReport("budget", periodId, options);
}

export async function getBudgetComparison(periodId1, periodId2, { signal } = {}) {
  if (!periodId1 || !periodId2) {
    throw new TypeError("Se requieren dos períodos para comparar.");
  }
  if (periodId1 === periodId2) {
    throw new TypeError("La comparación requiere dos períodos diferentes.");
  }

  const params = new URLSearchParams({
    period_id_1: periodId1,
    period_id_2: periodId2,
  });
  return request(`/reports/budget-comparison?${params.toString()}`, { signal });
}

function getDownloadFilename(contentDisposition) {
  if (!contentDisposition) return null;

  const extended = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (extended) {
    try {
      return decodeURIComponent(extended[1].trim().replace(/^"|"$/g, ""));
    } catch {
      return null;
    }
  }

  const standard = contentDisposition.match(/filename\s*=\s*(?:"([^"]+)"|([^;]+))/i);
  return standard ? (standard[1] || standard[2]).trim() : null;
}

async function readDownloadError(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      const payload = await response.json();
      return payload?.error?.message || payload?.message || "No fue posible generar el informe.";
    } catch {
      return "No fue posible interpretar el error de generación del informe.";
    }
  }
  return (await response.text()) || "No fue posible generar el informe.";
}

/**
 * Solicita un archivo binario. La UI es responsable de iniciar la descarga
 * y liberar el object URL después de utilizarlo.
 */
export async function exportReport(reportType, periodId, {
  format,
  scope,
  filters = {},
  signal,
} = {}) {
  const endpoint = REPORT_ENDPOINTS[reportType];
  if (!endpoint) throw new TypeError(`Tipo de informe no válido: ${reportType}`);
  if (!periodId) throw new TypeError("Se requiere un período para exportar el informe.");
  if (!["pdf", "xlsx"].includes(format)) throw new TypeError("El formato debe ser pdf o xlsx.");
  if (!["filtered", "period"].includes(scope)) throw new TypeError("El alcance debe ser filtered o period.");

  const params = new URLSearchParams({ format, scope });
  if (scope === "filtered") {
    const applicable = buildReportParams(reportType, filters);
    for (const [key, value] of applicable.entries()) params.set(key, value);
  }

  let response;
  try {
    response = await fetch(
      `${API_BASE_URL}/periods/${encodeURIComponent(periodId)}/reports/${endpoint}?${params.toString()}`,
      { method: "GET", headers: { Accept: "application/pdf, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }, signal },
    );
  } catch {
    throw new ApiError({
      code: "NETWORK_ERROR",
      message: "No se pudo conectar con el servidor para generar el informe.",
    });
  }

  if (!response.ok) {
    throw new ApiError({
      status: response.status,
      code: "EXPORT_ERROR",
      message: await readDownloadError(response),
    });
  }

  const filename = getDownloadFilename(response.headers.get("content-disposition"));
  if (!filename) {
    throw new ApiError({
      status: response.status,
      code: "MISSING_FILENAME",
      message: "El servidor no proporcionó el nombre del archivo de descarga.",
    });
  }

  return {
    blob: await response.blob(),
    filename,
    contentType: response.headers.get("content-type") || "",
  };
}

export const reportServiceInternals = Object.freeze({
  buildReportParams,
  getDownloadFilename,
});
