import api from "../../lib/api";

export const createLock = async ({ showtimeId, seatIds, lockMinutes }) => {
  const response = await api.post("/bookings/locks", {
    showtimeId,
    seatIds,
    lockMinutes,
  });

  return response.data;
};

export const extendLock = async ({ showtimeId, seatIds, lockMinutes }) => {
  const response = await api.patch("/bookings/locks/extend", {
    showtimeId,
    seatIds,
    lockMinutes,
  });

  return response.data;
};

export const releaseLock = async ({ showtimeId, seatIds }) => {
  const response = await api.delete("/bookings/locks", {
    data: {
      showtimeId,
      ...(seatIds ? { seatIds } : {}),
    },
  });

  return response.data;
};

export const createBooking = async ({ showtimeId, seatIds }) => {
  const response = await api.post("/bookings", {
    showtimeId,
    seatIds,
  });

  return response.data;
};

export const getMyBookings = async () => {
  const response = await api.get("/bookings");
  return response.data;
};

export const getBooking = async (id) => {
  const response = await api.get(`/bookings/${id}`);
  return response.data;
};

export const updateBookingStatus = async (
  id,
  { status, cancellationReason },
) => {
  const response = await api.patch(`/bookings/${id}/status`, {
    status,
    cancellationReason,
  });

  return response.data;
};
