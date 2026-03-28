import { Link } from "react-router-dom";

const AdminDashboard = () => (
  <section className="space-y-4">
    <header className="space-y-2">
      <h1 className="text-2xl font-semibold text-white">Admin Dashboard</h1>
      <p className="text-sm text-slate-400">Secure operations for on-ground entry and show management.</p>
    </header>

    <div className="grid gap-3 sm:grid-cols-2">
      <Link
        to="/admin/scanner"
        className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4 text-sm text-cyan-100 transition hover:bg-cyan-500/20"
      >
        Open Ticket Scanner
      </Link>
      <Link
        to="/admin/shows"
        className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-200 transition hover:border-slate-500"
      >
        Manage Shows
      </Link>
    </div>
  </section>
);

export default AdminDashboard;
