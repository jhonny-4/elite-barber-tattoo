import type { PublicTicket } from "../../services/contracts/demo";

/** Tono visual de la insignia de estado (ver `.status-badge[data-tone]`). */
export type TicketTone = "live" | "ok" | "pending" | "muted";

/**
 * Estados del turno en lenguaje de cliente. Sin verde: activo = blanco,
 * llamando = rojo, pasado = gris. El texto siempre acompaña al color.
 */
export const ticketStatus: Record<
  PublicTicket["status"],
  { label: string; tone: TicketTone }
> = {
  esperando: { label: "En espera", tone: "pending" },
  llamado: { label: "Te estamos llamando", tone: "live" },
  "en-atencion": { label: "En atención", tone: "ok" },
  finalizado: { label: "Atendido", tone: "muted" },
  cancelado: { label: "Cancelado", tone: "muted" },
};

/** Mensaje de apoyo bajo el número del recibo. */
export function ticketHint(ticket: PublicTicket) {
  switch (ticket.status) {
    case "esperando":
      return "Te avisamos en esta pantalla y en el monitor del local cuando sea tu turno.";
    case "llamado":
      return ticket.barber === "Primer disponible"
        ? "Acércate a recepción: es tu turno."
        : `Acércate al puesto de ${ticket.barber}: es tu turno.`;
    case "en-atencion":
      return `Estás con ${ticket.barber}. Disfruta tu servicio.`;
    case "finalizado":
      return "Servicio finalizado. Gracias por visitar Elite.";
    case "cancelado":
      return "Este turno ya no está activo. Puedes tomar uno nuevo.";
  }
}

/** Espera estimada en texto corto; `null` cuando aún no hay cálculo. */
export function waitValue(minutes: number | null) {
  if (minutes === null) return null;
  if (minutes < 1) return "En breve";
  if (minutes < 60) return `≈ ${minutes} min`;
  const hours = Math.floor(minutes / 60),
    rest = minutes % 60;
  return rest ? `≈ ${hours} h ${rest} min` : `≈ ${hours} h`;
}
