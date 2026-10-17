"use client";
import { useState } from "react";
import { barbers } from "../../domain/catalog";
import { getSlots } from "../../domain/availability";
import { todayBogota, type Booking } from "../../domain/demo";
import type { DemoCommand, SharedState } from "../../services/contracts/demo";
import { ConfirmAction } from "../confirm-action";
export function BookingActions({
  booking,
  state,
  run,
  busy,
}: {
  booking: Booking;
  state: SharedState;
  run: (command: DemoCommand) => Promise<unknown>;
  busy: boolean;
}) {
  const [edit, setEdit] = useState(false),
    [date, setDate] = useState(booking.date),
    [barberId, setBarber] = useState(booking.barberId),
    [time, setTime] = useState(booking.time);
  if (["cancelada", "finalizada"].includes(booking.status)) return null;
  const slots = getSlots(
    { ...state, bookings: state.bookings.filter((b) => b.id !== booking.id) },
    barberId,
    booking.serviceId,
    date,
  );
  return (
    <div className="booking-actions">
      {booking.status === "reservada-demo" ? (
        <>
          <button
            className="text-link"
            disabled={busy}
            onClick={() =>
              void run({
                type: "booking.change",
                id: booking.id,
                action: "start",
              })
            }
          >
            Iniciar atención
          </button>
          <button className="text-link" onClick={() => setEdit(!edit)}>
            Reprogramar
          </button>
        </>
      ) : (
        <button
          className="button button-small"
          disabled={busy}
          onClick={() =>
            void run({
              type: "booking.change",
              id: booking.id,
              action: "finish",
            })
          }
        >
          Finalizar atención
        </button>
      )}
      <ConfirmAction
        disabled={busy}
        title="¿Cancelar esta cita demo?"
        description="Se liberará su horario en todos los dispositivos de la presentación."
        onConfirm={() =>
          void run({ type: "booking.change", id: booking.id, action: "cancel" })
        }
      >
        Cancelar cita
      </ConfirmAction>
      {edit && (
        <form
          className="reschedule-form"
          onSubmit={async (e) => {
            e.preventDefault();
            await run({
              type: "booking.change",
              id: booking.id,
              action: "reschedule",
              date,
              time,
              barberId,
            });
          }}
        >
          <label>
            Nueva fecha
            <input
              type="date"
              min={todayBogota()}
              required
              aria-label="Nueva fecha"
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
              aria-label="Profesional para reprogramar"
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
              aria-label="Hora disponible"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            >
              <option value="">Elegir</option>
              {slots
                .filter((s) => s.available)
                .map((s) => (
                  <option key={s.time}>{s.time}</option>
                ))}
            </select>
          </label>
          <button
            className="button button-small"
            disabled={
              busy || !slots.some((s) => s.available && s.time === time)
            }
          >
            Guardar cambio demo
          </button>
        </form>
      )}
    </div>
  );
}
