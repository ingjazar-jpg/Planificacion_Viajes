import AppLayout from "./layouts/AppLayout.jsx";
import { PeriodProvider } from "./context/PeriodContext.jsx";
import { AlertsProvider } from "./features/dashboard/AlertsContext.jsx";

function App() {
  return (
    <PeriodProvider>
      <AlertsProvider>
        <AppLayout />
      </AlertsProvider>
    </PeriodProvider>
  );
}

export default App;
