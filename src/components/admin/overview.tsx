"use client";
import Link from "next/link";
import { barbers, currency } from "../../domain/catalog";
import { activeTicket } from "../../domain/queue/model";
import type { SharedState } from "../../services/contracts/demo";
import { Icon } from "../icons";
import {
  barberName,
  bookingStatus,
  byDateTime,
  isClosedBooking,
  minutesNow,
  serviceName,
  serviceOf,
  shortDay,
  toMinutes,
  weekdayOf,
  type Tone,
} from "./labels";
import { BlockHead, EmptyState, StatusBadge, type IconName } from "./ui";

export type SectionId =
  | "resumen"
  | "citas"
  | "fila"
  | "solicitudes"
  | "clientes"
  | "equipo"
  | "avisos";

/** Estado actual de cada profesional, derivado de la fila, las citas y su jornada. */
export function crewStatus(state: SharedState, today: string, now: number) {
  const minute = minutesNow(now);
  const weekday = weekdayOf(today);
  return barbers.map((barber) => {
    const member = state.team.find((m) => m.id === barber.id);
    const serving = state.queue.find(
      (t) => t.assignedBarberId === barber.id && t.status === "en-atencion",
    );
    const calling = state.queue.find(
      (t) => t.assignedBarberId === barber.id && t.status === "llamado",
    );
    const booking = state.bookings.find(
      (b) => b.barberId === barber.id && b.status === "en-atencion",
    );
    let status: { tone: Tone; label: string; detail: string };
    if (serving)
      status = {
        tone: "live",
        label: "En atención",
        detail: `Turno ${serving.number} · ${serviceName(serving.serviceId)}`,
      };
    else if (booking)
      status = {
        tone: "live",
        label: "En atención",
        detail: `Cita de las ${booking.time} · ${booking.name}`,
      };
    else if (calling)
      status = { tone: "live", label: "Llamando", detail: `Turno ${calling.number}` };
    else if (!member?.active)
      status = { tone: "muted", label: "Inactivo", detail: "Fuera de la agenda" };
    else if (!member.days.includes(weekday))
      status = { tone: "muted", label: "Descansa", detail: "Hoy no trabaja" };
    else {
      const pause = [
        ...member.pauses,
        ...member.absences.filter((a) => a.date === today),
      ].find((p) => minute >= toMinutes(p.start) && minute < toMinutes(p.end));
      if (minute < toMinutes(member.open) || minute >= toMinutes(member.close))
        status = {
          tone: "muted",
          label: "Fuera de jornada",
          detail: `Jornada ${member.open}–${member.close}`,
        };
      else if (pause)
        status = {
          tone: "muted",
          label: "En pausa",
          detail: `${pause.label} hasta las ${pause.end}`,
        };
      else
        status = {
          tone: "ok",
          label: "Disponible",
          detail: `Jornada ${member.open}–${member.close}`,
        };
    }
    return { barber, status };
  });
}

const routes: { href: string; icon: IconName; label: string; hint: string; external?: boolean }[] = [
  { href: "/reservar", icon: "calendar", label: "Reservar una cita", hint: "El recorrido del cliente" },
  { href: "/turnos", icon: "qr", label: "Tomar turno con QR", hint: "Registro desde el celular" },
  { href: "/pantalla-turnos", icon: "screen", label: "Pantalla de turnos", hint: "Se abre en otra pestaña", external: true },
  { href: "/tatuaje", icon: "needle", label: "Solicitar un tatuaje", hint: "Idea y referencia para valorar" },
  { href: "/barbero", icon: "scissors", label: "Vista de barbero", hint: "Agenda y fila por profesional" },
];

