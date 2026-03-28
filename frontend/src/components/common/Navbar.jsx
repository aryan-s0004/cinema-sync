import { Link, NavLink } from "react-router-dom";
import { useState } from "react";
import useAuth from "../../hooks/useAuth";

const navClass = ({ isActive }) =>
  [
    "rounded-lg px-3 py-1.5 text-sm transition",
    isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-900 hover:text-white"
  ].join(" ");

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:py-4">
        <Link to="/" className="text-2xl font-semibold tracking-tight text-white">
          CinemaSync
        </Link>

        <button
          type="button"
          className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200 md:hidden"
          onClick={() => setOpen((value) => !value)}
        >
          Menu
        </button>

        <nav className="hidden items-center gap-1 sm:gap-2 md:flex">
          <NavLink to="/" className={navClass} end>
            Home
          </NavLink>
          <NavLink to="/search" className={navClass}>
            Search
          </NavLink>
          {isAuthenticated ? (
            <>
              {user?.role === "admin" ? (
                <NavLink to="/admin/scanner" className={navClass}>
                  Scanner
                </NavLink>
              ) : null}
              <NavLink to="/dashboard" className={navClass}>
                Dashboard
              </NavLink>
              <button
                onClick={logout}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-slate-900"
              >
                Logout
              </button>
              <span className="hidden text-sm text-slate-400 md:inline">{user?.name}</span>
            </>
          ) : (
            <>
              <NavLink to="/login" className={navClass}>
                Login
              </NavLink>
              <NavLink to="/register" className={navClass}>
                Register
              </NavLink>
            </>
          )}
        </nav>
      </div>

      {open ? (
        <nav className="mx-auto flex max-w-7xl flex-wrap gap-2 border-t border-slate-800 px-4 py-3 md:hidden">
          <NavLink to="/" className={navClass} end onClick={() => setOpen(false)}>
            Home
          </NavLink>
          <NavLink to="/search" className={navClass} onClick={() => setOpen(false)}>
            Search
          </NavLink>
          {isAuthenticated ? (
            <>
              {user?.role === "admin" ? (
                <NavLink to="/admin/scanner" className={navClass} onClick={() => setOpen(false)}>
                  Scanner
                </NavLink>
              ) : null}
              <NavLink to="/dashboard" className={navClass} onClick={() => setOpen(false)}>
                Dashboard
              </NavLink>
              <button
                onClick={() => {
                  setOpen(false);
                  logout();
                }}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-slate-900"
              >
                Logout
              </button>
              <span className="px-2 py-1 text-xs text-slate-400">{user?.name}</span>
            </>
          ) : (
            <>
              <NavLink to="/login" className={navClass} onClick={() => setOpen(false)}>
                Login
              </NavLink>
              <NavLink to="/register" className={navClass} onClick={() => setOpen(false)}>
                Register
              </NavLink>
            </>
          )}
        </nav>
      ) : null}
    </header>
  );
};

export default Navbar;
