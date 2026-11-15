// Estado efímero de la sesión: no utiliza localStorage ni sessionStorage.
const evaluatedPeriods = new Set();
const evaluationsInFlight = new Map();

export function ensurePeriodEvaluated(periodId, evaluate) {
  if (evaluatedPeriods.has(periodId)) return Promise.resolve(false);
  if (evaluationsInFlight.has(periodId)) return evaluationsInFlight.get(periodId);

  const request = Promise.resolve()
    .then(() => evaluate(periodId))
    .then((result) => {
      evaluatedPeriods.add(periodId);
      return result;
    })
    .finally(() => evaluationsInFlight.delete(periodId));

  evaluationsInFlight.set(periodId, request);
  return request;
}

export function hasPeriodBeenEvaluated(periodId) {
  return evaluatedPeriods.has(periodId);
}
