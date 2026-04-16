import { toastConflict, toastError, toastValidation } from "../../lib/toast";

export const handleAdminMutationError = (err, options = {}) => {
  const { conflictMessage, fallbackMessage = "Request failed" } = options;

  if (err?.status === 400 && Array.isArray(err?.details)) {
    toastValidation(err.details);
    return;
  }

  if (err?.status === 409) {
    toastConflict(
      conflictMessage || err?.message || "Conflict",
      err?.requestId,
    );
    return;
  }

  toastError(err?.message || fallbackMessage, err?.requestId);
};
