import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from "react";
import { usePeriod } from "../../context/PeriodContext.jsx";
import {
  evaluateAlerts, getPendingActiveAlerts, reviewAlert,
} from "../../services/api/alertsService.js";
import { ensurePeriodEvaluated } from "./alertSession.js";

const AlertsContext = createContext(null);

export function AlertsProvider({ children }) {
  const { selectedPeriodId } = usePeriod();
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isReviewing, setIsReviewing] = useState([]);
  const [notice, setNotice] = useState("");

  const refreshAlerts = useCallback(async ({ retryEvaluation = false } = {}) => {
    if (!selectedPeriodId) {
      setAlerts([]);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    setAlerts([]);
    setNotice("");
    try {
      await ensurePeriodEvaluated(selectedPeriodId, evaluateAlerts);
      const nextAlerts = await getPendingActiveAlerts(selectedPeriodId);
      setAlerts(nextAlerts);
    } catch (requestError) {
      setAlerts([]);
      setError(requestError);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPeriodId]);

  useEffect(() => {
    refreshAlerts();
  }, [refreshAlerts]);

  const markReviewed = useCallback(async (alertId) => {
    setIsReviewing((current) => [...current, alertId]);
    setNotice("");
    try {
      await reviewAlert(alertId);
      setAlerts((current) => current.filter((alert) => alert.id !== alertId));
      setNotice("Alerta marcada como revisada.");
      return true;
    } catch (requestError) {
      setNotice(requestError.message || "No fue posible marcar la alerta como revisada.");
      return false;
    } finally {
      setIsReviewing((current) => current.filter((id) => id !== alertId));
    }
  }, []);

  const value = useMemo(() => ({
    alerts, count: alerts.length, isLoading, error, notice, isReviewing,
    refreshAlerts, markReviewed,
  }), [alerts, isLoading, error, notice, isReviewing, refreshAlerts, markReviewed]);

  return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>;
}

export function useAlerts() {
  const context = useContext(AlertsContext);
  if (!context) throw new Error("useAlerts debe utilizarse dentro de AlertsProvider.");
  return context;
}
