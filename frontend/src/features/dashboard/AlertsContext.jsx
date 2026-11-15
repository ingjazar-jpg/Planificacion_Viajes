import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
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
  const [noticeIsError, setNoticeIsError] = useState(false);
  const requestSequence = useRef(0);

  const refreshAlerts = useCallback(async () => {
    const requestId = ++requestSequence.current;
    if (!selectedPeriodId) {
      setAlerts([]);
      setError(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    setAlerts([]);
    setNotice("");
    setNoticeIsError(false);
    try {
      await ensurePeriodEvaluated(selectedPeriodId, evaluateAlerts);
      const nextAlerts = await getPendingActiveAlerts(selectedPeriodId);
      if (requestId === requestSequence.current) setAlerts(nextAlerts);
    } catch (requestError) {
      if (requestId === requestSequence.current) {
        setAlerts([]);
        setError(requestError);
      }
    } finally {
      if (requestId === requestSequence.current) setIsLoading(false);
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
      setNoticeIsError(false);
      return true;
    } catch (requestError) {
      setNotice(requestError.message || "No fue posible marcar la alerta como revisada.");
      setNoticeIsError(true);
      return false;
    } finally {
      setIsReviewing((current) => current.filter((id) => id !== alertId));
    }
  }, []);

  const value = useMemo(() => ({
    alerts, count: alerts.length, isLoading, error, notice, noticeIsError, isReviewing,
    refreshAlerts, markReviewed,
  }), [alerts, isLoading, error, notice, noticeIsError, isReviewing, refreshAlerts, markReviewed]);

  return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>;
}

export function useAlerts() {
  const context = useContext(AlertsContext);
  if (!context) throw new Error("useAlerts debe utilizarse dentro de AlertsProvider.");
  return context;
}
