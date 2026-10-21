// Etiquetas humanas, tonos de estado y formatos del panel de gestión.
// Solo presentación: las reglas viven en src/domain y el servidor decide cada operación.
import { barbers, services } from "../../domain/catalog";
import { prettyDate, shiftDate } from "../../domain/availability";
import {
  tattooStatuses,
  type Booking,
  type TattooRequest,
} from "../../domain/demo";
import type { QueueTicket } from "../../domain/queue/model";
import type { DemoNotification } from "../../domain/notifications/model";
import type { DemoCommand } from "../../services/contracts/demo";

/** Tonos de `.status-badge`: live = en atención/llamando, ok = reservada/activa, pending = pendiente, muted = cerrada. */
export type Tone = "live" | "ok" | "pending" | "muted";
type StatusInfo = { label: string; tone: Tone };

export const bookingStatus: Record<Booking["status"], StatusInfo> = {
  "reservada-demo": { label: "Reservada", tone: "ok" },
  "en-atencion": { label: "En atención", tone: "live" },
  finalizada: { label: "Finalizada", tone: "muted" },
  cancelada: { label: "Cancelada", tone: "muted" },
};

export const ticketStatus: Record<QueueTicket["status"], StatusInfo> = {
  esperando: { label: "En espera", tone: "pending" },
  llamado: { label: "Llamando", tone: "live" },
  "en-atencion": { label: "En atención", tone: "live" },
  finalizado: { label: "Finalizado", tone: "muted" },
  cancelado: { label: "Cancelado", tone: "muted" },
};

export const tattooStatus: Record<
  TattooRequest["status"],
  StatusInfo & { step: string }
> = {
  pendiente: { label: "Pendiente", tone: "pending", step: "Pendiente" },
  "en-evaluacion": { label: "En evaluación", tone: "ok", step: "Evaluación" },
  cotizada: { label: "Cotizada", tone: "ok", step: "Cotizada" },
  "fecha-acordada": {
    label: "Fecha acordada",
    tone: "ok",
    step: "Fecha acordada",
  },
  cerrada: { label: "Cerrada", tone: "muted", step: "Cerrada" },
};

export const tattooFlow = tattooStatuses;

/** Texto del botón que avanza al siguiente estado manual. */
export const tattooAdvance: Partial<Record<TattooRequest["status"], string>> = {
  "en-evaluacion": "Empezar evaluación",
  cotizada: "Marcar como cotizada",
  "fecha-acordada": "Marcar fecha acordada",
};

/** Siguiente estado manual. «Cerrar» va aparte y siempre pide confirmación. */
export function nextTattooStatus(status: TattooRequest["status"]) {
  if (status === "cerrada" || status === "fecha-acordada") return undefined;
  return tattooStatuses[tattooStatuses.indexOf(status) + 1];
}

export const bookingSource: Record<NonNullable<Booking["source"]>, string> = {
  online: "Reserva online",
  presencial: "Presencial",
};

export const ticketSource: Record<QueueTicket["source"], string> = {
  qr: "Registro QR",
  presencial: "Recepción",
};

export const channelLabel: Record<DemoNotification["channel"], string> = {
  app: "Aviso en la app",
  "correo-simulado": "Correo",
};

export const barberName = (id?: string) =>
  barbers.find((b) => b.id === id)?.name ?? "Primer disponible";

export const serviceOf = (id: string) => services.find((s) => s.id === id);

export const serviceName = (id: string) => serviceOf(id)?.name ?? "Barbería";

export const isClosedBooking = (b: Booking) =>
  b.status === "cancelada" || b.status === "finalizada";

export const byDateTime = (a: Booking, b: Booking) =>
  `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`);

export const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

/** «Hoy», «Mañana», «Ayer» o la fecha larga en español. */
export function dayLabel(date: string, today: string) {
  if (date === today) return "Hoy";
  if (date === shiftDate(today, 1)) return "Mañana";
  if (date === shiftDate(today, -1)) return "Ayer";
  return capitalize(prettyDate(date));
}

export const longDate = (date: string) => capitalize(prettyDate(date));

const shortFormat = new Intl.DateTimeFormat("es-CO", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

/** «Hoy», «Mañana» o fecha corta («dom, 25 oct»). */
export function shortDay(date: string, today: string) {
  if (date === today) return "Hoy";
  if (date === shiftDate(today, 1)) return "Mañana";
  const [y, m, d] = date.split("-").map(Number);
  return shortFormat.format(new Date(y, m - 1, d, 12)).replace(/\./g, "");
}

const clockFormat = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Hora local de Cartagena (HH:MM). */
export const clock = (value: string | number) =>
  clockFormat.format(new Date(value));

const fullDateFormat = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export const fullDate = (now: number) => capitalize(fullDateFormat.format(now));

/** Minutos transcurridos del día en Cartagena. */
export function minutesNow(now: number) {
  const [h, m] = clock(now).split(":").map(Number);
  return h * 60 + m;
}

/** Día de la semana (0 = domingo) de una fecha AAAA-MM-DD en Cartagena. */
export const weekdayOf = (date: string) =>
  new Date(`${date}T12:00:00-05:00`).getUTCDay();

export const toMinutes = (time: string) =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

export const fromMinutes = (value: number) =>
  `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (
    parts
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "·"
  );
}

/** Clave estable de una operación, para marcar el botón que la ejecuta. */
export function commandKey(command: DemoCommand) {
  switch (command.type) {
    case "booking.change":
    case "queue.change":
      return `${command.type}:${command.id}:${command.action}`;
    case "tattoo.change":
      return `${command.type}:${command.id}:${command.status}`;
    case "team.save":
      return `${command.type}:${command.member.id}`;
    default:
      return command.type;
  }
}

/** Mensaje breve y honesto tras guardar una operación. */
export function successMessage(command: DemoCommand) {
  switch (command.type) {
    case "booking.change":
      return {
        checkin: "Llegada registrada. La cita aparece en la fila y en pantalla.",
        call: "Cita llamada. Ya aparece en la pantalla de turnos.",
        cancel: "Cita cancelada. Su horario quedó libre.",
        reschedule: "Cita reprogramada. El nuevo horario quedó reservado.",
        start: "Atención de la cita iniciada.",
        finish: "Atención de la cita finalizada.",
      }[command.action];
    case "queue.change":
      return {
        call: "Turno llamado. Ya se muestra en la pantalla de turnos.",
        start: "Atención del turno iniciada.",
        finish: "Turno finalizado.",
        cancel: "Turno cancelado.",
      }[command.action];
    case "queue.join":
      return "Turno registrado en la fila.";
    case "tattoo.change":
      return `Solicitud actualizada: ${tattooStatus[command.status].label}. No se envió ningún mensaje.`;
    case "team.save":
      return "Jornada guardada. La agenda ya usa estos horarios.";
    case "notifications.read":
      return "Avisos marcados como leídos.";
    case "reset":
      return "Datos de presentación restablecidos.";
    default:
      return "Cambio guardado.";
  }
}
