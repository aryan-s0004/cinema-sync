import Navbar from "./components/common/Navbar";
import AppRoutes from "./routes/AppRoutes";

function App() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <AppRoutes />
      </main>
    </div>
  );
}

export default App;
