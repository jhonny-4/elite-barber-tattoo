"use client";
import { useId, useState } from "react";
import { barbers } from "../../domain/catalog";
import { getSlots } from "../../domain/availability";
import type { Booking } from "../../domain/demo";
import type { DemoCommand, SharedState } from "../../services/contracts/demo";
import { ConfirmAction } from "../confirm-action";
import { Icon } from "../icons";
import { dayLabel, isClosedBooking } from "./labels";
import type { Runner } from "./runner";

/** Acciones de una cita: iniciar, finalizar, reprogramar y cancelar (con confirmación). */
export function BookingActions({
  booking,
  state,
  runner,
  today,
  large = false,
}: {
  booking: Booking;
  state: SharedState;
  runner: Runner;
  today: string;
  /** Botones grandes para la vista de barbero en tablet. */
  large?: boolean;
}) {
  const [edit, setEdit] = useState(false);
  const [date, setDate] = useState(booking.date);
  const [barberId, setBarber] = useState(booking.barberId);
  const [time, setTime] = useState(booking.time);
  const formId = useId();
  if (isClosedBooking(booking)) return null;

  const size = large ? "" : " button-small";
  const checkin: DemoCommand = { type: "booking.change", id: booking.id, action: "checkin" };
  const call: DemoCommand = { type: "booking.change", id: booking.id, action: "call" };
  const start: DemoCommand = {
    type: "booking.change",
    id: booking.id,
    action: "start",
  };
  const finish: DemoCommand = {
    type: "booking.change",
    id: booking.id,
    action: "finish",
  };
  const cancel: DemoCommand = {
    type: "booking.change",
    id: booking.id,
    action: "cancel",
  };
  const reschedule: DemoCommand = {
    type: "booking.change",
    id: booking.id,
    action: "reschedule",
    date,
    time,
    barberId,
  };
  const slots = edit
    ? getSlots(
        {
          ...state,
          bookings: state.bookings.filter((b) => b.id !== booking.id),
        },
        barberId,
        booking.serviceId,
        date,
      ).filter((s) => s.available)
    : [];
  const cancelControl = runner.control(cancel);

  return (
    <div className="adm-actions">
      {booking.status === "reservada-demo" ? (
        <>
          {booking.date === today && !booking.arrivedAt && <button type="button" className={`button button-outline${size}`} {...runner.control(checkin)} onClick={() => void runner.run(checkin)}><Icon name="ticket" /> Registrar llegada</button>}
          {booking.date === today && booking.arrivedAt && !booking.calledAt && <button type="button" className={`button button-accent${size}`} {...runner.control(call)} onClick={() => void runner.run(call)}><Icon name="bell" /> Llamar en pantalla</button>}
          {booking.calledAt && <span className="adm-hint">Llamado en pantalla · {booking.turnNumber}</span>}
          {booking.date === today ? (
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
          <button
            type="button"
            className={`button button-outline${size}`}
            aria-expanded={edit}
            aria-controls={formId}
            disabled={!runner.online}
            onClick={() => setEdit(!edit)}
          >
            <Icon name="calendar" />
            Reprogramar
          </button>
        </>
      ) : (
        <button
          type="button"
          className={`button${size}`}
          {...runner.control(finish)}
          onClick={() => void runner.run(finish)}
        >
          <Icon name="check" />
          Finalizar atención
        </button>
      )}
      <ConfirmAction
        className={`button button-danger${size}`}
        title="¿Cancelar esta cita?"
        description={`${booking.name} · ${dayLabel(booking.date, today)} a las ${booking.time}. El horario quedará libre en todos los dispositivos. No se enviará ningún mensaje.`}
        confirmLabel="Sí, cancelar cita"
        cancelLabel="Mantener cita"
        disabled={cancelControl.disabled}
        busy={cancelControl["aria-busy"]}
        onConfirm={() => runner.run(cancel)}
      >
        Cancelar cita
      </ConfirmAction>
      {edit ? (
        <form
          id={formId}
          className="adm-reschedule"
          aria-label={`Reprogramar la cita de ${booking.name}`}
          onSubmit={async (event) => {
            event.preventDefault();
            if (await runner.run(reschedule)) setEdit(false);
          }}
        >
          <div className="adm-reschedule-fields">
            <label>
              Nueva fecha
              <input
                type="date"
                min={today}
                required
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setTime("");
                }}
              />
            </label>
            <label>
              Profesional
              <select
                value={barberId}
                onChange={(e) => {
                  setBarber(e.target.value);
                  setTime("");
                }}
              >
                {barbers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Hora disponible
              <select
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
              >
                <option value="">
                  {slots.length ? "Elige una hora" : "Sin horas libres"}
                </option>
                {slots.map((s) => (
                  <option key={s.time} value={s.time}>
                    {s.time}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {!slots.length ? (
            <p className="adm-hint">
              No quedan horas libres ese día para este profesional. Prueba otra
              fecha o profesional.
            </p>
          ) : null}
          <div className="adm-reschedule-actions">
            <button
              className="button button-small"
              {...runner.control(
                reschedule,
                !slots.some((s) => s.time === time),
              )}
            >
              Guardar nuevo horario
            </button>
            <button
              type="button"
              className="button button-outline button-small"
              onClick={() => setEdit(false)}
            >
              Descartar
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
