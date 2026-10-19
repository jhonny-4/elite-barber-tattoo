import type { Booking } from "../demo.ts";
import type { SharedState } from "../../services/contracts/demo.ts";

/** Separate C/E prefixes keep appointments and walk-in tickets unambiguous. */
export function bookingTurnNumber(state: SharedState, booking: Booking) {
  return booking.turnNumber ?? `C-${String(state.bookings.findIndex((item) => item.id === booking.id) + 1).padStart(3, "0")}`;
}
