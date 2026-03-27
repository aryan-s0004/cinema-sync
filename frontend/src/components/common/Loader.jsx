const Loader = ({ text = "Loading..." }) => (
  <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-cyan-300" />
    <span>{text}</span>
  </div>
);

export default Loader;
