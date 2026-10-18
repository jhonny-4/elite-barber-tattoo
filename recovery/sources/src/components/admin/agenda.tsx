"use client";
import Link from "next/link";
import { useState } from "react";
import { barbers } from "../../domain/catalog";
import { activeTicket, type QueueTicket } from "../../domain/queue/model";
import type { SharedState } from "../../services/contracts/demo";
import { Icon } from "../icons";
import { BookingItem, TicketItem, groupByDate } from "./items";
import {
  bookingStatus,
  byDateTime,
  dayLabel,
  longDate,
  serviceName,
} from "./labels";
import type { Runner } from "./runner";
import { Count, EmptyState } from "./ui";

type Range = "hoy" | "proximas" | "todas" | "fecha";

const ranges: [Range, string][] = [
  ["hoy", "Hoy"],
  ["proximas", "Próximas"],
  ["todas", "Todas"],
];

const queueOrder: Record<string, number> = {
  llamado: 0,
  "en-atencion": 1,
  esperando: 2,
};

/** Turnos activos: llamando, en atención y en espera por orden de llegada. */
export const sortTickets = (list: QueueTicket[]) =>
  [...list].sort(
    (a, b) =>
      (queueOrder[a.status] ?? 3) - (queueOrder[b.status] ?? 3) ||
      a.createdAt.localeCompare(b.createdAt),
  );

export function matcher(query: string) {
  const q = query.trim().toLowerCase();
  return (...values: string[]) =>
    !q || values.some((value) => value.toLowerCase().includes(q));
}

export function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="adm-field adm-field-search">
      <span>Buscar</span>
      <span className="adm-search">
        <Icon name="search" />
        <input
          type="search"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </span>
    </label>
  );
}

export function ProfessionalField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="adm-field">
      <span>Profesional</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="todos">Todo el equipo</option>
        {barbers.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Agenda de citas por día, con filtros, y los turnos activos de la fila de hoy. */
export function AgendaSection({
  state,
  runner,
  today,
}: {
  state: SharedState;
  runner: Runner;
  today: string;
}) {
  const [range, setRange] = useState<Range>("proximas");
  const [date, setDate] = useState("");
  const [professional, setProfessional] = useState("todos");
  const [status, setStatus] = useState("todos");
  const [query, setQuery] = useState("");
  const matches = matcher(query);

  const bookings = state.bookings
    .filter(
      (b) =>
        (professional === "todos" || b.barberId === professional) &&
        (range === "todas" ||
          (range === "hoy" && b.date === today) ||
          (range === "proximas" && b.date >= today) ||
          (range === "fecha" && b.date === date)) &&
        (status === "todos" || b.status === status) &&
        matches(b.name, b.phone, serviceName(b.serviceId)),
    )
    .sort(byDateTime);
  const groups = groupByDate(bookings);
  const tickets = sortTickets(
    state.queue.filter(
      (t) =>
        activeTicket(t) &&
        t.date === today &&
        (professional === "todos" ||
          t.barberId === "any" ||
          t.barberId === professional ||
          t.assignedBarberId === professional) &&
        matches(t.number, t.name, t.phone),
    ),
  );
  const firstWaiting = tickets.findIndex((t) => t.status === "esperando");
  const filtered =
    range !== "proximas" ||
    professional !== "todos" ||
    status !== "todos" ||
    query.trim() !== "";

  function clear() {
    setRange("proximas");
    setDate("");
    setProfessional("todos");
    setStatus("todos");
    setQuery("");
  }

  return (
    <>
      <div className="adm-toolbar" role="group" aria-label="Filtros de la agenda">
        <div className="adm-chipgroup">
          <span className="adm-field-label" id="agenda-range">
            Mostrar
          </span>
          <div className="adm-chips" role="group" aria-labelledby="agenda-range">
            {ranges.map(([id, label]) => (
              <button
                key={id}
                type="button"
                className="chip"
                aria-pressed={range === id}
                onClick={() => {
                  setRange(id);
                  setDate("");
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <label className="adm-field">
          <span>Fecha concreta</span>
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setRange(e.target.value ? "fecha" : "proximas");
            }}
          />
        </label>
        <ProfessionalField value={professional} onChange={setProfessional} />
        <label className="adm-field">
          <span>Estado</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="todos">Todos los estados</option>
            {Object.entries(bookingStatus).map(([value, info]) => (
              <option key={value} value={value}>
                {info.label}
              </option>
            ))}
          </select>
        </label>
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Nombre, teléfono o servicio"
        />
      </div>

      <div className="adm-section-bar">
        <p className="adm-result" aria-live="polite">
          {bookings.length} {bookings.length === 1 ? "cita" : "citas"}{" "}
          {filtered ? "con estos filtros" : "de hoy en adelante"}
        </p>
        <div className="adm-section-actions">
          {filtered ? (
            <button
              type="button"
              className="button button-outline button-small"
              onClick={clear}
            >
              Quitar filtros
            </button>
          ) : null}
          <Link className="button button-small" href="/reservar?origen=presencial">
            <Icon name="plus" />
            Nueva cita presencial
          </Link>
        </div>
      </div>

      {groups.length ? (
        <div className="adm-days">
          {groups.map(([day, list]) => {
            const label = dayLabel(day, today);
            return (
              <section key={day} className="adm-day" aria-labelledby={`dia-${day}`}>
                <h2 className="adm-day-title" id={`dia-${day}`}>
                  {label}
                  {label !== longDate(day) ? <small>{longDate(day)}</small> : null}
                  <Count
                    value={list.length}
                    label={`${list.length} ${list.length === 1 ? "cita" : "citas"}`}
                  />
                </h2>
                <div className="adm-list">
                  {list.map((b) => (
                    <BookingItem
                      key={b.id}
                      booking={b}
                      state={state}
                      runner={runner}
                      today={today}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon="calendar"
          title={state.bookings.length ? "Sin citas con estos filtros" : "Agenda libre"}
          text={
            state.bookings.length
              ? "Cambia el rango, el profesional o la búsqueda para ver otras citas."
              : "Aún no hay citas. Las reservas online y presenciales aparecerán aquí al instante."
          }
        >
          {filtered ? (
            <button
              type="button"
              className="button button-outline button-small"
              onClick={clear}
            >
              Ver próximas citas
            </button>
          ) : (
            <Link className="button button-small" href="/reservar?origen=presencial">
              <Icon name="plus" />
              Nueva cita presencial
            </Link>
          )}
        </EmptyState>
      )}

      <section className="adm-day" aria-labelledby="agenda-fila">
        <h2 className="adm-day-title" id="agenda-fila">
          Fila de hoy
          <small>Turnos presenciales y por QR</small>
          <Count
            value={tickets.length}
            label={`${tickets.length} turnos activos`}
          />
        </h2>
        {tickets.length ? (
          <div className="adm-list">
            {tickets.map((t, index) => (
              <TicketItem
                key={t.id}
                ticket={t}
                runner={runner}
                today={today}
                primary={index === firstWaiting}
                barberId={professional !== "todos" ? professional : undefined}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="ticket"
            title="Sin turnos activos"
            text="Los clientes sin cita aparecen aquí al registrarse en recepción o con el código QR."
          />
        )}
      </section>
    </>
  );
}
