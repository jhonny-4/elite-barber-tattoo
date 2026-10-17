import { barbers, services } from "../catalog.ts";
import { getSlots } from "../availability.ts";
import type {
  SharedState,
  PublicQueue,
  PublicTicket,
} from "../../services/contracts/demo.ts";
import type { QueueTicket } from "./model.ts";
export function bogotaDate(now = Date.now()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function forecast(state: SharedState, now = Date.now()) {
  const estimates = new Map<string, { barberId: string; at: number }>();
  const virtual = structuredClone(state);
  const day = bogotaDate(now);
  for (const ticket of state.queue.filter(
    (t) => t.date === day && t.status === "esperando",
  )) {
    const choices = barbers
      .filter((b) => ticket.barberId === "any" || b.id === ticket.barberId)
      .flatMap((b) =>
        getSlots(virtual, b.id, ticket.serviceId, day, now - 1)
          .filter((s) => s.available)
          .map((s) => ({
            barberId: b.id,
            at: Date.parse(`${day}T${s.time}:00-05:00`),
            time: s.time,
          })),
      )
      .sort((a, b) => a.at - b.at);
    const chosen = choices[0];
    if (!chosen) continue;
    estimates.set(ticket.id, chosen);
    virtual.bookings.push({
      id: `forecast-${ticket.id}`,
      barberId: chosen.barberId,
      serviceId: ticket.serviceId,
      date: day,
      time: chosen.time,
      name: "",
      phone: "",
      status: "reservada-demo",
    });
  }
  return estimates;
}
export function ticketView(
  state: SharedState,
  ticket: QueueTicket,
  now = Date.now(),
  estimates = forecast(state, now),
): PublicTicket {
  const waiting = state.queue.filter(
    (t) => t.date === ticket.date && t.status === "esperando",
  );
  const estimate = estimates.get(ticket.id);
  return {
    number: ticket.number,
    status: ticket.status,
    service:
      services.find((s) => s.id === ticket.serviceId)?.name ?? "Barbería",
    barber:
      barbers.find((b) => b.id === (ticket.assignedBarberId ?? ticket.barberId))
        ?.name ?? "Primer disponible",
    position:
      ticket.status === "esperando"
        ? waiting.findIndex((t) => t.id === ticket.id) + 1
        : null,
    estimatedMinutes:
      ticket.status === "esperando" && estimate
        ? Math.max(0, Math.ceil((estimate.at - now) / 60000))
        : null,
  };
}
export function publicQueue(state: SharedState, now = Date.now()): PublicQueue {
  const day = bogotaDate(now),
    list = state.queue.filter((t) => t.date === day),
    estimates = forecast(state, now);
  const views = (status: string) =>
    list
      .filter((t) => t.status === status)
      .map((t) => ticketView(state, t, now, estimates));
  return {
    date: day,
    revision: state.revision,
    waiting: list.filter((t) => t.status === "esperando").length,
    called: views("llamado"),
    serving: views("en-atencion"),
    next: views("esperando").slice(0, 8),
    connection: "demo",
  };
}
