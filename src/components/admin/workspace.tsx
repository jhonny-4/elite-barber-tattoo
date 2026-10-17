"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useDemo } from "../../lib/use-demo";
import { barbers, services, currency } from "../../domain/catalog";
import { todayBogota } from "../../domain/demo";
import { prettyDate } from "../../domain/availability";
import { activeTicket } from "../../domain/queue/model";
import type { DemoCommand } from "../../services/contracts/demo";
import { Brand } from "../media";
import { ConfirmAction } from "../confirm-action";
import { JoinForm } from "../queue/join-form";
import { QrCard } from "../queue/qr-card";
import { TeamEditor } from "./team-editor";
import { BookingActions } from "./booking-actions";
const tabs = [
  ["resumen", "Resumen"],
  ["citas", "Agenda unificada"],
  ["fila", "Fila y QR"],
  ["solicitudes", "Tatuajes"],
  ["clientes", "Clientes"],
  ["equipo", "Equipo"],
  ["avisos", "Notificaciones"],
];
const tattooLabels = {
  pendiente: "Pendiente",
  "en-evaluacion": "En evaluación",
  cotizada: "Cotizada · demo",
  "fecha-acordada": "Fecha acordada · demo",
  cerrada: "Cerrada",
};
const nextTattoo = {
  pendiente: "en-evaluacion",
  "en-evaluacion": "cotizada",
  cotizada: "fecha-acordada",
} as const;
export function AdminWorkspace({
  professionalOnly = false,
}: {
  professionalOnly?: boolean;
}) {
  const demo = useDemo(),
    params = useSearchParams();
  const [tab, setTab] = useState(
      professionalOnly
        ? "citas"
        : tabs.some((t) => t[0] === params.get("tab"))
          ? params.get("tab")!
          : "resumen",
    ),
    [query, setQuery] = useState(""),
    [date, setDate] = useState(""),
    [status, setStatus] = useState("todos"),
    [professional, setProfessional] = useState(
      professionalOnly ? "barbero-1" : "todos",
    ),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const state = demo.state,
    day = todayBogota();
  async function run(command: DemoCommand) {
    setBusy(true);
    setMessage("");
    try {
      const result = await demo.dispatch(command);
      setMessage(
        "Cambio guardado en el servidor demo. Sin envíos ni pagos reales.",
      );
      return result;
    } catch (e) {
      setMessage((e as Error).message);
      return undefined;
    } finally {
      setBusy(false);
    }
  }
  const match = (...values: string[]) =>
    values.some((v) => v.toLowerCase().includes(query.toLowerCase()));
  const bookings = state.bookings
    .filter(
      (b) =>
        (professional === "todos" || b.barberId === professional) &&
        (!date || b.date === date) &&
        (status === "todos" || b.status === status) &&
        match(b.name, b.phone, b.id),
    )
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const queue = state.queue.filter(
    (t) =>
      (professional === "todos" ||
        t.barberId === "any" ||
        t.barberId === professional ||
        t.assignedBarberId === professional) &&
      (!date || t.date === date) &&
      match(t.number, t.name, t.phone),
  );
  const clients = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        phone: string;
        bookings: number;
        requests: number;
        turns: number;
      }
    >();
    for (const [key, list] of [
      ["bookings", state.bookings],
      ["requests", state.requests],
      ["turns", state.queue],
    ] as const)
      for (const row of list) {
        const item = map.get(row.phone) ?? {
          name: row.name,
          phone: row.phone,
          bookings: 0,
          requests: 0,
          turns: 0,
        };
        item[key]++;
        map.set(row.phone, item);
      }
    return [...map.values()];
  }, [state]);
  const activeBookings = state.bookings.filter(
    (b) => !["cancelada", "finalizada"].includes(b.status),
  );
  function select(id: string) {
    setTab(id);
    setStatus("todos");
    setQuery("");
    setDate("");
  }
  const ticketCards = (list: typeof state.queue) =>
    list.length ? (
      <div className="v4-records">
        {list.map((t) => (
          <article className="v4-card" key={t.id}>
            <div className="record-title">
              <h3>{t.number}</h3>
              <span className="status-badge">{t.status}</span>
            </div>
            <strong>{t.name}</strong>
            <p>
              {t.phone} · {services.find((s) => s.id === t.serviceId)?.name}
            </p>
            <p>
              {barbers.find((b) => b.id === (t.assignedBarberId ?? t.barberId))
                ?.name ?? "Primer disponible"}{" "}
              · {t.source} · {prettyDate(t.date)}
            </p>
            <div className="record-actions">
              {t.status === "esperando" && (
                <button
                  className="button button-small"
                  disabled={busy || !demo.online}
                  onClick={() =>
                    void run({
                      type: "queue.change",
                      id: t.id,
                      action: "call",
                      ...(professional !== "todos"
                        ? { barberId: professional }
                        : {}),
                    })
                  }
                >
                  Llamar turno
                </button>
              )}
              {t.status === "llamado" && (
                <button
                  className="button button-small"
                  disabled={busy || !demo.online}
                  onClick={() =>
                    void run({
                      type: "queue.change",
                      id: t.id,
                      action: "start",
                    })
                  }
                >
                  Iniciar atención
                </button>
              )}
              {t.status === "en-atencion" && (
                <button
                  className="button button-small"
                  disabled={busy || !demo.online}
                  onClick={() =>
                    void run({
                      type: "queue.change",
                      id: t.id,
                      action: "finish",
                    })
                  }
                >
                  Finalizar atención
                </button>
              )}
              {activeTicket(t) && (
                <ConfirmAction
                  disabled={busy || !demo.online}
                  title={`¿Cancelar ${t.number}?`}
                  description="El turno dejará de aparecer en la fila activa."
                  onConfirm={() =>
                    void run({
                      type: "queue.change",
                      id: t.id,
                      action: "cancel",
                    })
                  }
                >
                  Cancelar turno
                </ConfirmAction>
              )}
            </div>
          </article>
        ))}
      </div>
    ) : (
      <Empty text="No hay turnos con estos filtros." />
    );
  return (
    <div className="dashboard v4-dashboard">
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">
          <Brand />
          <p>
            {professionalOnly
              ? "PROFESIONAL DEMO"
              : "JEAN CARLOS / PROPIETARIO"}
          </p>
        </div>
        {tabs
          .filter((t) => !professionalOnly || ["citas", "fila"].includes(t[0]))
          .map(([id, label]) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              aria-pressed={tab === id}
              onClick={() => select(id)}
            >
              {label}
            </button>
          ))}
        <div className="dashboard-sidebar-bottom">
          <Link href="/">Ver web pública ↗</Link>
          <Link href="/pantalla-turnos" target="_blank">
            Monitor de turnos ↗
          </Link>
        </div>
      </aside>
      <div className="dashboard-main">
        <div className="dashboard-topline">
          <p className="eyebrow">
            ELITE /{" "}
            {professionalOnly ? "VISTA DEL BARBERO" : "CONTROL DEL ESTUDIO"}
          </p>
          <span className="demo-badge">
            {demo.online
              ? demo.live
                ? "DEMO · EN VIVO"
                : "DEMO · SINCRONIZANDO"
              : "SIN CONEXIÓN"}
          </span>
        </div>
        <h1>
          {professionalOnly ? "Tu jornada." : "Todo Elite."}
          <br />
          <span className="serif">En tus manos.</span>
        </h1>
        <p className="muted">
          Datos ficticios compartidos por este servidor local. Los permisos son
          una simulación; no uses datos de clientes reales.
        </p>
        <div className="dashboard-quick-actions">
          <Link
            className="button button-small"
            href="/reservar?origen=presencial"
          >
            Nueva cita presencial
          </Link>
          <button
            className="button button-outline button-small"
            onClick={() => select("fila")}
          >
            Registrar turno
          </button>
          <Link
            className="text-link"
            href={professionalOnly ? "/administracion" : "/barbero"}
          >
            {professionalOnly ? "Vista del propietario" : "Vista del barbero"} ↗
          </Link>
        </div>
        <div className="dashboard-stats">
          {[
            ["Citas activas", activeBookings.length],
            [
              "En fila hoy",
              state.queue.filter((t) => t.date === day && activeTicket(t))
                .length,
            ],
            [
              "Ideas pendientes",
              state.requests.filter((r) => r.status === "pendiente").length,
            ],
            ["Clientes demo", clients.length],
          ].map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <p className="v4-notice" role="status" aria-live="polite">
          {message || demo.error}
        </p>
        <div className="dashboard-toolbar">
          <h2>{tabs.find((t) => t[0] === tab)?.[1]}</h2>
          {!["resumen", "equipo", "avisos"].includes(tab) && (
            <input
              type="search"
              aria-label="Buscar en gestión"
              placeholder="Nombre, contacto o turno"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          )}
          {["citas", "fila"].includes(tab) && (
            <>
              <label>
                Fecha
                <input
                  type="date"
                  aria-label="Filtrar por fecha"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <label>
                Profesional
                <select
                  value={professional}
                  onChange={(e) => setProfessional(e.target.value)}
                >
                  {!professionalOnly && <option value="todos">Todos</option>}
                  {barbers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          {tab === "solicitudes" && (
            <select
              aria-label="Estado de solicitud"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="todos">Todos los estados</option>
              {Object.entries(tattooLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          )}
          {tab === "citas" && (
            <select
              aria-label="Estado de cita"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {[
                "todos",
                "reservada-demo",
                "en-atencion",
                "finalizada",
                "cancelada",
              ].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          )}
        </div>
        {!demo.ready ? (
          <Empty text="Conectando con el servidor demo…" />
        ) : (
          <>
            {tab === "resumen" && (
              <div className="dashboard-overview">
                <section className="v4-card">
                  <h3>Próximas citas</h3>
                  {activeBookings
                    .filter((b) => b.date >= day)
                    .sort((a, b) =>
                      `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`),
                    )
                    .slice(0, 4)
                    .map((b) => (
                      <p key={b.id}>
                        <b>
                          {b.time} · {b.name}
                        </b>
                        <br />
                        {prettyDate(b.date)} ·{" "}
                        {barbers.find((p) => p.id === b.barberId)?.name}
                      </p>
                    ))}
                  {!activeBookings.length && (
                    <p>Tu agenda está lista para empezar.</p>
                  )}
                  <button className="text-link" onClick={() => select("citas")}>
                    Ver agenda ↗
                  </button>
                </section>
                <section className="v4-card">
                  <h3>El estudio, ahora</h3>
                  <p>
                    {
                      state.queue.filter(
                        (t) => t.status === "en-atencion" && t.date === day,
                      ).length
                    }{" "}
                    turnos en atención
                  </p>
                  <p>
                    {state.team.filter((t) => t.active).length} profesionales
                    activos
                  </p>
                  <p>
                    {state.notifications.filter((n) => !n.read).length}{" "}
                    notificaciones demo sin leer
                  </p>
                  <p>
                    Valor de servicios finalizados:{" "}
                    <b>
                      {currency(
                        state.bookings
                          .filter((b) => b.status === "finalizada")
                          .reduce(
                            (sum, b) =>
                              sum +
                              (services.find((s) => s.id === b.serviceId)
                                ?.priceCOP ?? 0),
                            0,
                          ),
                      )}
                    </b>
                  </p>
                  <small>
                    Referencia de tarifas provisionales; no representa cobros ni
                    ingresos reales.
                  </small>
                </section>
                <section className="v4-card">
                  <h3>Recorrido de presentación</h3>
                  <p>
                    Reserva online → cita compartida → recepción o QR → llamada
                    pública → atención → cierre.
                  </p>
                  <Link href="/turnos" className="text-link">
                    Abrir registro QR ↗
                  </Link>
                  <Link
                    href="/pantalla-turnos"
                    className="text-link"
                    target="_blank"
                  >
                    Abrir monitor ↗
                  </Link>
                </section>
                <QrCard />
              </div>
            )}
            {tab === "citas" && (
              <>
                <p className="form-disclaimer">
                  Agenda unificada: las citas tienen hora reservada; la fila se
                  atiende en espacios compatibles con la jornada y las reservas.
                </p>
                <div className="v4-records">
                  {bookings.map((b) => (
                    <article className="v4-card" key={b.id}>
                      <div className="record-title">
                        <h3>{b.name}</h3>
                        <span className="status-badge">{b.status}</span>
                      </div>
                      <p>
                        {b.phone} ·{" "}
                        {services.find((s) => s.id === b.serviceId)?.name}
                      </p>
                      <strong>
                        {prettyDate(b.date)} · {b.time}
                      </strong>
                      <p>
                        {barbers.find((p) => p.id === b.barberId)?.name} ·{" "}
                        {b.source ?? "online"}
                      </p>
                      <BookingActions
                        booking={b}
                        state={state}
                        run={run}
                        busy={busy || !demo.online}
                      />
                    </article>
                  ))}
                </div>
                {!bookings.length && (
                  <Empty text="No hay citas con estos filtros." />
                )}
                <h3>Turnos presenciales y QR</h3>
                {ticketCards(queue.filter(activeTicket))}
              </>
            )}
            {tab === "fila" && (
              <>
                <JoinForm manual onCreate={run} />
                <p className="form-disclaimer">
                  Solo se puede llamar cuando el servicio completo cabe en la
                  disponibilidad actual. Los turnos vencidos se cancelan
                  manualmente.
                </p>
                {ticketCards(queue)}
                <QrCard />
              </>
            )}
            {tab === "solicitudes" && (
              <div className="v4-records">
                {state.requests
                  .filter(
                    (r) =>
                      match(r.name, r.phone, r.idea) &&
                      (status === "todos" || r.status === status),
                  )
                  .map((r) => (
                    <article className="v4-card" key={r.id}>
                      <div className="record-title">
                        <h3>{r.name}</h3>
                        <span className="status-badge">
                          {tattooLabels[r.status]}
                        </span>
                      </div>
                      <p>{r.phone}</p>
                      <p>{r.idea}</p>
                      <p>
                        {r.placement} · {r.size}
                      </p>
                      {r.referenceDataUrl && (
                        <a
                          href={r.referenceDataUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <img
                            className="admin-reference"
                            src={r.referenceDataUrl}
                            alt="Referencia de solicitud demo"
                          />
                        </a>
                      )}
                      <div className="record-actions">
                        {r.status in nextTattoo && (
                          <button
                            className="button button-small"
                            disabled={busy || !demo.online}
                            onClick={() =>
                              void run({
                                type: "tattoo.change",
                                id: r.id,
                                status:
                                  nextTattoo[
                                    r.status as keyof typeof nextTattoo
                                  ],
                              })
                            }
                          >
                            Avanzar a{" "}
                            {
                              tattooLabels[
                                nextTattoo[r.status as keyof typeof nextTattoo]
                              ]
                            }
                          </button>
                        )}
                        {r.status !== "cerrada" && (
                          <ConfirmAction
                            title="¿Cerrar solicitud demo?"
                            description="No se enviará ningún mensaje al cliente de ejemplo."
                            disabled={busy || !demo.online}
                            onConfirm={() =>
                              void run({
                                type: "tattoo.change",
                                id: r.id,
                                status: "cerrada",
                              })
                            }
                          >
                            Cerrar solicitud
                          </ConfirmAction>
                        )}
                      </div>
                      <small>
                        Los estados no calculan precios ni crean sesiones
                        automáticamente.
                      </small>
                    </article>
                  ))}
                {!state.requests.length && (
                  <Empty text="Las ideas de tatuajes aparecerán aquí." />
                )}
              </div>
            )}
            {tab === "clientes" && (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Cliente demo</th>
                      <th>Contacto</th>
                      <th>Citas</th>
                      <th>Turnos</th>
                      <th>Ideas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients
                      .filter((c) => match(c.name, c.phone))
                      .map((c) => (
                        <tr key={c.phone}>
                          <td>{c.name}</td>
                          <td>{c.phone}</td>
                          <td>{c.bookings}</td>
                          <td>{c.turns}</td>
                          <td>{c.requests}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {!clients.length && (
                  <Empty text="Los clientes se reúnen al registrar citas, turnos o solicitudes." />
                )}
              </div>
            )}
            {tab === "equipo" && (
              <div className="team-editors">
                {state.team.map((member) => (
                  <TeamEditor
                    key={`${member.id}-${JSON.stringify(member)}`}
                    member={member}
                    busy={busy || !demo.online}
                    onSave={(member) => run({ type: "team.save", member })}
                  />
                ))}
              </div>
            )}
            {tab === "avisos" && (
              <section className="v4-card">
                <button
                  className="text-link"
                  disabled={busy || !demo.online}
                  onClick={() => void run({ type: "notifications.read" })}
                >
                  Marcar como leídas
                </button>
                {state.notifications.map((n) => (
                  <article
                    className={`notification-item ${n.read ? "read" : ""}`}
                    key={n.id}
                  >
                    <span className="status-badge">{n.channel}</span>
                    <p>{n.text}</p>
                    <small>
                      {new Date(n.createdAt).toLocaleString("es-CO", {
                        timeZone: "America/Bogota",
                      })}{" "}
                      · {n.read ? "Leída" : "Nueva"}
                    </small>
                  </article>
                ))}
                {!state.notifications.length && (
                  <Empty text="Las confirmaciones simuladas aparecerán aquí. No hay correos ni mensajes reales." />
                )}
              </section>
            )}
          </>
        )}
        <div className="dashboard-reset">
          <p>
            Revisión compartida {state.revision}. Datos de presentación
            guardados en el computador; sin autenticación real.
          </p>
          {!professionalOnly && (
            <ConfirmAction
              title="¿Restablecer toda la demo compartida?"
              description="Borrará citas, turnos, solicitudes y horarios de ejemplo para todos los dispositivos. No afecta el antiguo localStorage."
              disabled={busy || !demo.online}
              onConfirm={() => void run({ type: "reset" })}
            >
              Restablecer demo compartida
            </ConfirmAction>
          )}
        </div>
      </div>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="overview-empty">
      <p>{text}</p>
    </div>
  );
}
