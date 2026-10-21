"use client";
import { useState } from "react";
import type { Booking } from "../../domain/demo";
import type { SharedState } from "../../services/contracts/demo";
import { SearchField, matcher } from "./agenda";
import { byDateTime, dayLabel, initials, isClosedBooking } from "./labels";
import { ClientSheet } from "./client-sheet";
import { EmptyState } from "./ui";

export type ClientRow = {
  key: string;
  name: string;
  phone: string;
  bookings: number;
  turns: number;
  requests: number;
  next?: Booking;
};

/** Agrupa a los clientes por teléfono (solo dígitos) a partir de citas, turnos y solicitudes. */
export function groupClients(state: SharedState, today: string): ClientRow[] {
  const map = new Map<string, ClientRow>();
  const touch = (name: string, phone: string) => {
    const key = phone.replace(/\D/g, "") || phone.trim();
    const row = map.get(key) ?? {
      key,
      name,
      phone,
      bookings: 0,
      turns: 0,
      requests: 0,
    };
    row.name = name || row.name;
    map.set(key, row);
    return row;
  };
  for (const b of state.bookings) {
    const row = touch(b.name, b.phone);
    row.bookings += 1;
    if (
      !isClosedBooking(b) &&
      b.date >= today &&
      (!row.next || byDateTime(b, row.next) < 0)
    )
      row.next = b;
  }
  for (const t of state.queue) touch(t.name, t.phone).turns += 1;
  for (const r of state.requests) touch(r.name, r.phone).requests += 1;
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export function ClientsSection({
  clients,
  today,
}: {
  clients: ClientRow[];
  today: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<ClientRow | null>(null);
  const matches = matcher(query);
  const list = clients.filter((c) => matches(c.name, c.phone));
  if (!clients.length)
    return (
      <EmptyState
        icon="users"
        title="Aún no hay clientes"
        text="Se agrupan solos por teléfono al registrar citas, turnos o solicitudes de tatuaje."
      />
    );
  return (
    <>
      <div className="adm-toolbar adm-toolbar-narrow" role="group" aria-label="Buscar clientes">
        <SearchField value={query} onChange={setQuery} placeholder="Nombre o teléfono" />
      </div>
      {open ? <ClientSheet name={open.name} phone={open.phone} onClose={() => setOpen(null)} /> : null}
      <p className="adm-result" aria-live="polite">
        {list.length} {list.length === 1 ? "cliente" : "clientes"}
        {query.trim() ? " con esta búsqueda" : " agrupados por teléfono"}
      </p>
      {list.length ? (
        <div
          className="table-scroll adm-table"
          role="region"
          aria-label="Tabla de clientes"
          tabIndex={0}
        >
          <table>
            <caption className="visually-hidden">
              Clientes con su número de citas, turnos y solicitudes de tatuaje
            </caption>
            <thead>
              <tr>
                <th scope="col">Cliente</th>
                <th scope="col">Teléfono</th>
                <th scope="col" className="adm-num">
                  Citas
                </th>
                <th scope="col" className="adm-num">
                  Turnos
                </th>
                <th scope="col" className="adm-num">
                  Tatuajes
                </th>
                <th scope="col">Próxima cita</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.key}>
                  <th scope="row">
                    <button
                      type="button"
                      className="adm-person pnl-person"
                      aria-haspopup="dialog"
                      onClick={() => setOpen(c)}
                    >
                      <span className="adm-avatar" aria-hidden="true">
                        {initials(c.name)}
                      </span>
                      {c.name}
                      <span className="visually-hidden"> (abrir ficha)</span>
                    </button>
                  </th>
                  <td className="adm-nowrap">{c.phone}</td>
                  <td className="adm-num">{c.bookings}</td>
                  <td className="adm-num">{c.turns}</td>
                  <td className="adm-num">{c.requests}</td>
                  <td className="adm-nowrap">
                    {c.next ? (
                      `${dayLabel(c.next.date, today)} · ${c.next.time}`
                    ) : (
                      <span className="adm-muted">Sin cita próxima</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon="search"
          title="Sin coincidencias"
          text="Ningún cliente coincide con la búsqueda."
        >
          <button
            type="button"
            className="button button-outline button-small"
            onClick={() => setQuery("")}
          >
            Ver todos
          </button>
        </EmptyState>
      )}
    </>
  );
}
