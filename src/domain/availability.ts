import { services } from "./catalog.ts";
import { type DemoState } from "./demo.ts";
import { scheduleReason } from "./scheduling/rules.ts";
import { toMinutes } from "./team/model.ts";
export const bookingHorizonDays = 60;
export function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function parseDate(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}
export function shiftDate(value: string, days: number) {
  const date = parseDate(value);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}
export function prettyDate(value: string) {
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(parseDate(value));
}
export function getSlots(
  state: DemoState,
  barberId: string,
  serviceId: string,
  date: string,
  now = Date.now(),
) {
  const duration = services.find(
    (s) => s.id === serviceId,
  )?.demoDurationMinutes;
  if (!duration) return [];
  const member = state.team?.find((b) => b.id === barberId);
  const open = toMinutes(member?.open ?? "10:00"),
    close = toMinutes(member?.close ?? "18:00");
  return Array.from(
    { length: Math.max(0, Math.floor((close - open - duration) / 15) + 1) },
    (_, index) => {
      const start = open + index * 15;
      const time = `${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}`;
      const past = Date.parse(`${date}T${time}:00-05:00`) <= now;
      const occupied = state.bookings.some(
        (b) =>
          !["cancelada", "finalizada"].includes(b.status) &&
          b.barberId === barberId &&
          b.date === date &&
          start <
            toMinutes(b.time) +
              (services.find((s) => s.id === b.serviceId)
                ?.demoDurationMinutes ?? 0) &&
          start + duration > toMinutes(b.time),
      );
      const paused = state.unavailableBarberIds?.includes(barberId);
      const blocked = scheduleReason(
        state,
        barberId,
        date,
        start,
        start + duration,
        now,
      );
      return {
        time,
        available: !past && !occupied && !paused && !blocked,
        reason: paused
          ? "Profesional pausado"
          : blocked
            ? blocked
            : past
              ? "Horario pasado"
              : occupied
                ? "Ocupado en demo"
                : "",
      };
    },
  );
}
