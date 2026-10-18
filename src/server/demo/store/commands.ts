import {
  addBooking,
  addTattooRequest,
  todayBogota,
  tattooStatuses,
} from "../../../domain/demo.ts";
import { barbers, services } from "../../../domain/catalog.ts";
import { createDemoId } from "../../../domain/id.ts";
import {
  defaultTeam,
  toMinutes,
  validateTeam,
} from "../../../domain/team/model.ts";
import { scheduleReason } from "../../../domain/scheduling/rules.ts";
import { activeTicket } from "../../../domain/queue/model.ts";
import { MAX_STORED_REFERENCES, referenceIdFromUrl } from "./references.ts";
import type {
  SharedState,
  DemoCommand,
} from "../../../services/contracts/demo.ts";
export const freshSharedState = (): SharedState => ({
  version: 1,
  schema: 4,
  revision: 0,
  bookings: [],
  requests: [],
  queue: [],
  team: defaultTeam(),
  notifications: [],
  receipts: [],
});
const text = (value: unknown, max = 100) =>
  typeof value === "string" && value.trim().length > 0 && value.length <= max;
const contact = (name: unknown, phone: unknown) => {
  if (
    !text(name) ||
    typeof phone !== "string" ||
    !/^[+\d\s()-]{7,20}$/.test(phone)
  )
    throw new Error("Completa un nombre y teléfono de ejemplo válidos.");
};
function notify(state: SharedState, message: string) {
  state.notifications.unshift({
    id: createDemoId(),
    text: message,
    createdAt: new Date().toISOString(),
    read: false,
    channel: "app",
  });
  state.notifications = state.notifications.slice(0, 100);
}
function mail(state: SharedState, message: string) {
  state.notifications.unshift({
    id: createDemoId(),
    text: `Correo SIMULADO · ${message}. No se ha enviado ningún correo.`,
    createdAt: new Date().toISOString(),
    read: false,
    channel: "correo-simulado",
  });
  state.notifications = state.notifications.slice(0, 100);
}
function canAttend(
  state: SharedState,
  barberId: string,
  serviceId: string,
  now: number,
  ignoreBookingId?: string,
) {
  const day = todayBogota(),
    duration = services.find((s) => s.id === serviceId)?.demoDurationMinutes;
  if (!duration) return false;
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Bogota",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
  const start = toMinutes(time),
    end = start + duration;
  if (scheduleReason(state, barberId, day, start, end)) return false;
  if (
    state.queue.some(
      (t) =>
        t.assignedBarberId === barberId &&
        ["llamado", "en-atencion"].includes(t.status),
    )
  )
    return false;
  return !state.bookings.some(
    (b) =>
      b.id !== ignoreBookingId &&
      b.date === day &&
      b.barberId === barberId &&
      !["cancelada", "finalizada"].includes(b.status) &&
      (b.status === "en-atencion" ||
        (start <
          toMinutes(b.time) +
            (services.find((s) => s.id === b.serviceId)?.demoDurationMinutes ??
              30) &&
          end > toMinutes(b.time))),
  );
}
export function applyCommand(
  previous: SharedState,
  command: DemoCommand,
  now = Date.now(),
): { state: SharedState; resultId?: string } {
  let state = structuredClone(previous);
  let resultId: string | undefined;
  if (
    !command ||
    typeof command !== "object" ||
    typeof command.type !== "string"
  )
    throw new Error("Operación de demo inválida.");
  switch (command.type) {
    case "booking.create": {
      const input = command.input;
      contact(input?.name, input?.phone);
      const end =
        toMinutes(input.time) +
        (services.find((s) => s.id === input.serviceId)?.demoDurationMinutes ??
          0);
      if (
        state.bookings.some(
          (b) =>
            b.phone === input.phone.trim() &&
            b.date === input.date &&
            !["cancelada", "finalizada"].includes(b.status) &&
            toMinutes(input.time) <
              toMinutes(b.time) +
                (services.find((s) => s.id === b.serviceId)
                  ?.demoDurationMinutes ?? 0) &&
            end > toMinutes(b.time),
        )
      )
        throw new Error(
          "Este contacto ya tiene una cita que se cruza con ese horario.",
        );
      if (![undefined, "online", "presencial"].includes(input.source))
        throw new Error("Origen de cita inválido.");
      const candidates =
        input.barberId === "any" ? barbers.map((b) => b.id) : [input.barberId];
      let last: unknown;
      for (const id of candidates)
        try {
          const next = addBooking(state, {
            ...input,
            barberId: id,
            source: input.source ?? "online",
            token: createDemoId(),
          });
          state = { ...state, bookings: next.bookings };
          resultId = state.bookings.at(-1)!.id;
          break;
        } catch (error) {
          last = error;
        }
      if (!resultId)
        throw (
          last ?? new Error("No hay profesionales disponibles en ese horario.")
        );
      notify(state, "Nueva reserva demo en la agenda compartida");
      mail(state, "Cita de ejemplo registrada");
      break;
    }
    case "booking.change": {
      const b = state.bookings.find((b) => b.id === command.id);
      if (!b) throw new Error("La cita ya no existe.");
      if (["cancelada", "finalizada"].includes(b.status))
        throw new Error("La cita ya está cerrada.");
      if (command.action === "cancel") {
        b.status = "cancelada";
        notify(state, "Cita cancelada; horario liberado");
      } else if (command.action === "reschedule") {
        if (b.status !== "reservada-demo")
          throw new Error("Solo se puede reprogramar una cita pendiente.");
        const base = {
          ...state,
          bookings: state.bookings.filter((x) => x.id !== b.id),
        };
        const checked = addBooking(base, {
          ...b,
          date: command.date ?? b.date,
          time: command.time ?? b.time,
          barberId: command.barberId ?? b.barberId,
        });
        const updated = checked.bookings.at(-1)!;
        if (
          base.bookings.some(
            (other) =>
              other.phone === updated.phone &&
              other.date === updated.date &&
              !["cancelada", "finalizada"].includes(other.status) &&
              toMinutes(updated.time) <
                toMinutes(other.time) +
                  (services.find((s) => s.id === other.serviceId)
                    ?.demoDurationMinutes ?? 30) &&
              toMinutes(updated.time) +
                (services.find((s) => s.id === updated.serviceId)
                  ?.demoDurationMinutes ?? 30) >
                toMinutes(other.time),
          )
        )
          throw new Error(
            "El contacto tiene otra cita que se cruza con el nuevo horario.",
          );
        Object.assign(b, updated, { id: b.id, token: b.token });
        notify(state, "Cita reprogramada en la agenda demo");
        mail(state, "Cambio de fecha de ejemplo");
      } else if (command.action === "start") {
        if (
          b.status !== "reservada-demo" ||
          b.date !== todayBogota() ||
          Math.abs(now - Date.parse(`${b.date}T${b.time}:00-05:00`)) >
            15 * 60000 ||
          !canAttend(state, b.barberId, b.serviceId, now, b.id)
        )
          throw new Error(
            "La cita solo puede iniciarse cerca de su hora (±15 min) y con el profesional libre.",
          );
        b.status = "en-atencion";
        notify(state, "Atención de cita iniciada");
      } else if (command.action === "finish") {
        if (b.status !== "en-atencion")
          throw new Error("Primero inicia la atención.");
        b.status = "finalizada";
        notify(state, "Atención de cita finalizada");
      } else throw new Error("Acción de cita inválida.");
      resultId = b.id;
      break;
    }
    case "tattoo.create": {
      const input = command.input;
      contact(input?.name, input?.phone);
      if (
        !text(input.idea, 3000) ||
        !text(input.placement) ||
        !text(input.size) ||
        (input.referenceName !== null && !text(input.referenceName, 250))
      )
        throw new Error("Revisa los detalles de tu idea.");
      if (
        input.referenceDataUrl &&
        (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(
          input.referenceDataUrl,
        ) ||
          input.referenceDataUrl.length > 1450000)
      )
        throw new Error("Referencia inválida o mayor a 1 MB.");
      // El repositorio guarda la imagen aparte y solo deja aquí su ruta de lectura.
      if (
        input.referenceUrl !== undefined &&
        referenceIdFromUrl(input.referenceUrl) === null
      )
        throw new Error("Referencia inválida.");
      if (
        input.referenceUrl &&
        state.requests.filter((r) => r.referenceUrl || r.referenceDataUrl)
          .length >= MAX_STORED_REFERENCES
      )
        throw new Error(
          "Se alcanzó el límite de imágenes de referencia. Envía la idea sin imagen o restablece la demo.",
        );
      // Solo campos conocidos: el data URL nunca se guarda en el estado compartido.
      state = {
        ...state,
        requests: addTattooRequest(state, {
          name: input.name,
          phone: input.phone,
          idea: input.idea,
          placement: input.placement,
          size: input.size,
          referenceName: input.referenceName,
          ...(input.referenceUrl ? { referenceUrl: input.referenceUrl } : {}),
        }).requests,
      };
      resultId = state.requests.at(-1)!.id;
      notify(state, "Nueva solicitud de tatuaje pendiente de valoración");
      mail(state, "Solicitud recibida, sin confirmar sesión");
      break;
    }
    case "tattoo.change": {
      const request = state.requests.find((r) => r.id === command.id);
      if (!request) throw new Error("La solicitud ya no existe.");
      const index = tattooStatuses.indexOf(request.status);
      if (
        request.status === "cerrada" ||
        (command.status !== "cerrada" &&
          tattooStatuses[index + 1] !== command.status)
      )
        throw new Error("Transición de solicitud inválida.");
      request.status = command.status;
      resultId = request.id;
      notify(
        state,
        "Estado de tatuaje actualizado (sin cotización ni cita automática)",
      );
      break;
    }
    case "team.save": {
      validateTeam(command.member);
      const member = structuredClone(command.member);
      const proposed = {
        ...state,
        team: state.team.map((b) => (b.id === member.id ? member : b)),
      };
      if (
        state.queue.some(
          (t) =>
            t.assignedBarberId === member.id &&
            ["llamado", "en-atencion"].includes(t.status),
        )
      )
        throw new Error(
          "Finaliza la atención presencial antes de cambiar esta jornada.",
        );
      for (const b of state.bookings.filter(
        (b) =>
          b.barberId === member.id &&
          !["cancelada", "finalizada"].includes(b.status) &&
          b.date >= todayBogota(),
      ))
        if (
          scheduleReason(
            { ...proposed, queue: [] },
            member.id,
            b.date,
            toMinutes(b.time),
            toMinutes(b.time) +
              (services.find((s) => s.id === b.serviceId)
                ?.demoDurationMinutes ?? 30),
          )
        )
          throw new Error(
            "El cambio afecta una cita existente. Reprográmala o cancélala primero.",
          );
      state = proposed;
      state.unavailableBarberIds = [];
      notify(state, "Horario y disponibilidad del equipo actualizados");
      break;
    }
    case "queue.join": {
      const input = command.input;
      contact(input?.name, input?.phone);
      if (
        !services.some((s) => s.id === input.serviceId) ||
        (input.barberId !== "any" &&
          !barbers.some((b) => b.id === input.barberId)) ||
        !["qr", "presencial"].includes(input.source)
      )
        throw new Error("Servicio, profesional u origen inválido.");
      if (
        !state.team.some(
          (b) =>
            b.active && (input.barberId === "any" || b.id === input.barberId),
        )
      )
        throw new Error("El profesional está inactivo. Elige otro.");
      if (
        state.queue.some(
          (t) =>
            t.date === todayBogota() &&
            t.phone === input.phone.trim() &&
            activeTicket(t),
        )
      )
        throw new Error("Ese contacto ya tiene un turno activo hoy.");
      const day = todayBogota(),
        number = state.queue.filter((t) => t.date === day).length + 1;
      const ticket = {
        ...input,
        name: input.name.trim(),
        phone: input.phone.trim(),
        id: createDemoId(),
        token: createDemoId(),
        number: `E-${String(number).padStart(3, "0")}`,
        date: day,
        status: "esperando" as const,
        createdAt: new Date(now).toISOString(),
      };
      state.queue.push(ticket);
      resultId = ticket.id;
      notify(state, `Turno ${ticket.number} registrado en la fila demo`);
      break;
    }
    case "queue.change": {
      const ticket = state.queue.find((t) => t.id === command.id);
      if (!ticket) throw new Error("Turno inexistente.");
      if (!activeTicket(ticket)) throw new Error("Este turno ya está cerrado.");
      if (command.action === "cancel") {
        ticket.status = "cancelado";
        ticket.finishedAt = new Date(now).toISOString();
      } else {
        if (ticket.date !== todayBogota())
          throw new Error(
            "Solo se atienden turnos del día actual. Cancela los turnos vencidos.",
          );
        if (command.action === "call") {
          if (ticket.status !== "esperando")
            throw new Error("El turno ya fue llamado.");
          const candidates = barbers.filter(
            (b) =>
              (ticket.barberId === "any" || b.id === ticket.barberId) &&
              (!command.barberId || b.id === command.barberId),
          );
          const assigned = candidates.find(
            (b) =>
              canAttend(state, b.id, ticket.serviceId, now) &&
              !state.queue.some(
                (t) =>
                  t.date === ticket.date &&
                  t.status === "esperando" &&
                  state.queue.indexOf(t) < state.queue.indexOf(ticket) &&
                  (t.barberId === "any" || t.barberId === b.id),
              ),
          );
          if (!assigned)
            throw new Error(
              "No hay un profesional libre para atender el servicio completo ahora. Revisa citas y descansos.",
            );
          if (
            state.queue.some(
              (t) =>
                t.date === ticket.date &&
                t.status === "esperando" &&
                t.createdAt < ticket.createdAt &&
                (t.barberId === "any" || t.barberId === assigned.id),
            )
          )
            throw new Error(
              "Llama primero al turno anterior compatible con ese profesional.",
            );
          ticket.status = "llamado";
          ticket.assignedBarberId = assigned.id;
          ticket.reservedStart = new Date(now).toISOString();
        } else if (command.action === "start") {
          if (ticket.status !== "llamado")
            throw new Error("Primero llama el turno.");
          if (
            !canAttend(
              {
                ...state,
                queue: state.queue.filter((t) => t.id !== ticket.id),
              },
              ticket.assignedBarberId!,
              ticket.serviceId,
              now,
            )
          )
            throw new Error(
              "El servicio ya no cabe antes de la próxima cita o descanso. Revisa la agenda antes de iniciar.",
            );
          ticket.status = "en-atencion";
          ticket.reservedStart = new Date(now).toISOString();
        } else if (command.action === "finish") {
          if (ticket.status !== "en-atencion")
            throw new Error("Primero inicia la atención.");
          ticket.status = "finalizado";
          ticket.finishedAt = new Date(now).toISOString();
        } else throw new Error("Acción de turno inválida.");
      }
      resultId = ticket.id;
      notify(state, `Turno ${ticket.number}: ${ticket.status}`);
      break;
    }
    case "notifications.read":
      state.notifications.forEach((n) => (n.read = true));
      break;
    case "reset":
      state = freshSharedState();
      break;
    default:
      throw new Error("Operación desconocida.");
  }
  return { state, resultId };
}
