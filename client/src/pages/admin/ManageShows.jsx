import { useEffect, useMemo, useState } from "react";
import { adminApi } from "../../api/admin";
import Button from "../../components/ui/Button";
import formatDateTime from "../../utils/formatDate";
import formatPrice from "../../utils/formatPrice";

const blankShowForm = {
  movie: "",
  theatreName: "CinemaSync Multiplex",
  screenName: "Screen 1",
  showTime: "",
  price: "250",
  totalSeats: "60",
};

const ManageShows = () => {
  const [movies, setMovies] = useState([]);
  const [shows, setShows] = useState([]);
  const [form, setForm] = useState(blankShowForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const [movieData, showData] = await Promise.all([adminApi.listMovies(), adminApi.listShows()]);
      setMovies(movieData);
      setShows(showData);
      setForm((current) => ({
        ...current,
        movie: current.movie || movieData[0]?._id || "",
      }));
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not load show management data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const sortedShows = useMemo(
    () => [...shows].sort((left, right) => new Date(left.showTime).getTime() - new Date(right.showTime).getTime()),
    [shows]
  );

  const handleChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      setInfo("");
      await adminApi.createShow({
        movie: form.movie,
        theatreName: form.theatreName.trim(),
        screenName: form.screenName.trim(),
        showTime: form.showTime,
        price: Number(form.price || 0),
        totalSeats: Number(form.totalSeats || 0),
      });
      setInfo("Show created.");
      setForm((current) => ({
        ...blankShowForm,
        movie: current.movie,
        theatreName: current.theatreName,
        screenName: current.screenName,
      }));
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not create show.");
    } finally {
      setSaving(false);
    }
  };

  const cancelShow = async (showId) => {
    try {
      setSaving(true);
      setError("");
      setInfo("");
      await adminApi.cancelShow(showId);
      setInfo("Show cancelled.");
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not cancel show.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">Admin</p>
          <h1 className="text-3xl font-semibold text-white">Manage Shows</h1>
          <p className="text-sm text-slate-400">Schedule upcoming screenings and retire cancelled slots cleanly.</p>
        </div>
        <p className="text-sm text-slate-400">{shows.length} active show{shows.length === 1 ? "" : "s"}</p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.3fr]">
        <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
          <div>
            <h2 className="text-lg font-semibold text-white">Add Show</h2>
            <p className="text-xs text-slate-400">Create a new screening and the backend will auto-generate seat inventory.</p>
          </div>

          <label className="block text-sm text-slate-200">
            <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-500">Movie</span>
            <select value={form.movie} onChange={handleChange("movie")} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400/40" required>
              <option value="" disabled>Select a movie</option>
              {movies.map((movie) => (
                <option key={movie._id} value={movie._id}>
                  {movie.title}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm text-slate-200">
              <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-500">Theatre Name</span>
              <input value={form.theatreName} onChange={handleChange("theatreName")} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400/40" required />
            </label>
            <label className="block text-sm text-slate-200">
              <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-500">Screen Name</span>
              <input value={form.screenName} onChange={handleChange("screenName")} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400/40" />
            </label>
            <label className="block text-sm text-slate-200 sm:col-span-2">
              <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-500">Show Time</span>
              <input type="datetime-local" value={form.showTime} onChange={handleChange("showTime")} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400/40" required />
            </label>
            <label className="block text-sm text-slate-200">
              <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-500">Price</span>
              <input type="number" min="1" value={form.price} onChange={handleChange("price")} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400/40" required />
            </label>
            <label className="block text-sm text-slate-200">
              <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-500">Total Seats</span>
              <input type="number" min="1" max="500" value={form.totalSeats} onChange={handleChange("totalSeats")} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400/40" required />
            </label>
          </div>

          {error ? <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
          {info ? <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{info}</p> : null}

          <Button type="submit" className="w-full" loading={saving}>
            Create Show
          </Button>
        </form>

        <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Upcoming Shows</h2>
              <p className="text-xs text-slate-400">Active screenings currently visible to the booking flow.</p>
            </div>
            <Button type="button" variant="secondary" onClick={loadData} loading={loading}>
              Refresh
            </Button>
          </div>

          {loading ? <p className="text-sm text-slate-400">Loading shows...</p> : null}

          {!loading && sortedShows.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-400">
              No active shows scheduled yet.
            </p>
          ) : null}

          <div className="space-y-3">
            {sortedShows.map((show) => (
              <article key={show._id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-white">{show.movie?.title || "Movie unavailable"}</h3>
                      <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-xs text-cyan-100">
                        {show.screenName}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400">{show.theatreName}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                      <span>{formatDateTime(show.showTime)}</span>
                      <span>{formatPrice(show.price)} per seat</span>
                      <span>{show.totalSeats} seats</span>
                    </div>
                  </div>

                  <Button type="button" onClick={() => cancelShow(show._id)} loading={saving}>
                    Cancel Show
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ManageShows;
