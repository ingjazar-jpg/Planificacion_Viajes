import { useState } from "react";
import ActivitiesPage from "../features/activities/ActivitiesPage.jsx";
import BudgetExpensesPage from "../features/budget-expenses/BudgetExpensesPage.jsx";
import CalendarPage from "../features/calendar/CalendarPage.jsx";
import DashboardPage from "../features/dashboard/DashboardPage.jsx";
import DataManagementPage from "../features/data-management/DataManagementPage.jsx";
import ReportsPage from "../features/reports/ReportsPage.jsx";
import MobileNavigation from "../components/layout/MobileNavigation.jsx";
import Sidebar from "../components/layout/Sidebar.jsx";
import Topbar from "../components/layout/Topbar.jsx";

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
  const CurrentPage = pageComponents[activeSection] ?? DashboardPage;

  function handleNavigate(sectionId) {
    setActiveSection(sectionId);
    setIsMobileNavigationOpen(false);
  }

  return (
    <div className="application-layout">
      <Sidebar activeSection={activeSection} onNavigate={handleNavigate} />

      <div className="main-column">
        <Topbar onMenuClick={() => setIsMobileNavigationOpen(true)} />
        <main className="main-content" id="main-content" tabIndex="-1">
          <CurrentPage />
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
