import { QueryClient } from "@tanstack/react-query";
import { toastError } from "./toast";

const normalizeError = (err) => {
  if (err && typeof err === "object") {
    return {
      message: err.message || "Something went wrong",
      requestId: err.requestId,
    };
  }

  return {
    message: "Something went wrong",
    requestId: undefined,
  };
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 1,
      onError: (err) => {
        const { message, requestId } = normalizeError(err);
        toastError(message, requestId);
      },
    },
  },
});

export default queryClient;
