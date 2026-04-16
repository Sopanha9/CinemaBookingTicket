import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { logout } from "../../features/auth/api";
import { useAuthStore } from "../../features/auth/authStore";
import { toastSuccess } from "../../lib/toast";
import LayoutErrorBoundary from "./LayoutErrorBoundary";

const customerLinks = [
  { to: "/showtimes", label: "Now Showing" },
  { to: "/showtimes", label: "Showtimes" },
  { to: "/bookings", label: "My Bookings" },
];

const navLinkClass = ({ isActive }) =>
  [
    "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-primary/20 text-primary"
      : "text-base-content/80 hover:bg-base-200 hover:text-base-content",
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
        <header className="border-b border-base-300 bg-base-100/90 backdrop-blur">
          <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-[120px] items-center justify-start">
              <NavLink
                to="/"
                className="text-lg font-extrabold tracking-wide text-primary"
              >
                CinemaBook
              </NavLink>
            </div>

            <nav className="flex flex-1 items-center justify-center gap-1 overflow-x-auto px-2 sm:gap-2">
              {customerLinks.map((link) => (
                <NavLink key={link.to} to={link.to} className={navLinkClass}>
                  {link.label}
                </NavLink>
              ))}
            </nav>

            <div className="ml-auto flex min-w-[120px] items-center justify-end">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
                >
                  Logout
                </button>
              ) : (
                <NavLink
                  to="/login"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
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
