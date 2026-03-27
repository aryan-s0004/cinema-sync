const SkeletonCard = () => (
  <div className="animate-pulse rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
    <div className="mb-3 aspect-[2/3] rounded-xl bg-slate-800" />
    <div className="mb-2 h-4 w-2/3 rounded bg-slate-800" />
    <div className="h-3 w-1/2 rounded bg-slate-800" />
  </div>
);

export default SkeletonCard;
