"use client";
import Link from "next/link";
import { currency } from "../../domain/catalog";
import { businessAddress } from "../../domain/business";
import { Icon } from "../icons";
import { Brand } from "../media";
import type { StepId } from "./copy";

export type SummaryData = {
  service: string;
  duration: number;
  price: number;
  professional: string;
  professionalNote: string;
  /** Fecha legible o cadena vacía si aún no hay. */
  date: string;
  /** Hora elegida (solo si sigue disponible) o cadena vacía. */
  time: string;
  presencial: boolean;
};

type IconName = Parameters<typeof Icon>[0]["name"];

function Rows({ data }: { data: SummaryData }) {
  const rows: { icon: IconName; label: string; value: string; note?: string; done: boolean }[] = [
    {
      icon: "scissors",
      label: "Servicio",
      value: data.service,
      note: `${data.duration} min aprox.`,
      done: true,
    },
    {
      icon: "users",
      label: "Profesional",
      value: data.professional,
      note: data.professionalNote,
      done: true,
    },
    {
      icon: "calendar",
      label: "Fecha",
      value: data.date || "Por elegir",
      done: Boolean(data.date),
    },
    {
      icon: "clock",
      label: "Hora",
      value: data.time || "Por elegir",
      note: data.time ? "Hora de Cartagena" : undefined,
      done: Boolean(data.time),
    },
  ];
  return (
    <dl className="bk-summary-list">
      {rows.map((row) => (
        <div key={row.label} data-done={row.done || undefined}>
          <dt>
            <Icon name={row.icon} />
            {row.label}
          </dt>
          <dd>
            {row.value}
            {row.note && <small>{row.note}</small>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Total({ price }: { price: number }) {
  return (
    <div className="bk-summary-total">
      <span>Precio del servicio</span>
      <strong>
        {currency(price)}
        <small> COP</small>
      </strong>
    </div>
  );
}

const note =
  "Pago en el establecimiento. No se realiza ningún cobro en línea.";

/** Resumen lateral pegajoso (escritorio). */
export function BookingSummary({ data }: { data: SummaryData }) {
  return (
    <aside className="bk-summary" aria-labelledby="bk-summary-title">
      <div className="bk-summary-card">
        <div className="bk-summary-brand">
          <Brand title="" />
        </div>
        <h2 className="bk-summary-title" id="bk-summary-title">
          Tu reserva
        </h2>
        {data.presencial && (
          <span className="status-badge" data-tone="pending">
            Registro presencial
          </span>
        )}
        <Rows data={data} />
        <Total price={data.price} />
        <p className="bk-summary-note">{note}</p>
      </div>
      <Link className="bk-cross" href="/tatuaje">
        <span className="bk-cross-icon" aria-hidden="true">
          <Icon name="needle" />
        </span>
        <span>
          <strong>¿Buscas un tatuaje?</strong>
          Se solicita aparte: valoración y cotización con Jean Carlos.
        </span>
        <Icon name="arrow" className="bk-cross-arrow" />
      </Link>
      <p className="bk-summary-place">
        <Icon name="pin" />
        <span>{businessAddress}</span>
      </p>
    </aside>
  );
}

/** Resumen compacto y desplegable (móvil y tableta). */
export function CompactSummary({ data }: { data: SummaryData }) {
  const when = [data.date, data.time].filter(Boolean).join(" · ");
  return (
    <details className="bk-summary-compact">
      <summary>
        <span className="visually-hidden">Resumen de tu reserva: </span>
        <span className="bk-compact-main">
          <strong>{data.service}</strong>
          <span>{when || "Fecha y hora por elegir"}</span>
        </span>
        <span className="bk-compact-price">{currency(data.price)}</span>
        <Icon name="chevron" className="bk-compact-chevron" />
      </summary>
      <div className="bk-compact-body">
        <Rows data={data} />
        <Total price={data.price} />
        <p className="bk-summary-note">{note}</p>
      </div>
    </details>
  );
}

/** Ticket de revisión (paso 4) y comprobante (éxito). */
export function ReviewTicket({
  data,
  contact,
  reference,
  onEdit,
}: {
  data: SummaryData;
  contact: { name: string; phone: string };
  reference?: string;
  onEdit?: (step: StepId) => void;
}) {
  const section = (
    title: string,
    step: StepId,
    editLabel: string,
    rows: [label: string, value: string, note?: string][],
  ) => (
    <section className="bk-ticket-section">
      <div className="bk-ticket-section-head">
        <h3>{title}</h3>
        {onEdit && (
          <button
            type="button"
            className="bk-edit"
            onClick={() => onEdit(step)}
            aria-label={`Editar ${editLabel}`}
          >
            Editar
          </button>
        )}
      </div>
      <dl>
        {rows.map(([label, value, rowNote]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>
              {value || "Por elegir"}
              {rowNote && <small>{rowNote}</small>}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
  return (
    <article
      className="bk-ticket"
      aria-label={reference ? "Comprobante de la reserva" : "Detalle de la reserva"}
    >
      <header className="bk-ticket-head">
        <Brand title="" className="bk-ticket-logo" />
        <span className="bk-ticket-kind">Cita de barbería</span>
        {reference && (
          <span className="bk-ticket-ref">
            Código <b>{reference}</b>
          </span>
        )}
      </header>
      {section("Tu cita", 1, "servicio y profesional", [
        ["Servicio", data.service, `${data.duration} min aprox.`],
        ["Profesional", data.professional, data.professionalNote],
      ])}
      {section("Cuándo", 2, "fecha y hora", [
        ["Fecha", data.date],
        ["Hora", data.time, data.time ? "Hora de Cartagena" : undefined],
      ])}
      <div className="bk-ticket-perf" aria-hidden="true" />
      {section("Tus datos", 3, "tus datos", [
        ["Nombre", contact.name],
        ["Teléfono", contact.phone],
      ])}
      <footer className="bk-ticket-total">
        <span>Precio del servicio</span>
        <strong>
          {currency(data.price)}
          <small> COP</small>
        </strong>
      </footer>
    </article>
  );
}
