import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getPeriods } from "../services/api/periodsService.js";

const PeriodContext = createContext(null);

export function PeriodProvider({ children }) {
  const [periods, setPeriods] = useState([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshPeriods = useCallback(async (preferredPeriodId = null) => {
    setIsLoading(true);
    setError(null);

    try {
      const nextPeriods = await getPeriods();
      setPeriods(nextPeriods);
      setSelectedPeriodId((currentId) => {
        if (preferredPeriodId && nextPeriods.some((period) => period.id === preferredPeriodId)) {
          return preferredPeriodId;
        }
        if (currentId && nextPeriods.some((period) => period.id === currentId)) {
          return currentId;
        }
        return [...nextPeriods].sort((left, right) => {
          const dateOrder = String(right.created_at ?? "").localeCompare(String(left.created_at ?? ""));
          if (dateOrder !== 0) return dateOrder;
          return Number(right.year ?? 0) - Number(left.year ?? 0);
        })[0]?.id ?? null;
      });
      return nextPeriods;
    } catch (requestError) {
      setError(requestError);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshPeriods();
  }, [refreshPeriods]);

  const selectPeriod = useCallback((periodId) => {
    if (periods.some((period) => period.id === periodId)) {
      setSelectedPeriodId(periodId);
    }
  }, [periods]);

  const selectedPeriod = periods.find((period) => period.id === selectedPeriodId) ?? null;
  const value = useMemo(() => ({
    periods,
    selectedPeriodId,
    selectedPeriod,
    isLoading,
    error,
    refreshPeriods,
    selectPeriod,
  }), [
    periods,
    selectedPeriodId,
    selectedPeriod,
    isLoading,
    error,
    refreshPeriods,
    selectPeriod,
  ]);

  return <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>;
}

export function usePeriod() {
  const context = useContext(PeriodContext);
  if (!context) {
    throw new Error("usePeriod debe utilizarse dentro de PeriodProvider.");
  }
  return context;
}
