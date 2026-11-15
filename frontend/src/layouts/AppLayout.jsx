import { useState } from "react";
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
  const { periods, isLoading, error, refreshPeriods } = usePeriod();
  const CurrentPage = pageComponents[activeSection] ?? DashboardPage;

  function handleNavigate(sectionId) {
    setActiveSection(sectionId);
    setIsMobileNavigationOpen(false);
  }

  function renderContent() {
    if (isLoading) return <LoadingState message="Consultando períodos…" />;
    if (error) {
      return <ErrorState message={error.message} onRetry={refreshPeriods} />;
    }
    if (periods.length === 0) {
      return (
        <EmptyState
          title="Aún no hay períodos registrados"
          message="Crea tu primer período para comenzar a planificar tus vacaciones decembrinas."
          actionLabel="Ir a Actividades"
          onAction={() => handleNavigate("activities")}
        />
      );
    }
    return <CurrentPage />;
  }

  return (
    <div className="application-layout">
      <Sidebar activeSection={activeSection} onNavigate={handleNavigate} />

      <div className="main-column">
        <Topbar onMenuClick={() => setIsMobileNavigationOpen(true)} />
        <main className="main-content" id="main-content" tabIndex="-1">
          {renderContent()}
        </main>
      </div>

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
