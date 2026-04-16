import { useMemo, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import LayoutErrorBoundary from "./LayoutErrorBoundary";

const sidebarSections = [
  {
    title: "Catalog",
    links: [
      { to: "/admin/movies", label: "Movies" },
      { to: "/admin/genres", label: "Genres" },
      { to: "/admin/theaters", label: "Theaters" },
    ],
  },
  {
    title: "Scheduling",
    links: [
      { to: "/admin/screens", label: "Screens" },
      { to: "/admin/showtimes", label: "Showtimes" },
      { to: "/admin/pricing-rules", label: "Pricing Rules" },
    ],
  },
  {
    title: "Reports",
    links: [{ to: "/admin/reports/revenue", label: "Revenue" }],
  },
  {
    title: "Operations",
    links: [{ to: "/admin/operations", label: "Monitoring" }],
  },
];

const sidebarLinkClass = ({ isActive }) =>
  [
    "block rounded-lg px-3 py-2 text-sm transition-colors",
    isActive
      ? "bg-primary/20 font-semibold text-primary"
      : "text-base-content/75 hover:bg-base-200 hover:text-base-content",
  ].join(" ");

export default function AdminLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const sidebarWidth = isCollapsed ? 72 : 240;

  const sidebarStyle = useMemo(
    () => ({
      width: `${sidebarWidth}px`,
    }),
    [sidebarWidth],
  );

  return (
    <LayoutErrorBoundary>
      <div className="min-h-screen bg-base-100 text-base-content">
        <aside
          className="fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-base-300 bg-base-200 transition-[width] duration-200"
          style={sidebarStyle}
        >
          <div className="flex h-16 items-center justify-between border-b border-base-300 px-3">
            {!isCollapsed && (
              <span className="text-sm font-bold tracking-wide text-secondary">
                ADMIN
              </span>
            )}
            <button
              type="button"
              onClick={() => setIsCollapsed((prev) => !prev)}
              className="rounded-lg bg-base-300 px-2 py-1 text-xs font-semibold hover:bg-base-100"
              aria-label="Toggle sidebar"
            >
              {isCollapsed ? ">" : "<"}
            </button>
          </div>

          <nav className="flex-1 space-y-5 overflow-y-auto p-3">
            {sidebarSections.map((section) => (
              <div key={section.title}>
                {!isCollapsed && (
                  <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-base-content/50">
                    {section.title}
                  </p>
                )}

                <div className="space-y-1">
                  {section.links.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      className={sidebarLinkClass}
                      title={link.label}
                    >
                      {isCollapsed ? link.label.charAt(0) : link.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <div
          className="min-h-screen transition-[margin-left] duration-200"
          style={{ marginLeft: `${sidebarWidth}px` }}
        >
          <header className="sticky top-0 z-30 flex h-16 items-center justify-end border-b border-base-300 bg-base-100/95 px-4 backdrop-blur sm:px-6">
            <div className="text-right">
              <p className="text-sm font-semibold">Admin User</p>
              <p className="text-xs text-base-content/60">admin@cinema.local</p>
            </div>
          </header>

          <main className="p-4 sm:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </LayoutErrorBoundary>
  );
}
