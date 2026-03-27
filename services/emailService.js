const nodemailer = require("nodemailer");

const sendBookingEmail = async (email, booking) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "?? Booking Confirmed",
    text: `Your booking is confirmed.
Seats: ${booking.seats.length}
Amount: ${booking.totalAmount}`
  });
};

module.exports = { sendBookingEmail };
