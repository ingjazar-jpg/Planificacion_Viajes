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
  const { alerts, count, isLoading: alertsLoading, error: alertsError, notice, isReviewing, refreshAlerts, markReviewed } = useAlerts();
  const { periods, isLoading, error, refreshPeriods } = usePeriod();
  const CurrentPage = pageComponents[activeSection] ?? DashboardPage;
  const closeAlerts = useCallback(() => setIsAlertsOpen(false), []);

  async function handleReview(alertId) {
    const reviewed = await markReviewed(alertId);
    if (reviewed) setDashboardRevision((current) => current + 1);
  }

  function handleNavigate(sectionId, activityId = null) {
    if (sectionId === "dashboard" && activeSection !== "dashboard") refreshAlerts();
    setActiveSection(sectionId);
    if (sectionId === "activities" && activityId) setActivityDestinationId(activityId);
    setIsMobileNavigationOpen(false);
  }

  function renderContent() {
    if (isLoading) return <LoadingState message="Consultando períodos…" />;
    if (error) {
      return <ErrorState message={error.message} onRetry={refreshPeriods} />;
    }
    if (periods.length === 0 && activeSection !== "activities") {
      return (
        <EmptyState
          title="Aún no hay períodos registrados"
          message="Crea tu primer período para comenzar a planificar tus vacaciones decembrinas."
          actionLabel="Ir a Actividades"
          onAction={() => handleNavigate("activities")}
        />
      );
    }
    return activeSection === "activities"
      ? <CurrentPage activityId={activityDestinationId} />
      : <CurrentPage />;
  }

  return (
    <div className="application-layout">
      <Sidebar activeSection={activeSection} onNavigate={handleNavigate} />

      <div className="main-column">
        <Topbar onMenuClick={() => setIsMobileNavigationOpen(true)} alertCount={count} onAlertsClick={() => setIsAlertsOpen(true)} />
        <main className="main-content" id="main-content" tabIndex="-1">
          {activeSection === "dashboard" ? <CurrentPage key={dashboardRevision} /> : renderContent()}
        </main>
      </div>

      <AlertsDrawer open={isAlertsOpen} onClose={closeAlerts} alerts={alerts}
        isLoading={alertsLoading} error={alertsError} notice={notice} isReviewing={isReviewing}
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
