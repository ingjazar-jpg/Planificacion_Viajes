import AppLayout from "./layouts/AppLayout.jsx";
import { PeriodProvider } from "./context/PeriodContext.jsx";

function App() {
  return (
    <PeriodProvider>
      <AppLayout />
    </PeriodProvider>
  );
}

export default App;
