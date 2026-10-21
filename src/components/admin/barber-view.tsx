"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { barbers } from "../../domain/catalog";
import { bogotaDate } from "../../domain/queue/logic";
import type { QueueTicket } from "../../domain/queue/model";
import type { DemoCommand } from "../../services/contracts/demo";
import { usePanel as useDemo } from "../../lib/use-panel";
import { ConfirmAction } from "../confirm-action";
import { Icon } from "../icons";
import { BlockPanel } from "./block-panel";
import { BookingItem, TicketItem } from "./items";
import {
  byDateTime,
  isClosedBooking,
  serviceName,
  weekdayOf,
} from "./labels";
import { crewStatus } from "./overview";
import { useCommandRunner, useNow } from "./runner";
import {
  BlockHead,
  Count,
  EmptyState,
  PanelHead,
  SessionBar,
  StatusBadge,
  Toasts,
} from "./ui";

const storageKey = "elite.barber-view";

/** Vista de barbero: agenda y atención del profesional elegido, con botones grandes. */
export function BarberView({ onExit, lockedSlug }: { onExit?: () => void; lockedSlug?: string | null }) {
  const demo = useDemo();
  const now = useNow();
  const runner = useCommandRunner(demo.dispatch, demo.online);
  // Un barbero con sesión ve solo su agenda; el dueño puede elegir.
  const locked = barbers.find((b) => b.slug === lockedSlug)?.id;
  const [barberId, setBarberId] = useState<string>(locked ?? barbers[0].id);
  const state = demo.state;
  const today = bogotaDate(now);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!locked && saved && barbers.some((b) => b.id === saved)) setBarberId(saved);
    } catch {
      /* Sin almacenamiento: se usa Barbero 1. */
    }
  }, []);

  function choose(id: string) {
    setBarberId(id);
    try {
      localStorage.setItem(storageKey, id);
    } catch {
      /* Preferencia solo de comodidad. */
    }
  }

  const barber = barbers.find((b) => b.id === barberId) ?? barbers[0];
  const member = state.team.find((m) => m.id === barberId);
  const mine = (t: QueueTicket) => t.assignedBarberId === barberId && t.date === today;
  const serving = state.queue.find((t) => mine(t) && t.status === "en-atencion");
  const calling = state.queue.find((t) => mine(t) && t.status === "llamado");
  const bookingNow = state.bookings.find(
    (b) => b.barberId === barberId && b.status === "en-atencion",
  );
  const waiting = state.queue
    .filter(
      (t) =>
        t.date === today &&
        t.status === "esperando" &&
        (t.barberId === "any" || t.barberId === barberId),
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const todays = state.bookings
    .filter((b) => b.barberId === barberId && b.date === today)
    .sort(byDateTime);
  const upcoming = state.bookings
    .filter((b) => b.barberId === barberId && b.date > today && !isClosedBooking(b))
    .sort(byDateTime)
    .slice(0, 6);
  const crew = crewStatus(state, today, now).find((c) => c.barber.id === barberId);
  const worksToday = member?.active && member.days.includes(weekdayOf(today));
  const busyHere = Boolean(serving || calling || bookingNow);
  // Solo orienta la interfaz: el servidor vuelve a comprobar jornada, pausas y citas.
  const available = crew?.status.tone === "ok";
  const nextTicket = waiting[0];

  const finishTicket = serving
    ? ({ type: "queue.change", id: serving.id, action: "finish" } as DemoCommand)
    : null;
  const finishBooking = bookingNow
    ? ({ type: "booking.change", id: bookingNow.id, action: "finish" } as DemoCommand)
    : null;
  const startCalled = calling
    ? ({ type: "queue.change", id: calling.id, action: "start" } as DemoCommand)
    : null;
  const cancelCalled = calling
    ? ({ type: "queue.change", id: calling.id, action: "cancel" } as DemoCommand)
    : null;
  const callNext = nextTicket
    ? ({
        type: "queue.change",
        id: nextTicket.id,
        action: "call",
        barberId,
      } as DemoCommand)
    : null;
  const cancelControl = cancelCalled ? runner.control(cancelCalled) : null;

  return (
    <div className="adm" data-view="barber">
      <div className="adm-main">
        <div className="adm-wrap">
          <SessionBar role="Vista de barbero" onExit={onExit} />
          <PanelHead
            eyebrow="Elite / Vista de barbero"
            title="Tu jornada"
            serif={`${barber.name}.`}
            lead="Agenda y fila del profesional elegido. Pensada para la tablet del puesto: un toque por acción."
            now={now}
            ready={demo.ready}
            online={demo.online}
            live={demo.live}
            revision={state.revision}
          />
          {demo.ready && !demo.online ? (
            <p className="notice adm-banner" data-tone="alert" role="alert">
              <Icon name="offline" />
              {demo.error ||
                "Sin conexión con el servidor. No se pueden confirmar operaciones."}
            </p>
          ) : null}

          {locked ? null : <div className="adm-picker" role="group" aria-label="Profesional">
            {barbers.map((b) => (
              <button
                key={b.id}
                type="button"
                aria-pressed={b.id === barberId}
                onClick={() => choose(b.id)}
              >
                {b.name}
              </button>
            ))}
          </div>}

          {!demo.ready ? (
            <p className="loading-state">Conectando con el servidor…</p>
          ) : (
            <>
              <section
                className="surface adm-now"
                data-tone={busyHere ? "live" : "calm"}
                data-state={calling && !serving && !bookingNow ? "calling" : undefined}
                aria-labelledby="ahora-titulo"
              >
                <p className="eyebrow" id="ahora-titulo">
                  Ahora · {barber.name}
                </p>
                {serving && finishTicket ? (
                  <>
                    <StatusBadge tone="live">En atención</StatusBadge>
                    <strong className="adm-now-number">{serving.number}</strong>
                    <h2>{serving.name}</h2>
                    <p>{serviceName(serving.serviceId)} · Turno de la fila</p>
                    <div className="button-row">
                      <button
                        type="button"
                        className="button button-large"
                        {...runner.control(finishTicket)}
                        onClick={() => void runner.run(finishTicket)}
                      >
                        <Icon name="check" />
                        Finalizar atención
                      </button>
                    </div>
                  </>
                ) : bookingNow && finishBooking ? (
                  <>
                    <StatusBadge tone="live">En atención</StatusBadge>
                    <strong className="adm-now-number">{bookingNow.time}</strong>
                    <h2>{bookingNow.name}</h2>
                    <p>{serviceName(bookingNow.serviceId)} · Cita reservada</p>
                    <div className="button-row">
                      <button
                        type="button"
                        className="button button-large"
                        {...runner.control(finishBooking)}
                        onClick={() => void runner.run(finishBooking)}
                      >
                        <Icon name="check" />
                        Finalizar atención
                      </button>
                    </div>
                  </>
                ) : calling && startCalled && cancelCalled ? (
                  <>
                    <StatusBadge tone="live">Llamando</StatusBadge>
                    <strong className="adm-now-number">{calling.number}</strong>
                    <h2>{calling.name}</h2>
                    <p>{serviceName(calling.serviceId)} · Se muestra en la pantalla de turnos</p>
                    <div className="button-row">
                      <button
                        type="button"
                        className="button button-large"
                        {...runner.control(startCalled)}
                        onClick={() => void runner.run(startCalled)}
                      >
                        <Icon name="scissors" />
                        Iniciar atención
                      </button>
                      <ConfirmAction
                        className="button button-danger button-large"
                        title={`¿Cancelar el turno ${calling.number}?`}
                        description={`${calling.name} saldrá de la fila y de la pantalla de turnos. No se enviará ningún mensaje.`}
                        confirmLabel="Sí, cancelar turno"
                        cancelLabel="Mantener turno"
                        disabled={cancelControl?.disabled}
                        busy={cancelControl?.["aria-busy"]}
                        onConfirm={() => runner.run(cancelCalled)}
                      >
                        No se presentó
                      </ConfirmAction>
                    </div>
                  </>
                ) : (
                  <>
                    <StatusBadge tone={crew?.status.tone ?? "muted"}>
                      {crew?.status.label ?? "Sin datos"}
                    </StatusBadge>
                    {nextTicket && callNext ? (
                      <>
                        <h2>Siguiente: {nextTicket.number}</h2>
                        <p>
                          {nextTicket.name} · {serviceName(nextTicket.serviceId)} ·{" "}
                          {nextTicket.barberId === "any"
                            ? "Primer disponible"
                            : "Pidió tu turno"}
                        </p>
                        <div className="button-row">
                          <button
                            type="button"
                            className="button button-accent button-large"
                            aria-describedby={available ? undefined : "llamar-ayuda"}
                            {...runner.control(callNext, !available)}
                            onClick={() => void runner.run(callNext)}
                          >
                            <Icon name="bell" />
                            Llamar a {nextTicket.number}
                          </button>
                        </div>
                        {!available ? (
                          <p className="adm-now-note" id="llamar-ayuda">
                            Los turnos se llaman cuando el profesional está disponible
                            dentro de su jornada.
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <h2>Sin turnos en espera</h2>
                        <p>
                          {worksToday
                            ? "Cuando alguien se registre en recepción o con el QR, aparecerá aquí."
                            : "Hoy no tienes jornada activa según el horario de ejemplo."}
                        </p>
                      </>
                    )}
                    <p className="adm-now-detail">{crew?.status.detail}</p>
                  </>
                )}
              </section>

              <div className="adm-barber-grid">
                <section className="surface adm-card" aria-labelledby="barbero-fila">
                  <BlockHead id="barbero-fila" icon="ticket" title="Tu fila">
                    <Count value={waiting.length} label={`${waiting.length} en espera`} />
                  </BlockHead>
                  {waiting.length ? (
                    <div className="adm-list">
                      {waiting.map((t) => (
                        <TicketItem
                          key={t.id}
                          ticket={t}
                          runner={runner}
                          today={today}
                          barberId={barberId}
                          canCall={false}
                          large
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon="ticket"
                      title="Nadie en espera"
                      text="Aquí verás los turnos para ti o para el primer profesional disponible."
                    />
                  )}
                </section>

                <section className="surface adm-card" aria-labelledby="barbero-citas">
                  <BlockHead id="barbero-citas" icon="calendar" title="Tus citas de hoy">
                    <Count value={todays.length} label={`${todays.length} citas hoy`} />
                  </BlockHead>
                  {todays.length ? (
                    <div className="adm-list">
                      {todays.map((b) => (
                        <BookingItem
                          key={b.id}
                          booking={b}
                          state={state}
                          runner={runner}
                          today={today}
                          large
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon="calendar"
                      title="Sin citas hoy"
                      text="Las reservas para este profesional aparecerán aquí al instante."
                    />
                  )}
                </section>
              </div>

              <section className="surface adm-card" aria-labelledby="barbero-proximas">
                <BlockHead id="barbero-proximas" icon="clock" title="Próximas citas" />
                {upcoming.length ? (
                  <div className="adm-list">
                    {upcoming.map((b) => (
                      <BookingItem
                        key={b.id}
                        booking={b}
                        state={state}
                        runner={runner}
                        today={today}
                        showDate
                        large
                      />
                    ))}
                  </div>
                ) : (
                  <p className="adm-quiet">Sin citas reservadas para los próximos días.</p>
                )}
              </section>
              <BlockPanel key={barber.slug} slug={barber.slug} name={barber.name} />
            </>
          )}

          <nav className="adm-foot-links" aria-label="Accesos de la vista de barbero">
            <Link className="text-link" href="/pantalla-turnos" target="_blank" rel="noopener noreferrer">
              <Icon name="screen" />
              Pantalla de turnos
              <span className="visually-hidden"> (abre otra pestaña)</span>
            </Link>
            <Link className="text-link" href="/administracion">
              <Icon name="grid" />
              Panel administrativo
            </Link>
            <Link className="text-link" href="/">
              <Icon name="arrow" />
              Web pública
            </Link>
          </nav>
        </div>
      </div>
      <Toasts feedback={runner.feedback} onDismiss={runner.dismiss} />
    </div>
  );
}
