import { useCallback, useState } from "react";
import { useAlerts } from "../features/dashboard/AlertsContext.jsx";
import { AlertsDrawer } from "../features/dashboard/AlertsDrawer.jsx";
import ActivitiesPage from "../features/activities/ActivitiesPage.jsx";
import BudgetExpensesPage from "../features/budget-expenses/BudgetExpensesPage.jsx";
import CalendarPage from "../features/calendar/CalendarPage.jsx";
import DashboardPage from "../features/dashboard/DashboardPage.jsx";
import DataManagementPage from "../features/data-management/DataManagementPage.jsx";
import ReportsPage from "../features/reports/ReportsPage.jsx";
import { EmptyState, ErrorState, LoadingState } from "../components/common/AsyncState.jsx";
import MobileNavigation from "../components/layout/MobileNavigation.jsx";
import Sidebar from "../components/layout/Sidebar.jsx";
import Topbar from "../components/layout/Topbar.jsx";
import { usePeriod } from "../context/PeriodContext.jsx";
import { useDataRecovery } from "../context/DataRecoveryContext.jsx";

const pageComponents = {
  dashboard: DashboardPage,
  calendar: CalendarPage,
  activities: ActivitiesPage,
  "budget-expenses": BudgetExpensesPage,
  reports: ReportsPage,
  "data-management": DataManagementPage,
};

function AppLayout() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [isMobileNavigationOpen, setIsMobileNavigationOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [activityDestinationId, setActivityDestinationId] = useState(null);
  const [dashboardRevision, setDashboardRevision] = useState(0);
  const { alerts, count, isLoading: alertsLoading, error: alertsError, notice, noticeIsError, isReviewing, refreshAlerts, markReviewed } = useAlerts();
  const { periods, isLoading, error, refreshPeriods } = usePeriod();
  const { isRefreshing: isRecovering, refreshError, restoreSucceeded, retryRefresh, revision } = useDataRecovery();
  const CurrentPage = pageComponents[activeSection] ?? DashboardPage;
  const closeAlerts = useCallback(() => setIsAlertsOpen(false), []);

  async function handleReview(alertId) {
    const reviewed = await markReviewed(alertId);
    if (reviewed) setDashboardRevision((current) => current + 1);
  }

  function handleNavigate(sectionId, activityId = null) {
    if (sectionId === "dashboard" && activeSection !== "dashboard") refreshAlerts();
    setActiveSection(sectionId);
    if (sectionId === "activities") setActivityDestinationId(activityId || null);
    else setActivityDestinationId(null);
    setIsMobileNavigationOpen(false);
  }

  function renderContent() {
    if (restoreSucceeded && (isRecovering || refreshError) && activeSection !== "data-management") {
      return (
        <section className="async-state async-state-error" role="alert">
          <h2>Actualización de datos pendiente</h2>
          <p>{isRecovering
            ? "La restauración fue exitosa. Se están actualizando los datos de la aplicación."
            : "La restauración fue exitosa, pero algunos datos no pudieron actualizarse. El acceso a información anterior permanece bloqueado."}</p>
          <div className="data-recovery-actions">
            <button type="button" className="state-action" onClick={() => handleNavigate("data-management")}>Ir a Gestión de datos</button>
            <button type="button" className="state-action" onClick={retryRefresh} disabled={isRecovering}>
              {isRecovering ? "Actualizando…" : "Reintentar actualización"}
            </button>
          </div>
        </section>
      );
    }
    if (isLoading && activeSection !== "data-management") return <LoadingState message="Consultando períodos…" />;
    if (error && activeSection !== "data-management") {
      return <ErrorState message={error.message} onRetry={refreshPeriods} />;
    }
    if (periods.length === 0 && activeSection !== "activities" && activeSection !== "data-management") {
      return (
        <EmptyState
          title="Aún no hay períodos registrados"
          message="Crea tu primer período para comenzar a planificar tus vacaciones decembrinas."
          actionLabel="Ir a Actividades"
          onAction={() => handleNavigate("activities")}
        />
      );
    }
    if (activeSection === "activities") return <CurrentPage activityId={activityDestinationId} />;
    return <CurrentPage key={activeSection === "data-management" ? undefined : `${activeSection}-${dashboardRevision}-${revision}`} />;
  }

  return (
    <div className="application-layout">
      <Sidebar activeSection={activeSection} onNavigate={handleNavigate} />

      <div className="main-column">
        <Topbar onMenuClick={() => setIsMobileNavigationOpen(true)} alertCount={count} onAlertsClick={() => setIsAlertsOpen(true)} />
        <main className="main-content" id="main-content" tabIndex="-1">
          {renderContent()}
        </main>
      </div>

      <AlertsDrawer open={isAlertsOpen} onClose={closeAlerts} alerts={alerts}
        isLoading={alertsLoading} error={alertsError} notice={notice} noticeIsError={noticeIsError} isReviewing={isReviewing}
        onRetry={refreshAlerts} onReview={handleReview}
        onNavigate={(activityId) => { setIsAlertsOpen(false); handleNavigate("activities", activityId); }} />

      <MobileNavigation
        activeSection={activeSection}
        isOpen={isMobileNavigationOpen}
        onNavigate={handleNavigate}
        onClose={() => setIsMobileNavigationOpen(false)}
      />
    </div>
  );
}

export default AppLayout;
