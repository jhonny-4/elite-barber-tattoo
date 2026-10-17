"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { barbers, services } from "../../domain/catalog";
import { postDemo } from "../../services/adapters/http-demo";
import type { DemoCommand, PublicTicket } from "../../services/contracts/demo";
import { usePublicQueue } from "../../lib/use-public-queue";
import { ContactFields } from "../booking-flow";
import { Brand } from "../media";
export function JoinForm({
  manual = false,
  onCreate,
}: {
  manual?: boolean;
  onCreate?: (command: DemoCommand) => Promise<unknown>;
}) {
  const [token, setToken] = useState(""),
    [created, setCreated] = useState<PublicTicket | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const live = usePublicQueue(token);
  useEffect(() => {
    if (!manual)
      try {
        setToken(sessionStorage.getItem("elite.queue.ticket") ?? "");
      } catch {}
  }, [manual]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget,
      data = new FormData(form);
    setBusy(true);
    setError("");
    try {
      const command: DemoCommand = {
        type: "queue.join",
        input: {
          name: String(data.get("name")),
          phone: String(data.get("phone")),
          serviceId: String(data.get("serviceId")),
          barberId: String(data.get("barberId")),
          source: manual ? "presencial" : "qr",
        },
      };
      if (manual && onCreate) {
        const saved = await onCreate(command);
        if (!saved)
          throw new Error("No se guardó el turno. Revisa el aviso del panel.");
        form.reset();
        setError("Turno presencial guardado en la fila compartida.");
      } else {
        const result = await postDemo<{ ticket: PublicTicket; token: string }>(
          "/api/demo/queue",
          command,
        );
        setCreated(result.ticket);
        setToken(result.token);
        try {
          sessionStorage.setItem("elite.queue.ticket", result.token);
        } catch {
          setError("Conserva esta pantalla para consultar tu turno.");
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const ticket = live.missing ? null : (live.ticket ?? created);
  if (token && !manual)
    return (
      <section className="v4-card ticket-receipt">
        <Brand />
        <p className="eyebrow">TU TURNO / DEMOSTRACIÓN LOCAL</p>
        {ticket ? (
          <>
            <strong className="ticket-number">{ticket.number}</strong>
            <span className="status-badge">{ticket.status}</span>
            <h3>{ticket.service}</h3>
            <p>{ticket.barber}</p>
            {ticket.position !== null && (
              <p>
                Posición general: <strong>{ticket.position}</strong>
              </p>
            )}
            <p>
              {ticket.estimatedMinutes !== null
                ? `Espera orientativa: ${ticket.estimatedMinutes} min`
                : "La espera se confirmará según la disponibilidad del equipo."}
            </p>
            <small>
              Estimación de ejemplo. El orden de llamada puede variar según el
              profesional elegido y las citas.
            </small>
          </>
        ) : (
          <p>
            {live.missing
              ? "Este turno ya no está disponible. Vuelve al registro para comenzar una nueva demostración."
              : "Consultando turno…"}
          </p>
        )}
        <p role="status">{live.error || error}</p>
        <Link href="/pantalla-turnos" className="button">
          Ver pantalla de turnos ↗
        </Link>
        <button
          className="text-link"
          onClick={() => {
            setToken("");
            setCreated(null);
            try {
              sessionStorage.removeItem("elite.queue.ticket");
            } catch {}
          }}
        >
          Volver al registro (no cancela el turno)
        </button>
      </section>
    );
  return (
    <form className="v4-card v4-form" onSubmit={submit}>
      <p className="eyebrow">
        {manual ? "RECEPCIÓN / CLIENTE PRESENCIAL" : "REGISTRO QR / FILA DEMO"}
      </p>
      <h2>
        {manual
          ? "Registrar un turno presencial"
          : "Tu siguiente corte empieza aquí."}
      </h2>
      <p>
        Solo datos ficticios. Registrarse en la fila no confirma una hora de
        atención.
      </p>
      <ContactFields />
      <div className="field-row">
        <label>
          Servicio
          <select name="serviceId">
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Profesional
          <select name="barberId">
            <option value="any">Primer disponible</option>
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="checkbox-label">
        <input type="checkbox" required /> Entiendo que es una demostración y
        usaré datos ficticios.
      </label>
      <p role="status">{error || live.error}</p>
      <button className="button" disabled={busy || !live.online}>
        {busy ? "Registrando…" : "Tomar turno demo"}
      </button>
    </form>
  );
}
