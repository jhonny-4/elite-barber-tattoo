"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar } from "../calendar";
import { Icon } from "../icons";
import { prettyDate, shiftDate } from "../../domain/availability";
import { TimeSlots } from "./time-slots";
import type { SlotView } from "./availability-view";

/**
 * Cambio de fecha u hora desde el enlace privado. Mismo barbero y servicio:
 * el servidor vuelve a validar token, ventana de 2 h, límite y disponibilidad.
 */
export function ReschedulePanel({
  token,
  barberSlug,
  serviceSlug,
  today,
  remaining,
}: {
  token: string;
  barberSlug: string;
  serviceSlug: string;
  /** Fecha de hoy en Bogotá (AAAA-MM-DD), calculada en el servidor. */
  today: string;
  remaining: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<SlotView[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const attemptKey = useRef("");
  const headingId = useId();
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setLoadError("");
    fetch(
      `/api/reservas/disponibilidad?barbero=${encodeURIComponent(barberSlug)}&servicio=${encodeURIComponent(serviceSlug)}&fecha=${date}`,
    )
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        return d as { slots: { time: string; available: boolean }[] };
      })
      .then((d) => {
        if (active)
          setSlots(
            d.slots.map((s) => ({
              time: s.time,
              available: s.available,
              reason: s.available ? "" : "No disponible",
              short: s.available ? "" : "Ocupado",
            })),
          );
      })
      .catch((e: Error) => {
        if (active) {
          setSlots([]);
          setLoadError(e.message || "No se pudo consultar la disponibilidad.");
        }
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [open, date, barberSlug, serviceSlug]);

  function show() {
    setOpen(true);
    setDone("");
    // Foco al título del panel para lectores de pantalla y teclado.
    requestAnimationFrame(() => heading.current?.focus());
  }

  async function confirm() {
    if (!time || busy) return;
    setBusy(true);
    setError("");
    try {
      if (!attemptKey.current) attemptKey.current = crypto.randomUUID().replaceAll("-", "");
      const response = await fetch("/api/reservas/reprogramar", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": attemptKey.current },
        body: JSON.stringify({ token, date, time }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "No se pudo reprogramar.");
      setDone(`Tu cita quedó para el ${prettyDate(date)} a las ${time}. Te enviamos la confirmación por correo.`);
      setOpen(false);
      setTime("");
      attemptKey.current = "";
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      // Un intento fallido no debe reutilizar la referencia del siguiente cambio.
      attemptKey.current = "";
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bk-reschedule">
      {done && (
        <p className="bk-reschedule-done" role="status">
          <Icon name="check" /> {done}
        </p>
      )}
      {!open ? (
        <button type="button" className="button button-accent" onClick={show} aria-expanded="false">
          <Icon name="calendar" /> Cambiar fecha u hora
        </button>
      ) : (
        <section className="surface bk-reschedule-panel" aria-labelledby={headingId}>
          <header>
            <p className="eyebrow">Reprogramar</p>
            <h2 id={headingId} ref={heading} tabIndex={-1}>
              Elige tu nueva fecha
            </h2>
            <p>
              Mismo barbero y mismo servicio. Te quedan {remaining} {remaining === 1 ? "cambio" : "cambios"} para esta cita.
            </p>
          </header>
          <div className="bk-reschedule-grid">
            <Calendar
              value={date}
              today={today}
              onChange={(d) => {
                setDate(d);
                setTime("");
                setError("");
              }}
              lastDate={shiftDate(today, 60)}
            />
            <TimeSlots
              key={date}
              slots={slots}
              value={time}
              onChange={(t) => {
                setTime(t);
                setError("");
              }}
              dateLabel={prettyDate(date)}
              empty={
                !loading && !loadError ? (
                  <div className="bk-empty">
                    <p>
                      <strong>No quedan horarios libres este día.</strong> Prueba otra fecha en el calendario.
                    </p>
                  </div>
                ) : undefined
              }
            />
          </div>
          {loading && (
            <p className="loading-state" role="status">
              Consultando disponibilidad…
            </p>
          )}
          {loadError && (
            <p className="inline-error" role="alert">
              {loadError}
            </p>
          )}
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
          <div className="bk-reschedule-actions">
            <button
              type="button"
              className="button button-outline"
              onClick={() => {
                setOpen(false);
                setError("");
              }}
            >
              Mantener mi hora
            </button>
            <button type="button" className="button" onClick={confirm} disabled={!time || busy} aria-busy={busy}>
              {busy ? "Guardando…" : time ? `Confirmar ${time}` : "Elige una hora"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
