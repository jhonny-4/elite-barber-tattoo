"use client";
import { useCallback, useEffect, useState } from "react";
import { signOut } from "../../server/auth/actions";
import {
  bookingTransitions,
  queueTransitions,
  tattooTransitions,
} from "../../domain/staff-transitions";
import type { Database } from "../../server/supabase/database.types";
import "./live-panel.css";
type Row<K extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][K]["Row"];
type Data = {
  staff: { role: string; name: string | null; barberId: string | null };
  bookings: Pick<
    Row<"bookings">,
    | "id"
    | "barber_id"
    | "service_id"
    | "starts_at"
    | "status"
    | "customer_name"
    | "customer_phone"
    | "customer_email"
    | "price_cop"
  >[];
  queue: Pick<
    Row<"queue_tickets">,
    "id" | "number" | "barber_id" | "service_id" | "customer_name" | "status"
  >[];
  barbers: Pick<Row<"barbers">, "id" | "slug" | "display_name" | "active">[];
  services: Pick<Row<"services">, "id" | "name">[];
  hours: Pick<
    Row<"work_hours">,
    "barber_id" | "weekday" | "opens" | "closes"
  >[];
  tattoos: Pick<
    Row<"tattoo_requests">,
    | "id"
    | "customer_name"
    | "customer_phone"
    | "idea"
    | "placement"
    | "size"
    | "status"
    | "reference_path"
  >[];
  notifications: Pick<
    Row<"notifications">,
    "id" | "sent_at" | "last_error" | "attempts" | "template"
  >[];
};
const labels: Record<string, string> = {
  confirmada: "Confirmada",
  en_atencion: "En atención",
  finalizada: "Finalizada",
  cancelada: "Cancelada",
  no_asistio: "No asistió",
  esperando: "Esperando",
  llamado: "Llamado",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
  pendiente: "Pendiente",
  en_evaluacion: "En evaluación",
  cotizada: "Cotizada",
  fecha_acordada: "Fecha acordada",
  cerrada: "Cerrada",
};
export function LivePanel() {
  const [date, setDate] = useState(() =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(
      new Date(),
    ),
  );
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("agenda");
  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const res = await fetch(`/api/equipo?date=${date}`, {
          cache: "no-store",
          signal,
        });
        const result = await res.json();
        if (!res.ok)
          throw new Error(result.error ?? "No se pudo cargar la agenda.");
        if (signal?.aborted) return;
        setData(result);
        setError("");
      } catch (e) {
        if (!signal?.aborted)
          setError(e instanceof Error ? e.message : "Sin conexión.");
      }
    },
    [date],
  );
  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    const timer = setInterval(() => {
      if (!document.hidden) void refresh(controller.signal);
    }, 10000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [refresh]);
  async function act(body: Record<string, unknown>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/equipo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (result.url) window.open(result.url, "_blank", "noopener,noreferrer");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }
  const owner = data?.staff.role === "dueno";
  const barber = (id: string | null) =>
    data?.barbers.find((b) => b.id === id)?.display_name ?? "Sin asignar";
  const service = (id: string) =>
    data?.services.find((s) => s.id === id)?.name ?? "Servicio";
  function buttons(
    kind: string,
    id: string,
    status: string,
    transitions: Record<string, string[]>,
  ) {
    return (
      <div className="live-actions">
        {kind === "booking" && status === "confirmada" && (
          <button
            className="button button-outline"
            disabled={busy || !!error}
            onClick={() => void act({ kind: "checkin", id })}
          >
            Registrar llegada
          </button>
        )}
        {(transitions[status] ?? [])
          .filter((s) => owner || !["cancelada", "no_asistio"].includes(s))
          .map((next) => (
            <button
              className="button button-outline"
              key={next}
              disabled={busy || !!error}
              onClick={() => {
                if (
                  next.startsWith("cancel") &&
                  !window.confirm("¿Confirmas la cancelación?")
                )
                  return;
                void act({ kind, id, status: next });
              }}
            >
              {labels[next]}
            </button>
          ))}
        {owner && kind === "booking" && status === "confirmada" && (
          <details>
            <summary>Reprogramar</summary>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void act({
                  kind: "reschedule",
                  id,
                  date: f.get("date"),
                  time: f.get("time"),
                  barberId: f.get("barber"),
                });
              }}
            >
              <label>
                Fecha
                <input type="date" name="date" required defaultValue={date} />
              </label>
              <label>
                Hora
                <input type="time" name="time" required step={900} />
              </label>
              <label>
                Profesional
                <select name="barber" required>
                  {data?.barbers
                    .filter((b) => b.active)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.display_name}
                      </option>
                    ))}
                </select>
              </label>
              <button
                className="button button-outline"
                disabled={busy || !!error}
              >
                Guardar nueva cita
              </button>
              <p>
                Informa al cliente del cambio. El enlace de consulta conserva la
                cita actualizada.
              </p>
            </form>
          </details>
        )}
      </div>
    );
  }
  return (
    <section className="live-panel">
      <header>
        <div>
          <p className="eyebrow">Elite · Equipo</p>
          <h1>{owner ? "Administración" : "Mi agenda"}</h1>
          <p>{data?.staff.name} · Hora de Cartagena</p>
        </div>
        <button
          className="button button-outline"
          onClick={() => void signOut()}
        >
          Salir
        </button>
      </header>
      <nav aria-label="Secciones del panel">
        {[
          "agenda",
          "fila",
          ...(owner ? ["tatuajes", "equipo", "correos"] : []),
        ].map((t) => (
          <button
            className="button button-outline"
            key={t}
            aria-pressed={tab === t}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
        <a
          className="button button-outline"
          href="/pantalla-turnos"
          target="_blank"
          rel="noreferrer"
        >
          Monitor
        </a>
      </nav>
      <div className="live-actions">
        <label>
          Fecha{" "}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <button
          className="button button-outline"
          onClick={() => void refresh()}
        >
          Actualizar
        </button>
      </div>
      {error && (
        <p role="alert">{error} No confirmes cambios hasta reconectar.</p>
      )}
      {!data && !error && <p>Cargando agenda…</p>}
      {tab === "agenda" && data && (
        <>
          <h2>Citas · {data.bookings.length}</h2>
          {!data.bookings.length && <p>No hay citas para esta fecha.</p>}
          <div className="live-grid">
            {data.bookings.map((b) => (
              <article key={b.id}>
                <p className="eyebrow">
                  {new Intl.DateTimeFormat("es-CO", {
                    timeZone: "America/Bogota",
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(new Date(b.starts_at))}{" "}
                  · {labels[b.status] ?? b.status}
                </p>
                <h3>{b.customer_name}</h3>
                <p>
                  {service(b.service_id)} · {barber(b.barber_id)}
                </p>
                <p>
                  {b.customer_phone} · {b.customer_email}
                </p>
                <p>${b.price_cop.toLocaleString("es-CO")} COP</p>
                {buttons("booking", b.id, b.status, bookingTransitions)}
              </article>
            ))}
          </div>
        </>
      )}
      {tab === "fila" && data && (
        <>
          <h2>Fila · {data.queue.length}</h2>
          {!data.queue.length && <p>No hay turnos para esta fecha.</p>}
          <div className="live-grid">
            {data.queue.map((q) => (
              <article key={q.id}>
                <p className="eyebrow">
                  Turno {q.number} · {labels[q.status]}
                </p>
                <h3>{q.customer_name}</h3>
                <p>
                  {barber(q.barber_id)} · {service(q.service_id)}
                </p>
                {buttons("queue", q.id, q.status, queueTransitions)}
              </article>
            ))}
          </div>
        </>
      )}
      {tab === "tatuajes" && owner && (
        <>
          <h2>Solicitudes de tatuaje</h2>
          <div className="live-grid">
            {data?.tattoos.map((t) => (
              <article key={t.id}>
                <p className="eyebrow">{labels[t.status]}</p>
                <h3>{t.customer_name}</h3>
                <p>{t.customer_phone}</p>
                <p>{t.idea}</p>
                <p>
                  {t.placement} · {t.size}
                </p>
                {t.reference_path && (
                  <button
                    className="button button-outline"
                    disabled={busy}
                    onClick={() => void act({ kind: "reference", id: t.id })}
                  >
                    Ver referencia privada
                  </button>
                )}
                {buttons("tattoo", t.id, t.status, tattooTransitions)}
              </article>
            ))}
          </div>
        </>
      )}
      {tab === "equipo" && owner && (
        <>
          <h2>Profesionales</h2>
          <div className="live-grid">
            {data?.barbers.map((b) => (
              <form
                key={`${b.id}-${b.display_name}-${b.active}`}
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  void act({
                    kind: "barber",
                    id: b.id,
                    name: String(f.get("name")),
                    active: f.has("active"),
                  });
                }}
              >
                <label>
                  Nombre
                  <input
                    name="name"
                    defaultValue={b.display_name}
                    required
                    minLength={2}
                    maxLength={60}
                  />
                </label>
                <label>
                  <input
                    type="checkbox"
                    name="active"
                    defaultChecked={b.active}
                  />{" "}
                  Disponible para reservar
                </label>
                <button className="button button-outline" disabled={busy}>
                  Guardar
                </button>
              </form>
            ))}
          </div>
        </>
      )}
      {tab === "equipo" && owner && data && (
        <>
          <h2>Jornadas semanales</h2>
          <p>
            Los días desmarcados quedan cerrados. Los descansos existentes
            siguen aplicando.
          </p>
          <div className="live-grid">
            {data.barbers.map((b) => (
              <HoursEditor
                key={b.id}
                barber={b}
                hours={data.hours.filter((h) => h.barber_id === b.id)}
                busy={busy}
                save={act}
              />
            ))}
          </div>
        </>
      )}
      {tab === "correos" && owner && (
        <>
          <h2>Envíos de confirmación</h2>
          <p>
            Enviado indica aceptación por el proveedor; no confirma entrega al
            destinatario.
          </p>
          <div className="live-grid">
            {data?.notifications.map((n) => (
              <article key={n.id}>
                <h3>{n.template}</h3>
                <p>
                  {n.sent_at ? "Enviado" : "Pendiente o fallido"} · Intentos:{" "}
                  {n.attempts}
                </p>
                {n.last_error && <p>{n.last_error}</p>}
                {!n.sent_at && (
                  <button
                    className="button button-outline"
                    disabled={busy}
                    onClick={() => void act({ kind: "emailRetry", id: n.id })}
                  >
                    Reintentar envío
                  </button>
                )}
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
function HoursEditor({
  barber,
  hours,
  busy,
  save,
}: {
  barber: Data["barbers"][number];
  hours: Data["hours"];
  busy: boolean;
  save: (body: Record<string, unknown>) => Promise<void>;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const entries = [0, 1, 2, 3, 4, 5, 6]
          .filter((d) => f.has(`day-${d}`))
          .map((weekday) => ({
            weekday,
            opens: String(f.get(`opens-${weekday}`)),
            closes: String(f.get(`closes-${weekday}`)),
          }));
        void save({ kind: "hours", id: barber.id, hours: entries });
      }}
    >
      <h3>{barber.display_name}</h3>
      {[
        "Domingo",
        "Lunes",
        "Martes",
        "Miércoles",
        "Jueves",
        "Viernes",
        "Sábado",
      ].map((day, d) => {
        const current = hours.find((h) => h.weekday === d);
        return (
          <fieldset key={d}>
            <legend>
              <label>
                <input
                  type="checkbox"
                  name={`day-${d}`}
                  defaultChecked={!!current}
                />
                {day}
              </label>
            </legend>
            <div className="live-actions">
              <label>
                Abre
                <input
                  type="time"
                  name={`opens-${d}`}
                  defaultValue={current?.opens.slice(0, 5) ?? "10:00"}
                  required
                />
              </label>
              <label>
                Cierra
                <input
                  type="time"
                  name={`closes-${d}`}
                  defaultValue={current?.closes.slice(0, 5) ?? "18:00"}
                  required
                />
              </label>
            </div>
          </fieldset>
        );
      })}
      <button className="button button-outline" disabled={busy}>
        Guardar jornada
      </button>
    </form>
  );
}
