import { bookingApi } from "../api/bookings";

export const bookingService = {
  seats: bookingApi.seats,
  lockSeats: bookingApi.lockSeats,
  createBooking: bookingApi.createBooking,
  myBookings: bookingApi.myBookings,
  bookingById: bookingApi.bookingById,
  initiatePayment: bookingApi.initiatePayment,
  requestPaymentOtp: bookingApi.requestPaymentOtp,
  confirmPayment: bookingApi.confirmPayment,
  paymentStatus: bookingApi.paymentStatus,
  ticketByBooking: bookingApi.ticketByBooking,
  scanTicket: bookingApi.scanTicket,
  downloadTicket: bookingApi.downloadTicket,
};

export default bookingService;
