const { createOrder } = require("../payments/razorpayService");
const Booking = require("../models/Booking");
const ApiResponse = require("../Utils/ApiResponse");

const createPaymentOrder = async (req, res, next) => {
  try {
    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) throw new Error("Booking not found");

    const order = await createOrder(booking.totalAmount);

    res.json(new ApiResponse(200, order, "Order created"));
  } catch (err) {
    next(err);
  }
};

const verifyPayment = async (req, res, next) => {
  try {
    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId);
    booking.status = "confirmed";
    await booking.save();

    res.json(new ApiResponse(200, booking, "Payment successful"));
  } catch (err) {
    next(err);
  }
};

module.exports = { createPaymentOrder, verifyPayment };
