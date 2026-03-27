import formatDateTime from "../../utils/formatDate";
import formatPrice from "../../utils/formatPrice";

const TicketCard = ({ ticket }) => {
  if (!ticket) {
    return <p className="text-sm text-slate-400">No ticket available.</p>;
  }

  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300">
      <p className="font-medium text-white">{ticket.movieTitle}</p>
      <p>Ticket: {ticket.ticketCode}</p>
      <p>Theatre: {ticket.theatreName} - {ticket.screenName}</p>
      <p>Show: {formatDateTime(ticket.showTime)}</p>
      <p>Seats: {(ticket.seatLabels || []).join(", ")}</p>
      <p>Amount: {formatPrice(ticket.amount)}</p>
      <p>Status: {ticket.status}</p>
    </article>
  );
};

export default TicketCard;
