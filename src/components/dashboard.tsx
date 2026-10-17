"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useDemo } from "../lib/use-demo";
import { barbers, currency, services } from "../domain/catalog";
import {
  todayBogota,
  type TattooRequest,
  type DemoState,
} from "../domain/demo";
import { prettyDate } from "../domain/availability";
import { Icon } from "./icons";
import { ConfirmAction } from "./confirm-action";
import { Brand } from "./media";
const labels: Record<TattooRequest["status"], string> = {
  pendiente: "Pendiente",
  "en-evaluacion": "En evaluación",
  cotizada: "Cotizada (demo)",
  "fecha-acordada": "Fecha acordada (demo)",
  cerrada: "Cerrada",
};
const nextStatus: Partial<
  Record<TattooRequest["status"], TattooRequest["status"]>
> = {
  pendiente: "en-evaluacion",
  "en-evaluacion": "cotizada",
  cotizada: "fecha-acordada",
};
const nextLabel: Partial<Record<TattooRequest["status"], string>> = {
  pendiente: "Iniciar evaluación demo",
  "en-evaluacion": "Marcar cotizada demo",
  cotizada: "Marcar fecha acordada demo",
};
export function Dashboard() {
  const params = useSearchParams();
  const demo = useDemo();
  const [tab, setTab] = useState(
      ["citas", "solicitudes", "clientes", "equipo"].includes(
        params.get("tab") ?? "",
      )
        ? params.get("tab")!
        : "resumen",
    ),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState("todos"),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [today, setToday] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  useEffect(() => setToday(todayBogota()), []);
  const active = demo.state.bookings.filter((b) => b.status !== "cancelada");
  const matches = (...values: string[]) =>
    values.some((v) => v.toLowerCase().includes(query.toLowerCase()));
  const clients = useMemo(() => {
    const map = new Map<
      string,
      { name: string; phone: string; bookings: number; requests: number }
    >();
    demo.state.bookings.forEach((b) => {
      const c = map.get(b.phone) ?? {
        name: b.name,
        phone: b.phone,
        bookings: 0,
        requests: 0,
      };
      c.bookings++;
      map.set(b.phone, c);
    });
    demo.state.requests.forEach((r) => {
      const c = map.get(r.phone) ?? {
        name: r.name,
        phone: r.phone,
        bookings: 0,
        requests: 0,
      };
      c.requests++;
      map.set(r.phone, c);
    });
    return [...map.values()];
  }, [demo.state]);
  async function change(
    updater: (state: DemoState) => DemoState,
    success: string,
  ) {
    setBusy(true);
    try {
      await demo.transact(updater);
      setMessage(success);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function transition(id: string, target: TattooRequest["status"]) {
    void change(
      (state) => ({
        ...state,
        requests: state.requests.map((r) => {
          if (r.id !== id) return r;
          if (target !== "cerrada" && nextStatus[r.status] !== target)
            throw new Error(
              "El estado cambió. Revisa la solicitud e intenta de nuevo.",
            );
          return { ...r, status: target };
        }),
      }),
      "Estado demo actualizado. No se enviaron mensajes ni cotizaciones.",
    );
  }
  const bookings = demo.state.bookings
    .filter(
      (b) =>
        matches(b.name, b.phone, b.date) &&
        (!dateFilter || b.date === dateFilter) &&
        (status === "todos" || b.status === status),
    )
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const requests = demo.state.requests.filter(
    (r) =>
      matches(r.name, r.phone, r.idea) &&
      (status === "todos" || r.status === status),
  );
  const upcoming = active
    .filter((b) => b.date >= today)
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
    .slice(0, 4);
  const pendingRequests = demo.state.requests.filter(
    (r) => r.status === "pendiente",
  );
  function openTab(id: string) {
    setTab(id);
    setQuery("");
    setStatus("todos");
    setDateFilter("");
  }
  return (
    <div className="dashboard">
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">
          <Brand />
          <span>
            JEAN CARLOS<small>Propietario · demo</small>
          </span>
        </div>
        <p className="eyebrow">ELITE / ADMINISTRACIÓN</p>
        {[
          ["resumen", "grid", "Resumen"],
          ["citas", "calendar", "Agenda"],
          ["solicitudes", "spark", "Tatuajes"],
          ["clientes", "users", "Clientes"],
          ["equipo", "grid", "Equipo"],
        ].map(([id, icon, label]) => (
          <button
            key={id}
            onClick={() => openTab(id)}
            className={tab === id ? "active" : ""}
            aria-pressed={tab === id}
          >
            <Icon name={icon as "calendar"} />
            {label}
            <span>
              {id === "citas"
                ? active.length
                : id === "solicitudes"
                  ? pendingRequests.length
                  : "↗"}
            </span>
          </button>
        ))}
        <div className="dashboard-sidebar-bottom">
          <span className="live-dot" /> ENTORNO DEMO
          <p>
            Datos locales.
            <br />
            Sin conexión al establecimiento.
          </p>
          <Link href="/">Ver experiencia pública ↗</Link>
        </div>
      </aside>
      <div className="dashboard-main">
        <div className="dashboard-topline">
          <p className="eyebrow">CONTROL CON CLARIDAD</p>
          <span className="demo-badge">DEMO LOCAL</span>
        </div>
        <h1>
          Todo Elite.
          <br />
          <span className="serif">En tus manos.</span>
        </h1>
        <p className="muted">
          Jean Carlos, esta es tu vista de gestión. Agenda, tatuajes, clientes y
          equipo en un solo lugar.
        </p>
        <div className="dashboard-quick-actions">
          <Link href="/reservar" className="button button-small">
            <Icon name="plus" /> Nueva cita demo
          </Link>
          <Link href="/tatuaje" className="button button-outline button-small">
            <Icon name="spark" /> Nueva solicitud
          </Link>
        </div>
        <div className="dashboard-stats">
          {[
            ["Citas activas", String(active.length), "calendar"],
            [
              "Solicitudes pendientes",
              String(
                demo.state.requests.filter((r) => r.status === "pendiente")
                  .length,
              ),
              "spark",
            ],
            ["Clientes demo", String(clients.length), "users"],
            [
              "Citas para hoy",
              String(active.filter((b) => b.date === today).length),
              "clock",
            ],
          ].map(([title, n, icon]) => (
            <div key={title}>
              <Icon name={icon as "calendar"} />
              <span>{title}</span>
              <strong>{n}</strong>
            </div>
          ))}
        </div>
        <p className="dashboard-message" role="status" aria-live="polite">
          {message || demo.error}
        </p>
        <div className="dashboard-toolbar">
          <h2>
            {tab === "resumen"
              ? "Resumen del estudio"
              : tab === "citas"
                ? "Agenda"
                : tab === "solicitudes"
                  ? "Solicitudes de tatuaje"
                  : tab === "clientes"
                    ? "Clientes"
                    : "Equipo"}
          </h2>
          {tab !== "equipo" && tab !== "resumen" && (
            <input
              aria-label="Buscar en gestión"
              type="search"
              placeholder="Buscar…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          )}{" "}
          {tab === "citas" && (
            <label className="agenda-date-filter">
              Fecha
              <input
                type="date"
                aria-label="Filtrar citas por fecha"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </label>
          )}
          {(tab === "citas" || tab === "solicitudes") && (
            <select
              aria-label="Filtrar por estado"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="todos">Todos los estados</option>
              {tab === "citas" ? (
                <>
                  <option value="reservada-demo">Reservada demo</option>
                  <option value="cancelada">Cancelada</option>
                </>
              ) : (
                Object.entries(labels).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))
              )}
            </select>
          )}
        </div>
        {!demo.ready ? (
          <p className="loading-state">Leyendo datos locales…</p>
        ) : (
          <>
            {tab === "resumen" && (
              <div className="dashboard-overview">
                <section className="overview-card">
                  <div className="overview-heading">
                    <Icon name="calendar" />
                    <h3>Próximas citas</h3>
                    <button
                      className="text-link"
                      onClick={() => openTab("citas")}
                    >
                      Ver agenda ↗
                    </button>
                  </div>
                  {upcoming.length ? (
                    <div className="overview-list">
                      {upcoming.map((b) => (
                        <article key={b.id}>
                          <span className="overview-time">
                            {b.time}
                            <small>{prettyDate(b.date)}</small>
                          </span>
                          <div>
                            <strong>{b.name}</strong>
                            <p>
                              {services.find((s) => s.id === b.serviceId)?.name}{" "}
                              · {barbers.find((p) => p.id === b.barberId)?.name}
                            </p>
                          </div>
                          <span className="status-badge">Demo</span>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="overview-empty">
                      <Icon name="calendar" />
                      <h4>Tu agenda, lista para empezar.</h4>
                      <p>
                        Las citas creadas desde este navegador aparecerán aquí.
                      </p>
                      <Link href="/reservar" className="text-link">
                        Crear primera cita demo ↗
                      </Link>
                    </div>
                  )}
                </section>
                <section className="overview-card">
                  <div className="overview-heading">
                    <Icon name="spark" />
                    <h3>Ideas por evaluar</h3>
                    <button
                      className="text-link"
                      onClick={() => openTab("solicitudes")}
                    >
                      Ver solicitudes ↗
                    </button>
                  </div>
                  {pendingRequests.length ? (
                    <div className="overview-list">
                      {pendingRequests.slice(0, 4).map((r) => (
                        <article key={r.id}>
                          <div>
                            <strong>{r.name}</strong>
                            <p>{r.idea}</p>
                          </div>
                          <span className="status-badge">Pendiente</span>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="overview-empty">
                      <Icon name="spark" />
                      <h4>El próximo proyecto comienza con una idea.</h4>
                      <p>
                        Las solicitudes de tatuaje esperan tu valoración; no se
                        confirman automáticamente.
                      </p>
                      <Link href="/tatuaje" className="text-link">
                        Crear solicitud demo ↗
                      </Link>
                    </div>
                  )}
                </section>
                <section className="overview-team-strip">
                  <div>
                    <p className="eyebrow">EQUIPO DE BARBERÍA</p>
                    <h3>Disponibilidad de ejemplo</h3>
                  </div>
                  <div>
                    {barbers.map((b, i) => (
                      <button key={b.id} onClick={() => openTab("equipo")}>
                        <span className="barber-avatar">E{i + 1}</span>
                        <strong>{b.name}</strong>
                        <small>
                          {demo.state.unavailableBarberIds?.includes(b.id)
                            ? "Agenda pausada"
                            : "Agenda activa"}
                        </small>
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            )}
            {tab === "citas" &&
              (bookings.length ? (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Cliente</th>
                        <th>Experiencia</th>
                        <th>Fecha / hora</th>
                        <th>Estado</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((b) => (
                        <tr key={b.id}>
                          <td>
                            <strong>{b.name}</strong>
                            <small>{b.phone}</small>
                          </td>
                          <td>
                            {services.find((s) => s.id === b.serviceId)?.name}
                            <small>
                              {barbers.find((x) => x.id === b.barberId)?.name}
                            </small>
                          </td>
                          <td>
                            {prettyDate(b.date)}
                            <small>{b.time} · Cartagena</small>
                          </td>
                          <td>
                            <span
                              className={`status-badge ${b.status === "cancelada" ? "closed" : ""}`}
                            >
                              {b.status === "cancelada"
                                ? "Cancelada"
                                : "Reservada demo"}
                            </span>
                          </td>
                          <td>
                            {b.status !== "cancelada" && (
                              <ConfirmAction
                                disabled={busy}
                                title="¿Cancelar esta cita demo?"
                                description="Su horario quedará libre para una nueva reserva de ejemplo."
                                onConfirm={() => {
                                  void change(
                                    (state) => ({
                                      ...state,
                                      bookings: state.bookings.map((x) =>
                                        x.id === b.id
                                          ? { ...x, status: "cancelada" }
                                          : x,
                                      ),
                                    }),
                                    "Cita demo cancelada. El horario quedó libre.",
                                  );
                                }}
                              >
                                Cancelar
                              </ConfirmAction>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty
                  title={
                    query || status !== "todos" || dateFilter
                      ? "No hay coincidencias."
                      : "Tu agenda está lista para empezar."
                  }
                  text="Crea una cita de ejemplo para explorar el flujo completo."
                  href="/reservar"
                  action="Crear cita demo"
                />
              ))}
            {tab === "solicitudes" &&
              (requests.length ? (
                <div className="requests-list">
                  {requests.map((r) => (
                    <article className="request-card" key={r.id}>
                      <div className="request-card-heading">
                        <div>
                          <p className="eyebrow">JEAN CARLOS / TATTOO</p>
                          <h3>{r.name}</h3>
                          <span className="muted">{r.phone}</span>
                        </div>
                        <span
                          className={`status-badge ${r.status === "cerrada" ? "closed" : ""}`}
                        >
                          {labels[r.status]}
                        </span>
                      </div>
                      <p>{r.idea}</p>
                      <div className="request-meta">
                        <span>
                          Zona: <b>{r.placement}</b>
                        </span>
                        <span>
                          Tamaño: <b>{r.size}</b>
                        </span>
                      </div>
                      {r.referenceName && (
                        <details className="request-reference">
                          <summary>Referencia: {r.referenceName}</summary>
                          {r.referenceDataUrl ? (
                            <img
                              src={r.referenceDataUrl}
                              alt="Referencia aportada a la solicitud demo"
                            />
                          ) : (
                            <p>
                              Solo se guardó el nombre en una versión anterior
                              de la demo.
                            </p>
                          )}
                        </details>
                      )}
                      <div className="request-actions">
                        {nextStatus[r.status] && (
                          <button
                            className="button button-small"
                            disabled={busy}
                            onClick={() =>
                              transition(r.id, nextStatus[r.status]!)
                            }
                          >
                            {nextLabel[r.status]} <Icon name="arrow" />
                          </button>
                        )}
                        {r.status !== "cerrada" && (
                          <button
                            className="text-link"
                            disabled={busy}
                            onClick={() => transition(r.id, "cerrada")}
                          >
                            Cerrar solicitud
                          </button>
                        )}
                      </div>
                      {r.status === "cotizada" && (
                        <small className="form-disclaimer">
                          Marcación de ejemplo. No se ha calculado ni enviado
                          una cotización.
                        </small>
                      )}
                      {r.status === "fecha-acordada" && (
                        <small className="form-disclaimer">
                          Estado ilustrativo. No crea una cita ni bloquea un
                          horario.
                        </small>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <Empty
                  title="Cada historia comienza con una idea."
                  text="Aquí aparecerán las solicitudes de ejemplo para Jean Carlos."
                  href="/tatuaje"
                  action="Crear solicitud demo"
                />
              ))}
            {tab === "clientes" &&
              (clients.filter((c) => matches(c.name, c.phone)).length ? (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Cliente demo</th>
                        <th>Contacto</th>
                        <th>Citas</th>
                        <th>Solicitudes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clients
                        .filter((c) => matches(c.name, c.phone))
                        .map((c) => (
                          <tr key={c.phone}>
                            <td>{c.name}</td>
                            <td>{c.phone}</td>
                            <td>{c.bookings}</td>
                            <td>{c.requests}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty
                  title="Tus clientes, organizados."
                  text="Los contactos se reúnen automáticamente a partir de las citas y solicitudes demo, usando el teléfono."
                  href="/reservar"
                  action="Crear primera cita"
                />
              ))}
            {tab === "equipo" && (
              <>
                <p className="muted">
                  Pausar a un barbero retira su disponibilidad demo. Las citas
                  ya creadas se conservan.
                </p>
                <div className="dashboard-team">
                  {barbers.map((b, i) => {
                    const paused = demo.state.unavailableBarberIds?.includes(
                      b.id,
                    );
                    return (
                      <article key={b.id}>
                        <span className="barber-avatar">E{i + 1}</span>
                        <h3>{b.name}</h3>
                        <p>Identidad provisional</p>
                        <small>
                          {services
                            .map((s) => `${s.name}: ${currency(s.priceCOP)}`)
                            .join(" · ")}
                        </small>
                        <button
                          className="button button-outline button-small"
                          disabled={busy}
                          onClick={() =>
                            void change(
                              (state) => ({
                                ...state,
                                unavailableBarberIds:
                                  state.unavailableBarberIds?.includes(b.id)
                                    ? state.unavailableBarberIds.filter(
                                        (id) => id !== b.id,
                                      )
                                    : [
                                        ...(state.unavailableBarberIds ?? []),
                                        b.id,
                                      ],
                              }),
                              "Disponibilidad demo actualizada.",
                            )
                          }
                        >
                          {paused
                            ? "Reactivar agenda demo"
                            : "Pausar agenda demo"}
                        </button>
                      </article>
                    );
                  })}
                  <article>
                    <span className="barber-avatar">JC</span>
                    <h3>Jean Carlos</h3>
                    <p>Artista de tatuajes</p>
                    <small>
                      Cotización según diseño. Agenda sujeta a evaluación.
                    </small>
                    <Link className="text-link" href="/jean-carlos">
                      Ver perfil <Icon name="arrow" />
                    </Link>
                  </article>
                </div>
              </>
            )}
          </>
        )}
        <div className="dashboard-reset">
          <p>
            Panel sin autenticación para presentación. Ningún cambio afecta una
            agenda real.
          </p>
          <ConfirmAction
            title="¿Restablecer la demo?"
            description="Se eliminarán las citas, solicitudes, referencias y pausas de ejemplo guardadas en este navegador."
            onConfirm={() => {
              try {
                demo.reset();
                setMessage("Datos demo restablecidos.");
              } catch (e) {
                setMessage((e as Error).message);
              }
            }}
          >
            Restablecer demo
          </ConfirmAction>
        </div>
      </div>
    </div>
  );
}
function Empty({
  title,
  text,
  href,
  action,
}: {
  title: string;
  text: string;
  href: string;
  action: string;
}) {
  return (
    <div className="empty-state">
      <Icon name="calendar" />
      <h3>{title}</h3>
      <p>{text}</p>
      <Link className="button button-outline" href={href}>
        {action}
        <Icon name="arrow" />
      </Link>
    </div>
  );
}
