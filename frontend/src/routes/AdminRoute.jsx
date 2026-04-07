import { Navigate, Outlet } from "react-router-dom";
import { Skeleton } from "../components/ui/Skeleton";
import { useAuthStore } from "../features/auth/authStore";

export default function AdminRoute() {
  const isLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-base-100 px-6">
        <div className="w-full max-w-md space-y-3">
          <Skeleton className="h-6 w-40" variant="shimmer" />
          <Skeleton className="h-4 w-full" variant="shimmer" />
          <Skeleton className="h-4 w-3/4" variant="shimmer" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== "admin") {
    return <Navigate to="/showtimes" replace />;
  }

  return <Outlet />;
}
