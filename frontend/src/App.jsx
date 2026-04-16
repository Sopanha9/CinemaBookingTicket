import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { me } from "./features/auth/api";
import { TOKEN_STORAGE_KEY, useAuthStore } from "./features/auth/authStore";
import { Skeleton } from "./components/ui/Skeleton";
import { queryClient } from "./lib/queryClient";
import { router } from "./routes";

function App() {
  const isLoading = useAuthStore((state) => state.isLoading);
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const setLoading = useAuthStore((state) => state.setLoading);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "cinema");
  }, []);

  useEffect(() => {
    let isActive = true;

    const restoreSession = async () => {
      setLoading(true);

      let token = null;
      try {
        token = localStorage.getItem(TOKEN_STORAGE_KEY);
      } catch {
        token = null;
      }

      if (!token) {
        if (isActive) {
          setLoading(false);
        }
        return;
      }

      try {
        const data = await me();
        if (isActive) {
          setAuth(data.user, token);
        }
      } catch {
        if (isActive) {
          clearAuth();
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      isActive = false;
    };
  }, [clearAuth, setAuth, setLoading]);

  const loadingView = (
    <div className="flex min-h-screen w-full items-center justify-center bg-base-100 px-6">
      <div className="w-full max-w-md space-y-3">
        <Skeleton className="h-6 w-40" variant="shimmer" />
        <Skeleton className="h-4 w-full" variant="shimmer" />
        <Skeleton className="h-4 w-3/4" variant="shimmer" />
      </div>
    </div>
  );

  return (
    <QueryClientProvider client={queryClient}>
      {isLoading ? loadingView : <RouterProvider router={router} />}
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}

export default App;
