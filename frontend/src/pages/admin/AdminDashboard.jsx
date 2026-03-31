import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "../../api/auth";

const badgeClasses = (ok) =>
  ok
    ? "inline-flex rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-200"
    : "inline-flex rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-xs text-rose-200";

const ProviderRow = ({ title, configured, detail }) => (
  <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2">
    <div>
      <p className="text-sm font-medium text-white">{title}</p>
      <p className="text-xs text-slate-400">{detail}</p>
    </div>
    <span className={badgeClasses(configured)}>{configured ? "Ready" : "Missing"}</span>
  </div>
);

const AdminDashboard = () => {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadHealth = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await authApi.providerHealth();
      setHealth(data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not fetch provider health.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
  }, []);

  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-white">Admin Dashboard</h1>
        <p className="text-sm text-slate-400">Secure operations for on-ground entry and show management.</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-1">
        <Link
          to="/admin/shows"
          className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-200 transition hover:border-slate-500"
        >
          Manage Shows
        </Link>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">Auth Health</h2>
            <p className="text-xs text-slate-400">Live readiness for Google, Gmail and SMS OTP providers.</p>
          </div>
          <button
            type="button"
            className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-200 transition hover:border-slate-400"
            onClick={loadHealth}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {error ? <p className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-200">{error}</p> : null}

        {!health && !error ? <p className="text-xs text-slate-400">Loading provider status...</p> : null}

        {health ? (
          <div className="space-y-2">
            <ProviderRow
              title="Google OAuth"
              configured={Boolean(health.google?.configured)}
              detail={health.google?.clientIdPreview ? `Client: ${health.google.clientIdPreview}` : "Client ID not set"}
            />
            <ProviderRow
              title="Gmail / SMTP"
              configured={Boolean(health.email?.configured)}
              detail={`${health.email?.provider || "gmail"}${health.email?.fallbackToLog ? " (fallback log on)" : ""}`}
            />
            <ProviderRow
              title="Phone OTP SMS"
              configured={Boolean(health.sms?.configured)}
              detail={`${health.sms?.provider || "none"}${health.sms?.fallbackToLog ? " (fallback log on)" : ""}`}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default AdminDashboard;
