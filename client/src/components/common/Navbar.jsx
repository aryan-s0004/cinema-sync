import { Link, NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import useAuth from "../../hooks/useAuth";

const navClass = ({ isActive }) =>
  [
    "rounded-lg px-3 py-1.5 text-sm font-medium transition",
    isActive
      ? "bg-[#E50914]/15 text-[#ff6a72] border border-[#E50914]/20"
      : "text-slate-300 hover:bg-slate-800 hover:text-white",
  ].join(" ");

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a0b]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:py-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl font-black tracking-tight text-white">
            Cinema<span className="text-[#E50914]">Sync</span>
          </span>
        </Link>

        {/* Mobile menu toggle */}
        <button
          type="button"
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-200 transition hover:bg-white/10 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? "Close" : "Menu"}
        </button>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          <NavLink to="/" className={navClass} end>
            Home
          </NavLink>
          <NavLink to="/search" className={navClass}>
            Search
          </NavLink>

          {isAuthenticated ? (
            <>
              <NavLink to="/dashboard" className={navClass}>
                Dashboard
              </NavLink>

              {user?.role === "admin" && (
                <NavLink to="/admin" className={navClass}>
                  Admin
                </NavLink>
              )}

              <div className="ml-2 flex items-center gap-3 border-l border-white/10 pl-3">
                <span className="max-w-[120px] truncate text-xs text-slate-400">{user?.name}</span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-rose-500/10 hover:text-rose-300 hover:border-rose-500/20"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <div className="ml-2 flex items-center gap-2">
              <NavLink to="/login" className={navClass}>
                Login
              </NavLink>
              <NavLink
                to="/register"
                className="rounded-xl bg-[#E50914] px-4 py-1.5 text-sm font-bold text-white transition hover:bg-[#f11a26]"
              >
                Sign Up
              </NavLink>
            </div>
          )}
        </nav>
      </div>

      {/* Mobile nav */}
      {open && (
        <nav className="border-t border-white/5 bg-[#0a0a0b] px-4 py-4 md:hidden">
          <div className="flex flex-col gap-2">
            <NavLink to="/" className={navClass} end onClick={() => setOpen(false)}>
              Home
            </NavLink>
            <NavLink to="/search" className={navClass} onClick={() => setOpen(false)}>
              Search
            </NavLink>

            {isAuthenticated ? (
              <>
                <NavLink to="/dashboard" className={navClass} onClick={() => setOpen(false)}>
                  Dashboard
                </NavLink>

                {user?.role === "admin" && (
                  <NavLink to="/admin" className={navClass} onClick={() => setOpen(false)}>
                    Admin Panel
                  </NavLink>
                )}

                <div className="mt-2 border-t border-white/5 pt-2">
                  <p className="mb-2 px-3 text-xs text-slate-500">{user?.name}</p>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full rounded-xl border border-white/10 px-3 py-2 text-left text-sm font-medium text-slate-300 transition hover:bg-rose-500/10 hover:text-rose-300"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <div className="mt-2 flex flex-col gap-2 border-t border-white/5 pt-2">
                <NavLink to="/login" className={navClass} onClick={() => setOpen(false)}>
                  Login
                </NavLink>
                <NavLink
                  to="/register"
                  className="rounded-xl bg-[#E50914] px-4 py-2 text-center text-sm font-bold text-white"
                  onClick={() => setOpen(false)}
                >
                  Sign Up
                </NavLink>
              </div>
            )}
          </div>
        </nav>
      )}
    </header>
  );
};

export default Navbar;
