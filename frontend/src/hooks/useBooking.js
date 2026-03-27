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

  const toggleSeatSelection = useCallback((seat) => {
    if (seat.status !== "available") return;

    setSelectedSeatIds((current) =>
      current.includes(seat._id) ? current.filter((id) => id !== seat._id) : [...current, seat._id]
    );
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedSeatIds([]);
    setLockUntil(null);
  }, []);

  const applySeatSelection = useCallback((seatIds, mode = "replace") => {
    const availableSeatIdSet = new Set(
      safeSeats.filter((seat) => seat.status === "available").map((seat) => String(seat._id))
    );
    const nextIds = [...new Set((seatIds || []).map((id) => String(id)))].filter((id) => availableSeatIdSet.has(id));

    setSelectedSeatIds((current) => (mode === "append" ? [...new Set([...current, ...nextIds])] : nextIds));
    return nextIds;
  }, [safeSeats]);

  const suggestBestSeats = useCallback(async ({ count, preference = "center" }) => {
    if (!showId) return null;
    const suggestion = await bookingApi.suggestSeats({ showId, count, preference });
    applySeatSelection(suggestion?.seatIds || [], "replace");
    return suggestion;
  }, [applySeatSelection, showId]);

  const createBookingFromSelection = useCallback(async () => {
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
      bookingApi
        .upsertBookingIntent({
          showId,
          seatIds: selectedSeatIds,
          step: "payment",
          bookingId: booking?._id || null,
          lockUntil: lockData?.lockUntil || null,
          active: true,
        })
        .catch(() => {});
      return booking;
    } catch (err) {
      setError(err.response?.data?.message || "Booking failed. Please retry.");
      return null;
    } finally {
      setProcessing(false);
    }
  }, [selectedSeatIds, showId]);

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
    applySeatSelection,
    suggestBestSeats,
    clearSelection,
    createBookingFromSelection
  };
};

export default useBooking;
