import { useState } from "react";
import { pageMetadata } from "../config/navigation.js";
import ModulePlaceholder from "../components/common/ModulePlaceholder.jsx";
import MobileNavigation from "../components/layout/MobileNavigation.jsx";
import Sidebar from "../components/layout/Sidebar.jsx";
import Topbar from "../components/layout/Topbar.jsx";

function AppLayout() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [isMobileNavigationOpen, setIsMobileNavigationOpen] = useState(false);
  const currentPage = pageMetadata[activeSection] ?? pageMetadata.dashboard;

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
          <ModulePlaceholder
            title={currentPage.title}
            description={currentPage.description}
          />
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
