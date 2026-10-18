/**
 * Vista de disponibilidad para la interfaz de reservas.
 *
 * Compone `getSlots` del dominio (no cambia reglas): une los horarios de todos
 * los profesionales para «Primer disponible», resume por día para el
 * calendario y busca el siguiente horario libre.
 */
import { barbers } from "../../domain/catalog";
import { bookingHorizonDays, getSlots, shiftDate } from "../../domain/availability";
import type { DemoState } from "../../domain/demo";
import { publicMessage, shortSlotReason } from "./copy";

export const ANY_BARBER = "any";

export type SlotView = {
  time: string;
  available: boolean;
  /** Motivo completo, sin la palabra «demo». Vacío si está disponible. */
  reason: string;
  /** Etiqueta corta visible en la rejilla. */
  short: string;
};

export type DayView = { available: boolean; count: number; reason: string };

function view(time: string, available: boolean, reason: string): SlotView {
  return {
    time,
    available,
    reason: available ? "" : publicMessage(reason) || "No disponible",
    short: available ? "" : shortSlotReason(reason),
  };
}

export function barberUnavailable(state: DemoState, barberId: string) {
  if (barberId === ANY_BARBER) return false;
  if (state.unavailableBarberIds?.includes(barberId)) return true;
  if (!state.team) return false;
  return !state.team.find((member) => member.id === barberId)?.active;
}

export function slotsFor(
  state: DemoState,
  barberId: string,
  serviceId: string,
  date: string,
  now: number,
): SlotView[] {
  if (!date || !now) return [];
  if (barberId !== ANY_BARBER)
    return getSlots(state, barberId, serviceId, date, now).map((slot) =>
      view(slot.time, slot.available, slot.reason),
    );
  const byTime = new Map<string, { available: boolean; reasons: string[] }>();
  for (const barber of barbers)
    for (const slot of getSlots(state, barber.id, serviceId, date, now)) {
      const entry = byTime.get(slot.time) ?? { available: false, reasons: [] };
      if (slot.available) entry.available = true;
      else entry.reasons.push(publicMessage(slot.reason));
      byTime.set(slot.time, entry);
    }
  return [...byTime.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, entry]) => {
      if (entry.available) return view(time, true, "");
      const unique = [...new Set(entry.reasons)];
      const reason =
        unique.length === 1 && entry.reasons.length === barbers.length
          ? unique[0]
          : "Sin profesional libre a esa hora";
      return view(time, false, reason);
    });
}

export function dayView(
  state: DemoState,
  barberId: string,
  serviceId: string,
  date: string,
  today: string,
  now: number,
): DayView {
  const last = shiftDate(today, bookingHorizonDays);
  if (date < today) return { available: false, count: 0, reason: "Fecha pasada" };
  if (date > last)
    return {
      available: false,
      count: 0,
      reason: `Fuera del periodo de reserva (hasta ${bookingHorizonDays} días)`,
    };
  if (barberUnavailable(state, barberId))
    return {
      available: false,
      count: 0,
      reason: "El profesional elegido no está disponible por ahora",
    };
  const slots = slotsFor(state, barberId, serviceId, date, now);
  const count = slots.filter((slot) => slot.available).length;
  if (count) return { available: true, count, reason: "" };
  if (!slots.length)
    return { available: false, count: 0, reason: "Sin horarios configurados" };
  const kinds = new Set(slots.map((slot) => slot.short));
  const only = kinds.size === 1 ? [...kinds][0] : "";
  let reason = "Agenda completa ese día";
  if (only === "Pasado") reason = "La jornada de hoy ya terminó";
  else if (date === today && kinds.has("Pasado"))
    reason = "No quedan horarios libres hoy";
  else if (only === "Sin jornada") reason = "Día sin jornada de atención";
  else if (only === "En pausa" || only === "Inactivo")
    reason = "Profesional no disponible por ahora";
  return { available: false, count: 0, reason };
}

/** Primer horario libre desde `from` (incluido) dentro del periodo de reserva. */
export function nextAvailable(
  state: DemoState,
  barberId: string,
  serviceId: string,
  from: string,
  today: string,
  now: number,
): { date: string; time: string } | null {
  if (!from || !today || !now || barberUnavailable(state, barberId)) return null;
  const last = shiftDate(today, bookingHorizonDays);
  for (let date = from < today ? today : from; date <= last; date = shiftDate(date, 1)) {
    const slot = slotsFor(state, barberId, serviceId, date, now).find(
      (candidate) => candidate.available,
    );
    if (slot) return { date, time: slot.time };
  }
  return null;
}
