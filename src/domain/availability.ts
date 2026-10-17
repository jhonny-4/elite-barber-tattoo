import { services } from "./catalog.ts";
import { type DemoState } from "./demo.ts";
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
  const toMinutes = (time: string) =>
    Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  return Array.from(
    { length: Math.floor((18 * 60 - 10 * 60 - duration) / 15) + 1 },
    (_, index) => {
      const start = 600 + index * 15;
      const time = `${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}`;
      const past = Date.parse(`${date}T${time}:00-05:00`) <= now;
      const occupied = state.bookings.some(
        (b) =>
          b.status !== "cancelada" &&
          b.barberId === barberId &&
          b.date === date &&
          start <
            toMinutes(b.time) +
              (services.find((s) => s.id === b.serviceId)
                ?.demoDurationMinutes ?? 0) &&
          start + duration > toMinutes(b.time),
      );
      const paused = state.unavailableBarberIds?.includes(barberId);
      return {
        time,
        available: !past && !occupied && !paused,
        reason: paused
          ? "Profesional pausado"
          : past
            ? "Horario pasado"
            : occupied
              ? "Ocupado en demo"
              : "",
      };
    },
  );
}
