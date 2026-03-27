const PageState = ({ loading, error, empty, children, loadingText = "Loading...", emptyText = "No data found" }) => {
  if (loading) {
    return <p className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 text-center text-slate-300">{loadingText}</p>;
  }

  if (error) {
    return <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-6 text-center text-rose-300">{error}</p>;
  }

  if (empty) {
    return <p className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-slate-400">{emptyText}</p>;
  }

  return children;
};

export default PageState;
