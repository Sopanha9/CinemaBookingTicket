import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { queryClient } from "./lib/queryClient";
import { toastSuccess } from "./lib/toast";
import { router } from "./routes";

let hasShownFoundationToast = false;

function App() {
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "cinema");

    if (!hasShownFoundationToast) {
      toastSuccess("Foundation ready");
      hasShownFoundationToast = true;
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}

export default App;