/** Resumen del día: tarjetas, agenda de hoy, próximas citas y estado del equipo. */
export function OverviewSection({
  state,
  today,
  now,
  go,
}: {
  state: SharedState;
  today: string;
  now: number;
  go: (section: SectionId) => void;
}) {
  const todays = state.bookings.filter((b) => b.date === today).sort(byDateTime);
  const activeToday = todays.filter((b) => !isClosedBooking(b));
  const finishedToday = todays.filter((b) => b.status === "finalizada");
  const ticketsToday = state.queue.filter((t) => t.date === today);
  const queueActive = ticketsToday.filter(activeTicket);
  const calling = queueActive.filter((t) => t.status === "llamado").length;
  const serving = queueActive.filter((t) => t.status === "en-atencion").length;
  const waiting = queueActive.filter((t) => t.status === "esperando").length;
  const pendingTattoos = state.requests.filter((r) => r.status === "pendiente").length;
  const evaluating = state.requests.filter((r) => r.status === "en-evaluacion").length;
  const unread = state.notifications.filter((n) => !n.read).length;
  const upcoming = state.bookings
    .filter((b) => !isClosedBooking(b) && b.date > today)
    .sort(byDateTime)
    .slice(0, 5);
  const finishedTickets = ticketsToday.filter((t) => t.status === "finalizado");
  const finishedCount = finishedToday.length + finishedTickets.length;
  const referenceValue = [...finishedToday, ...finishedTickets].reduce(
    (sum, item) => sum + (serviceOf(item.serviceId)?.priceCOP ?? 0),
    0,
  );
  const stats: {
    id: SectionId;
    icon: IconName;
    value: number;
    label: string;
    detail: string;
    attention?: boolean;
  }[] = [
    {
      id: "citas",
      icon: "calendar",
      value: activeToday.length,
      label: "Citas de hoy",
      detail: finishedToday.length
        ? `${finishedToday.length} ${finishedToday.length === 1 ? "finalizada" : "finalizadas"}`
        : activeToday.length
          ? "Por atender"
          : "Agenda libre",
    },
    {
      id: "fila",
      icon: "ticket",
      value: queueActive.length,
      label: "En la fila",
      detail:
        calling || serving
          ? `${calling} llamando · ${serving} en atención`
          : waiting
            ? `${waiting} en espera`
            : "Sin turnos activos",
      attention: calling > 0,
    },
    {
      id: "solicitudes",
      icon: "needle",
      value: pendingTattoos,
      label: "Tatuajes por valorar",
      detail: evaluating ? `${evaluating} en evaluación` : "Pendientes de revisión",
    },
    {
      id: "avisos",
      icon: "bell",
      value: unread,
      label: "Avisos sin leer",
      detail: "Simulados, sin envíos reales",
      attention: unread > 0,
    },
  ];
  const crew = crewStatus(state, today, now);

  return (
    <>
      <div className="adm-stats">
        {stats.map((stat) => (
          <button
            key={stat.id}
            type="button"
            className="adm-stat"
            data-attention={stat.attention || undefined}
            onClick={() => go(stat.id)}
          >
            <span className="adm-stat-icon" aria-hidden="true">
              <Icon name={stat.icon} />
            </span>
            <span className="adm-stat-value">{stat.value}</span>
            <span className="adm-stat-label">{stat.label}</span>
            <span className="adm-stat-detail">{stat.detail}</span>
          </button>
        ))}
      </div>

      <div className="adm-overview">
        <div className="adm-col">
          <section className="surface adm-card" aria-labelledby="resumen-hoy">
            <BlockHead id="resumen-hoy" icon="calendar" title="Agenda de hoy">
              <button type="button" className="text-link" onClick={() => go("citas")}>
                Ver agenda
              </button>
            </BlockHead>
            {todays.length ? (
              <ol className="adm-timeline">
                {todays.map((b) => (
                  <li key={b.id} data-closed={isClosedBooking(b) || undefined}>
                    <time className="adm-timeline-time">{b.time}</time>
                    <div className="adm-timeline-info">
                      <strong>{b.name}</strong>
                      <span>
                        {serviceName(b.serviceId)} · {barberName(b.barberId)}
                      </span>
                    </div>
                    <StatusBadge tone={bookingStatus[b.status].tone}>
                      {bookingStatus[b.status].label}
                    </StatusBadge>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState
                icon="calendar"
                title="Hoy no hay citas"
                text="Las reservas online y presenciales de hoy aparecerán aquí al instante."
              >
                <Link className="button button-small" href="/reservar?origen=presencial">
                  <Icon name="plus" />
                  Nueva cita presencial
                </Link>
              </EmptyState>
            )}
          </section>

          <section className="surface adm-card" aria-labelledby="resumen-proximas">
            <BlockHead id="resumen-proximas" icon="clock" title="Próximas citas" />
            {upcoming.length ? (
              <ol className="adm-timeline" data-variant="dated">
                {upcoming.map((b) => (
                  <li key={b.id}>
                    <time className="adm-timeline-time" dateTime={`${b.date}T${b.time}`}>
                      <small>{shortDay(b.date, today)}</small>
                      {b.time}
                    </time>
                    <div className="adm-timeline-info">
                      <strong>{b.name}</strong>
                      <span>
                        {serviceName(b.serviceId)} · {barberName(b.barberId)}
                      </span>
                    </div>
                    <StatusBadge tone={bookingStatus[b.status].tone}>
                      {bookingStatus[b.status].label}
                    </StatusBadge>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="adm-quiet">
                No hay citas reservadas para los próximos días.
              </p>
            )}
          </section>
        </div>

        <div className="adm-col">
          <section className="surface adm-card" aria-labelledby="resumen-equipo">
            <BlockHead id="resumen-equipo" icon="users" title="Ahora en el estudio">
              <button type="button" className="text-link" onClick={() => go("equipo")}>
                Jornadas
              </button>
            </BlockHead>
            <ul className="adm-crew">
              {crew.map(({ barber, status }) => (
                <li key={barber.id}>
                  <span className="adm-avatar" aria-hidden="true">
                    {barber.name.replace(/\D/g, "") || barber.name.charAt(0)}
                  </span>
                  <span className="adm-crew-info">
                    <strong>{barber.name}</strong>
                    <span>{status.detail}</span>
                  </span>
                  <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                </li>
              ))}
            </ul>
          </section>

          <section className="surface adm-card" aria-labelledby="resumen-cierre">
            <BlockHead id="resumen-cierre" icon="check" title="Cierre de hoy" />
            <dl className="adm-kpis">
              <div>
                <dt>Servicios finalizados</dt>
                <dd>{finishedCount}</dd>
              </div>
              <div>
                <dt>Valor de referencia</dt>
                <dd>{currency(referenceValue)}</dd>
              </div>
            </dl>
            <p className="adm-hint">
              Calculado con tarifas provisionales. No representa cobros ni
              ingresos reales.
            </p>
          </section>

          <section className="surface adm-card" aria-labelledby="resumen-recorrido">
            <BlockHead id="resumen-recorrido" icon="spark" title="Recorrido de la presentación" />
            <ul className="adm-links">
              {routes.map((route) => (
                <li key={route.href}>
                  <Link
                    href={route.href}
                    target={route.external ? "_blank" : undefined}
                    rel={route.external ? "noopener noreferrer" : undefined}
                  >
                    <Icon name={route.icon} />
                    <span>
                      {route.label}
                      <small>{route.hint}</small>
                    </span>
                    <Icon name="arrow" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
