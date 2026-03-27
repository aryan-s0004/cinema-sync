const listeners = new Set();

let state = {
  selectedShowId: null,
  selectedSeatIds: []
};

const notify = () => listeners.forEach((listener) => listener(state));

const bookingStore = {
  getState: () => state,
  subscribe: (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  setShow: (showId) => {
    state = { ...state, selectedShowId: showId };
    notify();
  },
  toggleSeat: (seatId) => {
    const exists = state.selectedSeatIds.includes(seatId);
    state = {
      ...state,
      selectedSeatIds: exists
        ? state.selectedSeatIds.filter((id) => id !== seatId)
        : [...state.selectedSeatIds, seatId]
    };
    notify();
  },
  clear: () => {
    state = { selectedShowId: null, selectedSeatIds: [] };
    notify();
  }
};

export default bookingStore;
