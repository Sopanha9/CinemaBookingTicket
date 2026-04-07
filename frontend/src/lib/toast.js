import { toast } from "react-hot-toast";

export const toastSuccess = (message) => {
  toast.success(message);
};

export const toastError = (message, requestId) => {
  const text = requestId ? `${message} [ID: ${requestId}]` : message;
  toast.error(text);
};

export const toastConflict = (message, requestId) => {
  const text = requestId ? `${message} [ID: ${requestId}]` : message;
  toast.error(text, {
    icon: "⚠️",
    style: {
      border: "1px solid #f59e0b",
      background: "#fffbeb",
      color: "#92400e",
    },
  });
};

export const toastValidation = (errorsArray) => {
  if (!Array.isArray(errorsArray)) return;

  errorsArray.forEach((item) => {
    if (typeof item === "string") {
      toast.error(item);
      return;
    }

    if (item && typeof item.message === "string") {
      toast.error(item.message);
      return;
    }

    toast.error("Validation error");
  });
};

export const toastAuth = (message) => {
  toast.error(`🔒 ${message}`);
};
