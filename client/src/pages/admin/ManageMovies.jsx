import { useEffect, useMemo, useState } from "react";
import { adminApi } from "../../api/admin";
import Button from "../../components/ui/Button";
import formatDateTime from "../../utils/formatDate";

const blankMovieForm = {
  title: "",
  overview: "",
  language: "en",
  duration: "120",
  rating: "0",
  genres: "",
  posterPath: "",
  backdropPath: "",
  popularity: "0",
  releaseDate: "",
};

const toMovieForm = (movie) => ({
  title: movie?.title || "",
  overview: movie?.overview || "",
  language: movie?.language || "en",
  duration: String(movie?.duration || 120),
  rating: String(movie?.rating || 0),
  genres: Array.isArray(movie?.genres) ? movie.genres.join(", ") : "",
  posterPath: movie?.posterPath || "",
  backdropPath: movie?.backdropPath || "",
  popularity: String(movie?.popularity || 0),
  releaseDate: movie?.releaseDate ? new Date(movie.releaseDate).toISOString().slice(0, 10) : "",
});

const buildMoviePayload = (form) => ({
  title: form.title.trim(),
  overview: form.overview.trim(),
  language: form.language.trim() || "en",
  duration: Number(form.duration || 120),
  rating: Number(form.rating || 0),
  genres: form.genres
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
  posterPath: form.posterPath.trim(),
  backdropPath: form.backdropPath.trim(),
  popularity: Number(form.popularity || 0),
  releaseDate: form.releaseDate || null,
});

const ManageMovies = () => {
  const [movies, setMovies] = useState([]);
  const [form, setForm] = useState(blankMovieForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const loadMovies = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await adminApi.listMovies();
      setMovies(data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not load movies.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMovies();
  }, []);

  const movieCountLabel = useMemo(() => `${movies.length} active movie${movies.length === 1 ? "" : "s"}`, [movies]);

  const handleChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const resetComposer = () => {
    setEditingId(null);
    setForm(blankMovieForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      setInfo("");
      const payload = buildMoviePayload(form);

      if (editingId) {
        await adminApi.updateMovie(editingId, payload);
        setInfo("Movie updated.");
      } else {
        await adminApi.createMovie(payload);
        setInfo("Movie created.");
      }

      resetComposer();
      await loadMovies();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not save movie.");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (movie) => {
    setEditingId(movie._id);
    setForm(toMovieForm(movie));
    setInfo("");
    setError("");
  };

  const deactivateMovie = async (movieId) => {
    try {
      setSaving(true);
      setError("");
      setInfo("");
      await adminApi.deactivateMovie(movieId);
      setInfo("Movie deactivated.");
      if (editingId === movieId) {
        resetComposer();
      }
      await loadMovies();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not deactivate movie.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">Admin</p>
          <h1 className="text-3xl font-semibold text-white">Manage Movies</h1>
          <p className="text-sm text-slate-400">Create, update, and retire titles that appear in the customer experience.</p>
        </div>
        <p className="text-sm text-slate-400">{movieCountLabel}</p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_1.25fr]">
        <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">{editingId ? "Edit Movie" : "Add Movie"}</h2>
              <p className="text-xs text-slate-400">Keep the catalog fresh and accurate for booking pages.</p>
            </div>
            {editingId ? (
              <Button type="button" variant="secondary" onClick={resetComposer}>
                Cancel Edit
              </Button>
            ) : null}
          </div>

          <label className="block text-sm text-slate-200">
            <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-500">Title</span>
            <input value={form.title} onChange={handleChange("title")} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400/40" required />
          </label>

          <label className="block text-sm text-slate-200">
            <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-500">Overview</span>
            <textarea value={form.overview} onChange={handleChange("overview")} rows={4} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400/40" />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm text-slate-200">
              <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-500">Language</span>
              <input value={form.language} onChange={handleChange("language")} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400/40" />
            </label>
            <label className="block text-sm text-slate-200">
              <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-500">Release Date</span>
              <input type="date" value={form.releaseDate} onChange={handleChange("releaseDate")} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400/40" />
            </label>
            <label className="block text-sm text-slate-200">
              <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-500">Duration (min)</span>
              <input type="number" min="1" value={form.duration} onChange={handleChange("duration")} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400/40" />
            </label>
            <label className="block text-sm text-slate-200">
              <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-500">Rating</span>
              <input type="number" min="0" max="10" step="0.1" value={form.rating} onChange={handleChange("rating")} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400/40" />
            </label>
            <label className="block text-sm text-slate-200 sm:col-span-2">
              <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-500">Genres</span>
              <input value={form.genres} onChange={handleChange("genres")} placeholder="Action, Thriller, Comedy" className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400/40" />
            </label>
            <label className="block text-sm text-slate-200">
              <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-500">Poster URL</span>
              <input value={form.posterPath} onChange={handleChange("posterPath")} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400/40" />
            </label>
            <label className="block text-sm text-slate-200">
              <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-500">Backdrop URL</span>
              <input value={form.backdropPath} onChange={handleChange("backdropPath")} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400/40" />
            </label>
            <label className="block text-sm text-slate-200">
              <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-500">Popularity</span>
              <input type="number" min="0" step="0.1" value={form.popularity} onChange={handleChange("popularity")} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400/40" />
            </label>
          </div>

          {error ? <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
          {info ? <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{info}</p> : null}

          <Button type="submit" className="w-full" loading={saving}>
            {editingId ? "Update Movie" : "Create Movie"}
          </Button>
        </form>

        <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Live Catalog</h2>
              <p className="text-xs text-slate-400">Active movies sorted by current popularity.</p>
            </div>
            <Button type="button" variant="secondary" onClick={loadMovies} loading={loading}>
              Refresh
            </Button>
          </div>

          {loading ? <p className="text-sm text-slate-400">Loading movies...</p> : null}

          {!loading && movies.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-400">
              No active movies available.
            </p>
          ) : null}

          <div className="space-y-3">
            {movies.map((movie) => (
              <article key={movie._id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-white">{movie.title}</h3>
                      <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-xs text-cyan-100">
                        {movie.language?.toUpperCase?.() || "EN"}
                      </span>
                    </div>
                    <p className="line-clamp-2 max-w-2xl text-sm text-slate-400">{movie.overview || "No overview available."}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                      <span>Rating: {movie.rating || 0}</span>
                      <span>Duration: {movie.duration || 120} min</span>
                      <span>Popularity: {movie.popularity || 0}</span>
                      <span>Updated: {formatDateTime(movie.updatedAt)}</span>
                    </div>
                    {Array.isArray(movie.genres) && movie.genres.length ? (
                      <div className="flex flex-wrap gap-2">
                        {movie.genres.map((genre) => (
                          <span key={genre} className="rounded-full border border-slate-700 px-2 py-0.5 text-xs text-slate-300">
                            {genre}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" onClick={() => startEdit(movie)}>
                      Edit
                    </Button>
                    <Button type="button" onClick={() => deactivateMovie(movie._id)} loading={saving}>
                      Deactivate
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ManageMovies;
