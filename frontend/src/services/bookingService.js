import { bookingApi } from "../api/bookings";

export const bookingService = {
  seats: bookingApi.seats,
  lockSeats: bookingApi.lockSeats,
  createBooking: bookingApi.createBooking,
  myBookings: bookingApi.myBookings,
  bookingById: bookingApi.bookingById,
  createOrder: bookingApi.createOrder,
  verifyPayment: bookingApi.verifyPayment,
  ticketByBooking: bookingApi.ticketByBooking,
  scanTicket: bookingApi.scanTicket,
  downloadTicket: bookingApi.downloadTicket,
};

export default bookingService;
