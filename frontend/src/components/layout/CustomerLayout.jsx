import { NavLink, Outlet } from "react-router-dom";

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
  return (
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
            <button
              type="button"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
