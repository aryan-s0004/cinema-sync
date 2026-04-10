const joinClass = (...values) => values.filter(Boolean).join(" ");

const Button = ({ className = "", variant = "primary", loading = false, children, ...props }) => {
  const variantClass = {
    primary: "bg-brand-500 text-white hover:bg-brand-700",
    secondary: "border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800",
    ghost: "text-slate-300 hover:bg-slate-900"
  }[variant];

  return (
    <button
      className={joinClass(
        "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
        variantClass,
        className
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? "Please wait..." : children}
    </button>
  );
};

export default Button;
