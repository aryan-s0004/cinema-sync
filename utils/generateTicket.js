const generateTicket = (booking) => {
  return {
    ticketId: "TICKET_" + Date.now(),
    movie: booking.show,
    seats: booking.seats,
    amount: booking.totalAmount
  };
};

module.exports = { generateTicket };
