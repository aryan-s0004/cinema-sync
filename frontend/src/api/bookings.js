import api from "./client";

const normalizeArray = (data) => (Array.isArray(data) ? data : []);

export const bookingApi = {
  showById: async (showId) => (await api.get(`/shows/${showId}`)).data.data,
  seats: async (showId) => normalizeArray((await api.get(`/seats/${showId}`)).data.data),
  lockSeats: async (payload) => (await api.post("/seats/lock", payload)).data.data,
  createBooking: async (payload) => (await api.post("/bookings", payload)).data.data,
  myBookings: async () => normalizeArray((await api.get("/bookings/my")).data.data),
  bookingById: async (bookingId) => (await api.get(`/bookings/${bookingId}`)).data.data,
  createOrder: async (bookingId) => (await api.post("/payments/create-order", { bookingId })).data.data,
  verifyPayment: async (payload) => (await api.post("/payments/verify", payload)).data.data,
  ticketByBooking: async (bookingId) => (await api.get(`/tickets/booking/${bookingId}`)).data.data
};
