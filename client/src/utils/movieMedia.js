export const isGeneratedMovieAsset = (src = "") => String(src).startsWith("data:image/svg+xml");

export const getPosterImageClassName = (src = "", compact = false) => {
  if (isGeneratedMovieAsset(src)) {
    return compact
      ? "h-full w-full object-contain bg-slate-950 p-3 transition duration-500 group-hover:scale-[1.02]"
      : "h-full w-full object-contain bg-slate-950 p-6 transition duration-500 group-hover:scale-[1.02]";
  }

  return "h-full w-full object-cover transition duration-700 group-hover:scale-105";
};
