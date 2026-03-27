import { useCallback, useMemo, useState } from "react";
import { bookingApi } from "../api/bookings";
import useFetch from "./useFetch";

const useBooking = (showId) => {
  const [selectedSeatIds, setSelectedSeatIds] = useState([]);
  const [lockUntil, setLockUntil] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const fetchSeats = useCallback(() => {
    if (!showId) return Promise.resolve([]);
    return bookingApi.seats(showId);
  }, [showId]);

  const {
    data: seats,
    loading: seatsLoading,
    error: seatsError,
    refetch: refetchSeats
  } = useFetch(fetchSeats, [fetchSeats], { immediate: Boolean(showId) });

  const safeSeats = useMemo(() => (Array.isArray(seats) ? seats : []), [seats]);

  const toggleSeatSelection = (seat) => {
    if (seat.status !== "available") return;

    setSelectedSeatIds((current) =>
      current.includes(seat._id) ? current.filter((id) => id !== seat._id) : [...current, seat._id]
    );
  };

  const clearSelection = () => {
    setSelectedSeatIds([]);
    setLockUntil(null);
  };

  const createBookingFromSelection = async () => {
    if (!showId || selectedSeatIds.length === 0) {
      setError("Select at least one seat");
      return null;
    }

    setProcessing(true);
    setError("");

    try {
      const lockData = await bookingApi.lockSeats({ showId, seatIds: selectedSeatIds });
      if (lockData?.lockUntil) {
        setLockUntil(lockData.lockUntil);
      }

      const booking = await bookingApi.createBooking({ showId, seatIds: selectedSeatIds });
      return booking;
    } catch (err) {
      setError(err.response?.data?.message || "Booking failed. Please retry.");
      return null;
    } finally {
      setProcessing(false);
    }
  };

  return {
    seats: safeSeats,
    seatsLoading,
    seatsError,
    refetchSeats,
    selectedSeatIds,
    lockUntil,
    processing,
    error,
    setError,
    toggleSeatSelection,
    clearSelection,
    createBookingFromSelection
  };
};

export default useBooking;
