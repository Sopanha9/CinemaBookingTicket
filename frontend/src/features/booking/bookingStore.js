import { create } from "zustand";

export const useBookingStore = create((set) => ({
  showtimeId: null,
  selectedSeatIds: [],
  seatPrices: {},
  lockExpiresAt: null,
  lockMinutes: 5,

  initSelection: (showtimeId, seatPrices) => {
    set({
      showtimeId,
      selectedSeatIds: [],
      seatPrices: seatPrices || {},
      lockExpiresAt: null,
      lockMinutes: 5,
    });
  },

  toggleSeat: (seatId) => {
    set((state) => ({
      selectedSeatIds: state.selectedSeatIds.includes(seatId)
        ? state.selectedSeatIds.filter((id) => id !== seatId)
        : [...state.selectedSeatIds, seatId],
    }));
  },

  setLock: (expiresAt) => {
    set({ lockExpiresAt: expiresAt });
  },

  clearBooking: () => {
    set({
      showtimeId: null,
      selectedSeatIds: [],
      seatPrices: {},
      lockExpiresAt: null,
      lockMinutes: 5,
    });
  },
}));
