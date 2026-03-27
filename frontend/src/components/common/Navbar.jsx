import { Link, NavLink } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

const navClass = ({ isActive }) =>
  [
    "rounded-lg px-3 py-1.5 text-sm transition",
    isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-900 hover:text-white"
  ].join(" ");

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <Link to="/" className="text-2xl font-semibold tracking-tight text-white">
          CinemaSync
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
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
    </header>
  );
};

export default Navbar;
