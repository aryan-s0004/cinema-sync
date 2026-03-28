import { useState } from "react";
import { bookingApi } from "../../api/bookings";
import formatDateTime from "../../utils/formatDate";

const TicketScannerPage = () => {
  const [qrData, setQrData] = useState("");
  const [gate, setGate] = useState("Gate A");
  const [deviceId, setDeviceId] = useState("scanner-01");
  const [consume, setConsume] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const submitScan = async (event) => {
    event.preventDefault();
    if (!qrData.trim() || loading) return;

    try {
      setLoading(true);
      setError("");
      const data = await bookingApi.scanTicket({
        qrData: qrData.trim(),
        gate: gate.trim() || null,
        deviceId: deviceId.trim() || null,
        consume,
      });
      setResult(data);
    } catch (err) {
      setResult(null);
      setError(err.response?.data?.message || "Ticket scan failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-3xl space-y-5">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-white">Ticket Scanner</h1>
        <p className="text-sm text-slate-400">
          Validate and consume QR tickets at entry. First consume scan allows entry, repeat scans are blocked.
        </p>
      </header>

      <form onSubmit={submitScan} className="space-y-4 rounded-2xl border border-slate-700 bg-slate-900/70 p-4 sm:p-5">
        <label className="block space-y-2 text-sm text-slate-200">
          <span>QR Payload / Token</span>
          <textarea
            value={qrData}
            onChange={(event) => setQrData(event.target.value)}
            rows={4}
            className="w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400"
            placeholder="Paste scanned qrData or signed token"
            required
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-200">
            <span>Gate</span>
            <input
              value={gate}
              onChange={(event) => setGate(event.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400"
            />
          </label>
          <label className="space-y-2 text-sm text-slate-200">
            <span>Device ID</span>
            <input
              value={deviceId}
              onChange={(event) => setDeviceId(event.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400"
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={consume} onChange={(event) => setConsume(event.target.checked)} />
          Consume ticket on success (disable for dry-run validation)
        </label>

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Validating..." : consume ? "Validate and Allow Entry" : "Validate Only"}
        </button>
      </form>

      {error ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>
      ) : null}

      {result ? (
        <article className="space-y-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">
            {result.consumed ? "Entry Allowed" : "Ticket Valid"}
          </p>
          <p>Ticket: {result.ticketCode}</p>
          <p>Movie: {result.movieTitle}</p>
          <p>Show Time: {formatDateTime(result.showTime)}</p>
          <p>Seats: {(result.seatLabels || []).join(", ") || "N/A"}</p>
          {result.scannedAt ? <p>Scanned At: {formatDateTime(result.scannedAt)}</p> : null}
          {typeof result.scanCount === "number" ? <p>Scan Count: {result.scanCount}</p> : null}
        </article>
      ) : null}
    </section>
  );
};

export default TicketScannerPage;
