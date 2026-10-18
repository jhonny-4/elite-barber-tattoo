"use client";
import { useState } from "react";
import { activeTicket } from "../../domain/queue/model";
import type { SharedState } from "../../services/contracts/demo";
import { JoinForm } from "../queue/join-form";
import { QrCard } from "../queue/qr-card";
import { ProfessionalField, SearchField, matcher } from "./agenda";
import { TicketItem } from "./items";
import type { Runner } from "./runner";
import { Count, EmptyState } from "./ui";

/** Fila del día por estado, registro presencial y QR para compartir. */
export function QueueSection({
  state,
  runner,
  today,
}: {
  state: SharedState;
  runner: Runner;
  today: string;
}) {
  const [professional, setProfessional] = useState("todos");
  const [query, setQuery] = useState("");
  const matches = matcher(query);
  const list = state.queue.filter(
    (t) =>
      (professional === "todos" ||
        t.barberId === "any" ||
        t.barberId === professional ||
        t.assignedBarberId === professional) &&
      matches(t.number, t.name, t.phone),
  );
  const byArrival = (a: { createdAt: string }, b: { createdAt: string }) =>
    a.createdAt.localeCompare(b.createdAt);
  const groups = [
    {
      id: "llamando",
      title: "Llamando",
      hint: "Ya se muestran en la pantalla de turnos.",
      items: list.filter((t) => t.date === today && t.status === "llamado"),
    },
    {
      id: "atencion",
      title: "En atención",
      hint: "",
      items: list.filter((t) => t.date === today && t.status === "en-atencion"),
    },
    {
      id: "espera",
      title: "En espera",
      hint: "Por orden de llegada. El primero compatible con el profesional libre se llama antes.",
      items: list
        .filter((t) => t.date === today && t.status === "esperando")
        .sort(byArrival),
    },
    {
      id: "vencidos",
      title: "Vencidos",
      hint: "Turnos de días anteriores que siguen abiertos: solo se pueden cancelar.",
      items: list.filter((t) => t.date < today && activeTicket(t)).sort(byArrival),
    },
  ].filter((group) => group.items.length);
  const closed = list
    .filter((t) => t.date === today && !activeTicket(t))
    .sort(byArrival)
    .reverse();
  const barberId = professional !== "todos" ? professional : undefined;

  return (
    <div className="adm-queue">
      <div className="adm-queue-board">
        <div className="adm-toolbar" role="group" aria-label="Filtros de la fila">
          <ProfessionalField value={professional} onChange={setProfessional} />
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Turno, nombre o teléfono"
          />
        </div>
        {groups.length ? (
          groups.map((group) => (
            <section
              key={group.id}
              className="adm-group"
              data-group={group.id}
              aria-labelledby={`fila-${group.id}`}
            >
              <h2 className="adm-group-title" id={`fila-${group.id}`}>
                {group.title}
                <Count
                  value={group.items.length}
                  label={`${group.items.length} turnos`}
                />
              </h2>
              {group.hint ? <p className="adm-hint">{group.hint}</p> : null}
              <div className="adm-list">
                {group.items.map((t, index) => (
                  <TicketItem
                    key={t.id}
                    ticket={t}
                    runner={runner}
                    today={today}
                    barberId={barberId}
                    primary={group.id === "espera" && index === 0}
                  />
                ))}
              </div>
            </section>
          ))
        ) : (
          <EmptyState
            icon="ticket"
            title={state.queue.length ? "Nada activo en la fila" : "La fila está vacía"}
            text="Registra a un cliente presencial con el formulario o comparte el QR para que se anote desde su celular."
          />
        )}
        {closed.length ? (
          <details className="adm-closed">
            <summary>
              Cerrados hoy
              <Count value={closed.length} label={`${closed.length} turnos cerrados hoy`} />
            </summary>
            <div className="adm-list">
              {closed.map((t) => (
                <TicketItem key={t.id} ticket={t} runner={runner} today={today} />
              ))}
            </div>
          </details>
        ) : null}
        <p className="form-disclaimer">
          Solo se puede llamar un turno cuando el servicio completo cabe en la
          disponibilidad actual del profesional. La espera que ve el cliente es
          una estimación.
        </p>
      </div>
      <aside className="adm-queue-aside" aria-label="Registrar y compartir la fila">
        <JoinForm manual onCreate={runner.run} />
        <QrCard />
      </aside>
    </div>
  );
}
