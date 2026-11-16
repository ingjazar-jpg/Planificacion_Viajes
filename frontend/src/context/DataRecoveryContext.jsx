import {
  createContext, useCallback, useContext, useMemo, useState,
} from "react";
import { usePeriod } from "./PeriodContext.jsx";
import { getDashboard } from "../services/api/dashboardService.js";
import { getPendingActiveAlerts } from "../services/api/alertsService.js";
import { getActivities } from "../services/api/activitiesService.js";
import { getCalendar } from "../services/api/calendarService.js";
import { getBudget } from "../services/api/budgetService.js";
import { getExpenses } from "../services/api/expensesService.js";
import {
  getActivitiesReport, getBudgetReport, getGeneralReport,
} from "../services/api/reportsService.js";

const DataRecoveryContext = createContext(null);

function latestPeriod(periods) {
  return [...periods].sort((left, right) => {
    const dateOrder = new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
    if (dateOrder !== 0) return dateOrder;
    return Number(right.year ?? 0) - Number(left.year ?? 0);
  })[0] ?? null;
}

async function refreshPeriodData(periodId, period) {
  const requests = [
    getDashboard(periodId),
    getPendingActiveAlerts(periodId),
    getActivities({ period_id: periodId }),
    getCalendar({
      period_id: periodId,
      start_date: period.start_date,
      end_date: period.end_date,
    }),
    getExpenses({ period_id: periodId }),
    getGeneralReport(periodId),
    getActivitiesReport(periodId),
    getBudgetReport(periodId),
  ];

  // A period without a budget is a valid business state, not a refresh failure.
  requests.push(getBudget(periodId).catch((error) => {
    if (error?.status === 404 && error?.code === "BUDGET_NOT_FOUND") return null;
    throw error;
  }));

  const results = await Promise.allSettled(requests);
  const failed = results.find((result) => result.status === "rejected");
  if (failed) throw failed.reason;
}

export function DataRecoveryProvider({ children }) {
  const { selectedPeriodId, refreshPeriods } = usePeriod();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(null);
  const [restoreSucceeded, setRestoreSucceeded] = useState(false);
  const [revision, setRevision] = useState(0);

  const refreshRestoredData = useCallback(async () => {
    setIsRefreshing(true);
    setRefreshError(null);
    try {
      const periods = await refreshPeriods();
      if (!periods) throw new Error("No fue posible consultar los períodos después de la restauración.");

      const activePeriod = periods.find((period) => period.id === selectedPeriodId)
        ?? latestPeriod(periods);

      if (!activePeriod) {
        setRevision((value) => value + 1);
        return true;
      }
      await refreshPeriodData(activePeriod.id, activePeriod);
      setRevision((value) => value + 1);
      return true;
    } catch (error) {
      setRefreshError(error);
      return false;
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshPeriods, selectedPeriodId]);

  const completeRestoration = useCallback(async () => {
    setRestoreSucceeded(true);
    return refreshRestoredData();
  }, [refreshRestoredData]);

  const retryRefresh = useCallback(async () => {
    if (!restoreSucceeded) return false;
    return refreshRestoredData();
  }, [refreshRestoredData, restoreSucceeded]);

  const value = useMemo(() => ({
    isRefreshing,
    refreshError,
    restoreSucceeded,
    revision,
    completeRestoration,
    retryRefresh,
  }), [
    isRefreshing, refreshError, restoreSucceeded, revision,
    completeRestoration, retryRefresh,
  ]);

  return <DataRecoveryContext.Provider value={value}>{children}</DataRecoveryContext.Provider>;
}

export function useDataRecovery() {
  const context = useContext(DataRecoveryContext);
  if (!context) throw new Error("useDataRecovery debe utilizarse dentro de DataRecoveryProvider.");
  return context;
}
