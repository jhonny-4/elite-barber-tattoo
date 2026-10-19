"use client";
import { useState } from "react";
import Link from "next/link";
import { useDemo } from "../../lib/use-demo";
import { todayBogota } from "../../domain/demo";
import { Icon } from "../icons";

export function BookingArrival({ id }: { id: string }) {
  const demo = useDemo();
  const booking = demo.state.bookings.find((b) => b.id === id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!booking || ["cancelada", "finalizada"].includes(booking.status)) return null;
  if (booking.date !== todayBogota()) return <p className="bk-honest">Tu llegada se registra el día de la cita. La reserva ya está en la agenda.</p>;
  return <section className="booking-arrival surface" aria-label="Llegada al local">
    {booking.arrivedAt ? <><h3>Tu turno: {booking.turnNumber}</h3><p>Espera a que te llamen en la pantalla del local.</p><Link href="/pantalla-turnos" className="text-link">Ver pantalla de turnos <Icon name="screen" /></Link></> : <><h3>¿Ya estás en Elite?</h3><p>Registra tu llegada únicamente cuando estés en el local para aparecer en la fila.</p><button type="button" className="button button-accent" disabled={busy || !demo.online} onClick={async () => { setBusy(true); setError(""); try { await demo.dispatch({ type: "booking.change", id, action: "checkin" }); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }}>{busy ? "Registrando…" : "Ya estoy en el local · registrar llegada"}<Icon name="ticket" /></button></>}
    {error && <p role="alert" className="inline-error">{error}</p>}
  </section>;
}
