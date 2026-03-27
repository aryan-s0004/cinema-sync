const joinClass = (...values) => values.filter(Boolean).join(" ");

const Input = ({ label, error, className = "", ...props }) => (
  <label className="block space-y-1">
    {label ? <span className="text-sm font-medium text-slate-300">{label}</span> : null}
    <input
      className={joinClass(
        "w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-brand-500",
        error ? "border-rose-500 focus:border-rose-500" : "",
        className
      )}
      {...props}
    />
    {error ? <span className="text-xs text-rose-400">{error}</span> : null}
  </label>
);

export default Input;
