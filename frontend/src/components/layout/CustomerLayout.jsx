import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { logout } from "../../features/auth/api";
import { useAuthStore } from "../../features/auth/authStore";
import { toastSuccess } from "../../lib/toast";
import LayoutErrorBoundary from "./LayoutErrorBoundary";

const customerLinks = [
  { to: "/showtimes", label: "Now Showing" },
  { to: "/bookings", label: "My Bookings" },
];

const navLinkClass = ({ isActive }) =>
  [
    "relative px-4 py-2 text-sm font-semibold uppercase tracking-widest transition-colors duration-200",
    isActive
      ? "text-secondary after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:h-0.5 after:w-4 after:rounded-full after:bg-secondary after:content-['']"
      : "text-white/60 hover:text-secondary",
  ].join(" ");

export default function CustomerLayout() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const handleLogout = () => {
    void logout();
    clearAuth();
    navigate("/login");
    toastSuccess("Logged out");
  };

  return (
    <LayoutErrorBoundary>
      <div className="min-h-screen bg-base-100 text-base-content">
        {/* Noir Header */}
        <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0a0a0c]/90 backdrop-blur-md">
          <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">

            {/* Logo */}
            <div className="flex min-w-[150px] items-center justify-start">
              <NavLink to="/" className="flex items-center gap-2 group">
                {/* Film reel glyph */}
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-secondary/40 bg-secondary/10 text-secondary text-base font-bold group-hover:bg-secondary/20 transition-colors duration-200">
                  ◎
                </span>
                <span className="text-sm font-black uppercase tracking-[0.2em] text-white group-hover:text-secondary transition-colors duration-200">
                  Cinema<span className="text-secondary">Noir</span>
                </span>
              </NavLink>
            </div>

            {/* Nav links */}
            <nav className="flex flex-1 items-center justify-center gap-1 overflow-x-auto px-2 sm:gap-2">
              {customerLinks.map((link) => (
                <NavLink key={`${link.to}-${link.label}`} to={link.to} className={navLinkClass}>
                  {link.label}
                </NavLink>
              ))}
            </nav>

            {/* Auth button */}
            <div className="ml-auto flex min-w-[150px] items-center justify-end">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded border border-secondary/50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-secondary transition-all duration-200 hover:bg-secondary/10 hover:border-secondary"
                >
                  Logout
                </button>
              ) : (
                <NavLink
                  to="/login"
                  className="rounded border border-secondary/50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-secondary transition-all duration-200 hover:bg-secondary/10 hover:border-secondary"
                >
                  Sign In
                </NavLink>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </LayoutErrorBoundary>
  );
}
