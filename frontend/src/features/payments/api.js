import api from "../../lib/api";

export const createPayment = async ({ bookingId, paymentMethod }) => {
  const response = await api.post("/payments", {
    bookingId,
    paymentMethod,
  });

  return response.data;
};

export const getPayments = async (bookingId) => {
  const response = await api.get("/payments", {
    params: {
      bookingId,
    },
  });

  return response.data;
};

export const getPayment = async (id) => {
  const response = await api.get(`/payments/${id}`);
  return response.data;
};
