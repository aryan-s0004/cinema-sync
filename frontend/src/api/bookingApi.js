import api from "./axiosInstance";

export const getSeatsByShow = async (showId) => {
  const { data } = await api.get(`/seats/${showId}`);
  return data.data;
};

export const lockSeats = async ({ showId, seatIds }) => {
  const { data } = await api.post("/seats/lock", { showId, seatIds });
  return data.data;
};

export const createBooking = async ({ showId, seatIds }) => {
  const { data } = await api.post("/bookings", { showId, seatIds });
  return data.data;
};

export const getBookingById = async (bookingId) => {
  const { data } = await api.get(`/bookings/${bookingId}`);
  return data.data;
};

export const createOrder = async (bookingId) => {
  const { data } = await api.post("/payments/create-order", { bookingId });
  return data.data;
};

export const verifyPayment = async (payload) => {
  const { data } = await api.post("/payments/verify", payload);
  return data.data;
};
