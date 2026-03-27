import api from "./client";

const normalizeArray = (data) => (Array.isArray(data) ? data : []);

export const bookingApi = {
  showById: async (showId) => (await api.get(`/shows/${showId}`)).data.data,
  seats: async (showId) => normalizeArray((await api.get(`/seats/${showId}`)).data.data),
  suggestSeats: async (payload) => (await api.post("/seats/suggest", payload)).data.data,
  lockSeats: async (payload) => (await api.post("/seats/lock", payload)).data.data,
  createBooking: async (payload) => (await api.post("/bookings", payload)).data.data,
  myBookings: async () => normalizeArray((await api.get("/bookings/my")).data.data),
  bookingById: async (bookingId) => (await api.get(`/bookings/${bookingId}`)).data.data,
  bookingQuote: async (bookingId) => (await api.get(`/bookings/${bookingId}/quote`)).data.data,
  upsertBookingIntent: async (payload) => (await api.post("/booking-intents", payload)).data.data,
  getActiveBookingIntent: async (showId) =>
    (await api.get("/booking-intents/active", { params: showId ? { showId } : undefined })).data.data,
  closeBookingIntent: async (intentId) => (await api.patch(`/booking-intents/${intentId}/close`)).data.data,
  initiatePayment: async ({ bookingId, idempotencyKey }) =>
    (
      await api.post(
        "/payments/initiate",
        { bookingId, idempotencyKey },
        { headers: idempotencyKey ? { "X-Idempotency-Key": idempotencyKey } : {} }
      )
    ).data.data,
  requestPaymentOtp: async (payload) => (await api.post("/payments/request-otp", payload)).data.data,
  confirmPayment: async (payload) => (await api.post("/payments/confirm", payload)).data.data,
  paymentStatus: async (transactionId) => (await api.get(`/payments/status/${transactionId}`)).data.data,
  createOrder: async (bookingId) => (await api.post("/payments/create-order", { bookingId })).data.data,
  verifyPayment: async (payload) => (await api.post("/payments/verify", payload)).data.data,
  ticketByBooking: async (bookingId) => (await api.get(`/tickets/booking/${bookingId}`)).data.data
};
