"use client";
import type { Booking } from "../../domain/demo";
import { activeTicket, type QueueTicket } from "../../domain/queue/model";
import type { DemoCommand, SharedState } from "../../services/contracts/demo";
import { ConfirmAction } from "../confirm-action";
import { Icon } from "../icons";
import { BookingActions } from "./booking-actions";
import {
  barberName,
  bookingSource,
  bookingStatus,
  clock,
  dayLabel,
  fromMinutes,
  isClosedBooking,
  serviceName,
  serviceOf,
  ticketSource,
  ticketStatus,
  toMinutes,
} from "./labels";
import type { Runner } from "./runner";
import { StatusBadge } from "./ui";

/** Cita de la agenda con su estado y acciones. */
export function BookingItem({
  booking,
  state,
  runner,
  today,
  large = false,
  showDate = false,
}: {
  booking: Booking;
  state: SharedState;
  runner: Runner;
  today: string;
  large?: boolean;
  showDate?: boolean;
}) {
  const service = serviceOf(booking.serviceId);
  const status = bookingStatus[booking.status];
  const end = service
    ? fromMinutes(toMinutes(booking.time) + service.demoDurationMinutes)
    : null;
  return (
    <article
      className="adm-item"
      data-status={booking.status}
      data-closed={isClosedBooking(booking) || undefined}
    >
      <div className="adm-item-lead">
        <strong>
          <span className="visually-hidden">Hora </span>
          {booking.time}
        </strong>
        {showDate ? (
          <span className="adm-item-day">{dayLabel(booking.date, today)}</span>
        ) : null}
        {end ? <span>hasta {end}</span> : null}
      </div>
      <div className="adm-item-main">
        <h3>{booking.name}</h3>
        <p>
          {service?.name ?? "Barbería"} · {barberName(booking.barberId)}
        </p>
        <p className="adm-item-sub">
          {bookingSource[booking.source ?? "online"]} · {booking.phone}
        </p>
      </div>
      <div className="adm-item-status">
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
      </div>
      {!isClosedBooking(booking) ? (
        <BookingActions
          booking={booking}
          state={state}
          runner={runner}
          today={today}
          large={large}
        />
      ) : null}
    </article>
  );
}

/** Turno presencial o por QR con sus acciones según el estado. */
export function TicketItem({
  ticket,
  runner,
  today,
  barberId,
  primary = false,
  large = false,
  canCall = true,
}: {
  ticket: QueueTicket;
  runner: Runner;
  today: string;
  /** Profesional que llama (vista de barbero o filtro activo). */
  barberId?: string;
  /** Destaca en rojo «Llamar» para el siguiente turno de la fila. */
  primary?: boolean;
  large?: boolean;
  canCall?: boolean;
}) {
  const active = activeTicket(ticket);
  const expired = active && ticket.date < today;
  const status = ticketStatus[ticket.status];
  const size = large ? "" : " button-small";
  const professional = ticket.assignedBarberId
    ? barberName(ticket.assignedBarberId)
    : ticket.barberId === "any"
      ? "Primer disponible"
      : barberName(ticket.barberId);
  const command = (action: "call" | "start" | "finish" | "cancel") =>
    ({
      type: "queue.change",
      id: ticket.id,
      action,
      ...(action === "call" && barberId ? { barberId } : {}),
    }) as DemoCommand;
  const call = command("call"),
    start = command("start"),
    finish = command("finish"),
    cancel = command("cancel");
  const cancelControl = runner.control(cancel);
  return (
    <article
      className="adm-item adm-ticket"
      data-status={ticket.status}
      data-closed={!active || undefined}
    >
      <div className="adm-item-lead">
        <strong>
          <span className="visually-hidden">Turno </span>
          {ticket.number}
        </strong>
        <span>
          {expired
            ? `Registrado ${dayLabel(ticket.date, today).toLowerCase()}`
            : `Llegó a las ${clock(ticket.createdAt)}`}
        </span>
      </div>
      <div className="adm-item-main">
        <h3>{ticket.name}</h3>
        <p>
          {serviceName(ticket.serviceId)} · {professional}
        </p>
        <p className="adm-item-sub">
          {ticketSource[ticket.source]} · {ticket.phone}
        </p>
      </div>
      <div className="adm-item-status">
        <StatusBadge tone={expired ? "pending" : status.tone}>
          {expired ? "Vencido" : status.label}
        </StatusBadge>
      </div>
      {active ? (
        <div className="adm-actions">
          {!expired && ticket.status === "esperando" && canCall ? (
            <button
              type="button"
              className={`button${primary ? " button-accent" : ""}${size}`}
              {...runner.control(call)}
              onClick={() => void runner.run(call)}
            >
              <Icon name="bell" />
              Llamar turno
            </button>
          ) : null}
          {!expired && ticket.status === "llamado" ? (
            <button
              type="button"
              className={`button${size}`}
              {...runner.control(start)}
              onClick={() => void runner.run(start)}
            >
              <Icon name="scissors" />
              Iniciar atención
            </button>
          ) : null}
          {!expired && ticket.status === "en-atencion" ? (
            <button
              type="button"
              className={`button${size}`}
              {...runner.control(finish)}
              onClick={() => void runner.run(finish)}
            >
              <Icon name="check" />
              Finalizar atención
            </button>
          ) : null}
          <ConfirmAction
            className={`button button-danger${size}`}
            title={`¿Cancelar el turno ${ticket.number}?`}
            description={`${ticket.name} saldrá de la fila activa y de la pantalla de turnos. No se enviará ningún mensaje.`}
            confirmLabel="Sí, cancelar turno"
            cancelLabel="Mantener turno"
            disabled={cancelControl.disabled}
            busy={cancelControl["aria-busy"]}
            onConfirm={() => runner.run(cancel)}
          >
            Cancelar turno
          </ConfirmAction>
        </div>
      ) : null}
    </article>
  );
}

/** Agrupa citas por fecha, en orden. */
export function groupByDate(list: Booking[]) {
  const groups = new Map<string, Booking[]>();
  for (const booking of list)
    groups.set(booking.date, [...(groups.get(booking.date) ?? []), booking]);
  return [...groups.entries()];
}
