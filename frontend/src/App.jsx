import AppLayout from "./layouts/AppLayout.jsx";
import { PeriodProvider } from "./context/PeriodContext.jsx";
import { AlertsProvider } from "./features/dashboard/AlertsContext.jsx";
import { DataRecoveryProvider } from "./context/DataRecoveryContext.jsx";

function App() {
  return (
    <PeriodProvider>
      <DataRecoveryProvider>
        <AlertsProvider>
          <AppLayout />
        </AlertsProvider>
      </DataRecoveryProvider>
    </PeriodProvider>
  );
}

export default App;
