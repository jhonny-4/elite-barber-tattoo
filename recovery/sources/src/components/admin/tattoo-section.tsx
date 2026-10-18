"use client";
import Link from "next/link";
import { useState } from "react";
import type { TattooRequest } from "../../domain/demo";
import type { DemoCommand, SharedState } from "../../services/contracts/demo";
import { ConfirmAction } from "../confirm-action";
import { Icon } from "../icons";
import { SearchField, matcher } from "./agenda";
import {
  nextTattooStatus,
  tattooAdvance,
  tattooFlow,
  tattooStatus,
} from "./labels";
import type { Runner } from "./runner";
import { EmptyState, StatusBadge } from "./ui";

type Filter = "todos" | TattooRequest["status"];

/** Solicitudes de tatuaje: filtros por estado y seguimiento manual. */
export function TattooSection({
  state,
  runner,
}: {
  state: SharedState;
  runner: Runner;
}) {
  const [status, setStatus] = useState<Filter>("todos");
  const [query, setQuery] = useState("");
  const matches = matcher(query);
  const count = (value: Filter) =>
    value === "todos"
      ? state.requests.length
      : state.requests.filter((r) => r.status === value).length;
  const list = state.requests
    .filter(
      (r) =>
        (status === "todos" || r.status === status) &&
        matches(r.name, r.phone, r.idea, r.placement, r.size),
    )
    .reverse();
  const filters: [Filter, string][] = [
    ["todos", "Todas"],
    ...tattooFlow.map((s) => [s, tattooStatus[s].label] as [Filter, string]),
  ];

  return (
    <>
      <div className="adm-toolbar" role="group" aria-label="Filtros de solicitudes">
        <div className="adm-chipgroup adm-chipgroup-wide">
          <span className="adm-field-label" id="tatuaje-estado">
            Estado
          </span>
          <div className="adm-chips" role="group" aria-labelledby="tatuaje-estado">
            {filters.map(([value, label]) => (
              <button
                key={value}
                type="button"
                className="chip"
                aria-pressed={status === value}
                onClick={() => setStatus(value)}
              >
                {label}
                <span className="adm-chip-count">{count(value)}</span>
              </button>
            ))}
          </div>
        </div>
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Nombre, teléfono, idea o zona"
        />
      </div>
      {list.length ? (
        <div className="adm-requests">
          {list.map((r) => (
            <TattooCard key={r.id} request={r} runner={runner} />
          ))}
        </div>
      ) : state.requests.length ? (
        <EmptyState
          icon="needle"
          title="Sin solicitudes con estos filtros"
          text="Elige otro estado o cambia la búsqueda."
        >
          <button
            type="button"
            className="button button-outline button-small"
            onClick={() => {
              setStatus("todos");
              setQuery("");
            }}
          >
            Ver todas
          </button>
        </EmptyState>
      ) : (
        <EmptyState
          icon="needle"
          title="Sin solicitudes de tatuaje"
          text="Las ideas enviadas desde el formulario de tatuaje aparecerán aquí con su referencia, listas para la valoración de Jean Carlos."
        >
          <Link className="button button-outline button-small" href="/tatuaje">
            Ver el formulario
            <Icon name="arrow" />
          </Link>
        </EmptyState>
      )}
    </>
  );
}

function TattooCard({
  request: r,
  runner,
}: {
  request: TattooRequest;
  runner: Runner;
}) {
  const info = tattooStatus[r.status];
  const next = nextTattooStatus(r.status);
  const reference = r.referenceUrl ?? r.referenceDataUrl;
  const index = tattooFlow.indexOf(r.status);
  const advance: DemoCommand | null = next
    ? { type: "tattoo.change", id: r.id, status: next }
    : null;
  const close: DemoCommand = { type: "tattoo.change", id: r.id, status: "cerrada" };
  const closeControl = runner.control(close);
  const alt = `Referencia enviada por ${r.name}`;
  return (
    <article className="surface adm-request" data-status={r.status}>
      <div className="adm-request-head">
        <div>
          <h3>{r.name}</h3>
          <p>{r.phone}</p>
        </div>
        <StatusBadge tone={info.tone}>{info.label}</StatusBadge>
      </div>
      <ol className="adm-steps" aria-label="Seguimiento de la solicitud">
        {tattooFlow.map((step, i) => (
          <li
            key={step}
            data-state={i < index ? "done" : i === index ? "current" : "todo"}
            aria-current={i === index ? "step" : undefined}
          >
            {tattooStatus[step].step}
          </li>
        ))}
      </ol>
      <div className="adm-request-body" data-has-reference={reference ? "" : undefined}>
        <div className="adm-request-info">
          <p className="adm-request-idea">{r.idea}</p>
          <dl className="adm-facts">
            <div>
              <dt>Zona</dt>
              <dd>{r.placement}</dd>
            </div>
            <div>
              <dt>Tamaño</dt>
              <dd>{r.size}</dd>
            </div>
            <div>
              <dt>Referencia</dt>
              <dd>
                {reference
                  ? (r.referenceName ?? "Imagen adjunta")
                  : (r.referenceName ?? "Sin imagen")}
              </dd>
            </div>
          </dl>
        </div>
        {reference ? (
          <figure className="adm-ref">
            {reference.startsWith("data:") ? (
              <img src={reference} alt={alt} loading="lazy" decoding="async" />
            ) : (
              <a href={reference} target="_blank" rel="noopener noreferrer">
                <img src={reference} alt={alt} loading="lazy" decoding="async" />
                <span className="adm-ref-open">
                  Ver completa
                  <Icon name="arrow" />
                  <span className="visually-hidden"> (abre otra pestaña)</span>
                </span>
              </a>
            )}
          </figure>
        ) : null}
      </div>
      {r.status !== "cerrada" ? (
        <div className="adm-actions">
          {advance && next ? (
            <button
              type="button"
              className="button button-small"
              {...runner.control(advance)}
              onClick={() => void runner.run(advance)}
            >
              <Icon name="check" />
              {tattooAdvance[next] ?? `Pasar a ${tattooStatus[next].label}`}
            </button>
          ) : null}
          <ConfirmAction
            title="¿Cerrar esta solicitud?"
            description={`La idea de ${r.name} quedará cerrada y saldrá del seguimiento activo. No se enviará ningún mensaje al cliente.`}
            confirmLabel="Sí, cerrar solicitud"
            cancelLabel="Volver"
            disabled={closeControl.disabled}
            busy={closeControl["aria-busy"]}
            onConfirm={() => runner.run(close)}
          >
            Cerrar solicitud
          </ConfirmAction>
        </div>
      ) : null}
      <p className="adm-hint">
        Seguimiento manual: los estados no calculan precios, no cobran y no
        agendan sesiones.
      </p>
    </article>
  );
}
