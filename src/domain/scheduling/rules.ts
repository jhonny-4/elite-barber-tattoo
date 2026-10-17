import { services } from "../catalog.ts";
import type { DemoState } from "../demo.ts";
import { toMinutes } from "../team/model.ts";
export function scheduleReason(
  state: DemoState,
  barberId: string,
  date: string,
  start: number,
  end: number,
  now = Date.now(),
) {
  if (state.unavailableBarberIds?.includes(barberId))
    return "Profesional pausado";
  const member = state.team?.find((b) => b.id === barberId);
  if (member) {
    if (!member.active) return "Profesional inactivo";
    const day = new Date(`${date}T12:00:00-05:00`).getUTCDay();
    if (
      !member.days.includes(day) ||
      start < toMinutes(member.open) ||
      end > toMinutes(member.close)
    )
      return "Fuera de la jornada demo";
    for (const p of [
      ...member.pauses,
      ...member.absences.filter((a) => a.date === date),
    ])
      if (start < toMinutes(p.end) && end > toMinutes(p.start))
        return `No disponible: ${p.label}`;
  }
  for (const ticket of state.queue ?? []) {
    if (
      !["llamado", "en-atencion"].includes(ticket.status) ||
      ticket.assignedBarberId !== barberId ||
      !ticket.reservedStart
    )
      continue;
    const from = Date.parse(ticket.reservedStart),
      to = Math.max(
        now + 15 * 60000,
        from +
          (services.find((s) => s.id === ticket.serviceId)
            ?.demoDurationMinutes ?? 30) *
            60000,
      );
    const requestedStart = Date.parse(`${date}T00:00:00-05:00`) + start * 60000,
      requestedEnd = Date.parse(`${date}T00:00:00-05:00`) + end * 60000;
    if (requestedStart < to && requestedEnd > from)
      return "Atención presencial en curso";
  }
  for (const b of state.bookings.filter(
    (b) => b.status === "en-atencion" && b.barberId === barberId,
  )) {
    const from = Date.parse(`${b.date}T${b.time}:00-05:00`),
      to = Math.max(
        now + 15 * 60000,
        from +
          (services.find((s) => s.id === b.serviceId)?.demoDurationMinutes ??
            30) *
            60000,
      );
    if (
      Date.parse(`${date}T00:00:00-05:00`) + start * 60000 < to &&
      Date.parse(`${date}T00:00:00-05:00`) + end * 60000 > from
    )
      return "Atención de cita en curso";
  }
  return "";
}
