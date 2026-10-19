import { barbers, services } from "./catalog.ts";
import { createDemoId } from "./id.ts";
import type { TeamMember } from "./team/model.ts";
import type { QueueTicket } from "./queue/model.ts";
import { scheduleReason } from "./scheduling/rules.ts";

export type Booking = {
  id: string;
  barberId: string;
  serviceId: string;
  date: string;
  time: string;
  name: string;
  phone: string;
  status: "reservada-demo" | "cancelada" | "en-atencion" | "finalizada";
  source?: "online" | "presencial";
  token?: string;
  arrivedAt?: string;
  calledAt?: string;
  turnNumber?: string;
};
export const tattooStatuses = [
  "pendiente",
  "en-evaluacion",
  "cotizada",
  "fecha-acordada",
  "cerrada",
] as const;
export type TattooRequest = {
  id: string;
  name: string;
  phone: string;
  idea: string;
  placement: string;
  size: string;
  referenceName: string | null;
  /** Solo en la entrada del formulario; el servidor la guarda aparte y la quita del estado compartido. */
  referenceDataUrl?: string;
  /** Ruta servida por la API para ver la referencia guardada (`/api/demo/reference/{id}`). */
  referenceUrl?: string;
  status: (typeof tattooStatuses)[number];
};
export type DemoState = {
  version: 1;
  bookings: Booking[];
  requests: TattooRequest[];
  unavailableBarberIds?: string[];
  team?: TeamMember[];
  queue?: QueueTicket[];
};
export const emptyState = (): DemoState => ({
  version: 1,
  bookings: [],
  requests: [],
});
const minutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};
export const todayBogota = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export function addBooking(
  state: DemoState,
  input: Omit<Booking, "id" | "status">,
): DemoState {
  const service = services.find((s) => s.id === input.serviceId);
  if (!service || !barbers.some((b) => b.id === input.barberId))
    throw new Error("Selecciona un servicio y profesional válidos.");
  if (state.unavailableBarberIds?.includes(input.barberId))
    throw new Error(
      "Este profesional está pausado en la agenda demo. Elige otro.",
    );
  if (!input.name.trim() || !/^[+\d\s()-]{7,20}$/.test(input.phone))
    throw new Error("Completa tu nombre y un teléfono válido.");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(input.date) ||
    Number.isNaN(Date.parse(input.date)) ||
    new Date(input.date).toISOString().slice(0, 10) !== input.date ||
    input.date < todayBogota()
  )
    throw new Error("Selecciona una fecha válida desde hoy.");
  if (Date.parse(input.date) - Date.parse(todayBogota()) > 60 * 86400000)
    throw new Error(
      "La agenda demo permite reservar hasta 60 días hacia adelante.",
    );
  if (
    !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(input.time) ||
    minutes(input.time) % 15 !== 0 ||
    minutes(input.time) <
      minutes(
        state.team?.find((b) => b.id === input.barberId)?.open ?? "10:00",
      ) ||
    minutes(input.time) + service.demoDurationMinutes >
      minutes(
        state.team?.find((b) => b.id === input.barberId)?.close ?? "18:00",
      )
  )
    throw new Error(
      "Selecciona un horario dentro de la disponibilidad demo (10:00–18:00).",
    );
  if (Date.parse(`${input.date}T${input.time}:00-05:00`) <= Date.now())
    throw new Error("Ese horario ya pasó. Selecciona uno futuro.");
  const start = minutes(input.time),
    end = start + service.demoDurationMinutes;
  const blocked = scheduleReason(state, input.barberId, input.date, start, end);
  if (blocked) throw new Error(blocked);
  const conflict = state.bookings.some(
    (b) =>
      !["cancelada", "finalizada"].includes(b.status) &&
      b.barberId === input.barberId &&
      b.date === input.date &&
      start <
        minutes(b.time) +
          (services.find((s) => s.id === b.serviceId)?.demoDurationMinutes ??
            0) &&
      end > minutes(b.time),
  );
  if (conflict)
    throw new Error(
      "Ese profesional tiene una cita demo que se cruza con este horario. Elige otro.",
    );
  return {
    ...state,
    bookings: [
      ...state.bookings,
      {
        ...input,
        name: input.name.trim(),
        id: createDemoId(),
        status: "reservada-demo",
      },
    ],
  };
}
export function addTattooRequest(
  state: DemoState,
  input: Omit<TattooRequest, "id" | "status">,
): DemoState {
  if (
    !input.name.trim() ||
    !/^[+\d\s()-]{7,20}$/.test(input.phone) ||
    input.idea.trim().length < 10 ||
    !input.placement.trim() ||
    !input.size.trim()
  )
    throw new Error(
      "Completa contacto, zona, tamaño e idea con al menos 10 caracteres.",
    );
  return {
    ...state,
    requests: [
      ...state.requests,
      { ...input, id: createDemoId(), status: "pendiente" },
    ],
  };
}
