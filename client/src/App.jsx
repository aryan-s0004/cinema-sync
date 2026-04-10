import { Suspense } from "react";
import Navbar from "./components/common/Navbar";
import AppRoutes from "./routes/AppRoutes";

const RouteFallback = () => (
  <div className="flex min-h-[40vh] items-center justify-center">
    <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#E50914] border-t-transparent" />
  </div>
);

function App() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-4 sm:py-6">
        <Suspense fallback={<RouteFallback />}>
          <AppRoutes />
        </Suspense>
      </main>
    </div>
  );
}

export default App;
