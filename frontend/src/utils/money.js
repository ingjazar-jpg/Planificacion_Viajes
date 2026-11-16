const DECIMAL_PATTERN = /^-?\d+(?:\.\d{1,2})?$/;

/**
 * Convierte una cadena decimal a centavos enteros sin usar aritmética binaria.
 * No redondea: los valores con más de dos decimales se rechazan.
 */
export function decimalToCents(value) {
  if (typeof value !== "string") {
    throw new TypeError("El importe debe recibirse como cadena decimal.");
  }

  const normalized = value.trim();
  if (!DECIMAL_PATTERN.test(normalized)) {
    throw new RangeError("El importe debe ser una cadena decimal con máximo dos decimales.");
  }

  const negative = normalized.startsWith("-");
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [whole, fraction = ""] = unsigned.split(".");
  const cents = (BigInt(whole) * 100n) + BigInt(fraction.padEnd(2, "0"));
  return negative ? -cents : cents;
}

/** Serializa centavos enteros como cadena decimal con exactamente dos posiciones. */
export function centsToDecimal(cents) {
  if (typeof cents !== "bigint") {
    throw new TypeError("Los centavos deben representarse mediante BigInt.");
  }

  const negative = cents < 0n;
  const absolute = negative ? -cents : cents;
  const whole = absolute / 100n;
  const fraction = String(absolute % 100n).padStart(2, "0");
  return `${negative ? "-" : ""}${whole}.${fraction}`;
}

/** Formatea una cadena decimal como COP conservando precisión exacta. */
export function formatMoneyCOP(value) {
  const cents = decimalToCents(value);
  const negative = cents < 0n;
  const absolute = negative ? -cents : cents;
  const whole = String(absolute / 100n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const fraction = String(absolute % 100n).padStart(2, "0");

  return `${negative ? "-" : ""}$ ${whole},${fraction}`;
}

/** Calcula la diferencia entre presupuesto y asignaciones en centavos exactos. */
export function getUndistributedCents(totalBudget, categoryAmounts) {
  if (!Array.isArray(categoryAmounts)) {
    throw new TypeError("Las asignaciones deben proporcionarse en un arreglo.");
  }

  const total = decimalToCents(totalBudget);
  const allocated = categoryAmounts.reduce(
    (sum, amount) => sum + decimalToCents(amount),
    0n,
  );

  return total - allocated;
}
