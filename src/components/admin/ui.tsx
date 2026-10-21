"use client";
import type { ReactNode } from "react";
import { Icon } from "../icons";
import { clock, fullDate, type Tone } from "./labels";
import type { Feedback } from "./runner";

export type IconName = Parameters<typeof Icon>[0]["name"];

/** Insignia de estado: siempre texto + tono, nunca solo color. */
export function StatusBadge({
  tone,
  children,
}: {
  tone: Tone;
  children: ReactNode;
}) {
  return (
    <span className="status-badge" data-tone={tone}>
      {children}
    </span>
  );
}

/** Estado vacío centrado con una acción útil. */
export function EmptyState({
  icon,
  title,
  text,
  children,
}: {
  icon: IconName;
  title: string;
  text: string;
  children?: ReactNode;
}) {
  return (
    <div className="adm-empty">
      <span className="adm-empty-icon" aria-hidden="true">
        <Icon name={icon} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {children ? <div className="adm-empty-actions">{children}</div> : null}
    </div>
  );
}

/** Encabezado de tarjeta: título a la izquierda y acción opcional a la derecha. */
export function BlockHead({
  id,
  icon,
  title,
  children,
}: {
  id?: string;
  icon?: IconName;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="adm-block-head">
      <h2 id={id}>
        {icon ? <Icon name={icon} /> : null}
        {title}
      </h2>
      {children ? <div className="adm-block-actions">{children}</div> : null}
    </div>
  );
}

export function Count({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone?: "alert";
}) {
  return (
    <span className="adm-count" data-tone={tone}>
      <span aria-hidden="true">{value}</span>
      <span className="visually-hidden">{label}</span>
    </span>
  );
}

/** Estado de la conexión con el servidor compartido (SSE + sondeo). */
export function ConnectionBadge({
  ready,
  online,
  live,
}: {
  ready: boolean;
  online: boolean;
  live: boolean;
}) {
  const state = !ready
    ? { key: "connecting", label: "Conectando…" }
    : !online
      ? { key: "offline", label: "Sin conexión" }
      : live
        ? { key: "live", label: "En vivo" }
        : { key: "sync", label: "Al día" };
  return (
    <span className="adm-conn" data-state={state.key} role="status">
      {state.key === "live" ? (
        <span className="live-dot" aria-hidden="true" />
      ) : (
        <Icon
          name={
            state.key === "offline"
              ? "offline"
              : state.key === "sync"
                ? "refresh"
                : "clock"
          }
        />
      )}
      {state.label}
    </span>
  );
}

/** Cabecera centrada del panel: firma, título de sección, lectura y estado. */
export function PanelHead({
  eyebrow,
  title,
  serif,
  lead,
  now,
  ready,
  online,
  live,
  revision,
}: {
  eyebrow: string;
  title: string;
  serif: string;
  lead: string;
  now: number;
  ready: boolean;
  online: boolean;
  live: boolean;
  revision: number;
}) {
  return (
    <header className="adm-head">
      <p className="eyebrow">{eyebrow}</p>
      <h1>
        {title}
        <br />
        <span className="serif">{serif}</span>
      </h1>
      <p className="adm-head-lead">{lead}</p>
      <div className="adm-meta">
        <span className="adm-meta-item">
          <Icon name="calendar" />
          {fullDate(now)}
        </span>
        <span className="adm-meta-item">
          <Icon name="clock" />
          <span>
            <span className="visually-hidden">Hora en Cartagena: </span>
            {clock(now)}
          </span>
        </span>
        <ConnectionBadge ready={ready} online={online} live={live} />
        <span className="adm-meta-item adm-meta-rev">Revisión {revision}</span>
      </div>
    </header>
  );
}

/** Franja de sesión con salida. */
export function SessionBar({
  role,
  onExit,
}: {
  role: string;
  onExit?: () => void;
}) {
  return (
    <div className="adm-session">
      <p>
        <Icon name="lock" />
        <span>
          <strong>Sesión iniciada</strong> · {role}
        </span>
      </p>
      {onExit ? (
        <button
          type="button"
          className="button button-outline button-small"
          onClick={onExit}
        >
          <Icon name="logout" />
          Salir
        </button>
      ) : null}
    </div>
  );
}

/** Avisos flotantes: éxito en región `status` y errores en región `alert`. */
export function Toasts({
  feedback,
  onDismiss,
}: {
  feedback: Feedback | null;
  onDismiss: () => void;
}) {
  const toast = (item: Feedback) => (
    <div className="adm-toast" data-tone={item.tone} key={item.id}>
      <Icon name={item.tone === "ok" ? "check" : "alert"} />
      <p>{item.text}</p>
      <button
        type="button"
        className="adm-toast-close"
        aria-label="Cerrar aviso"
        onClick={onDismiss}
      >
        <Icon name="close" />
      </button>
    </div>
  );
  return (
    <div className="adm-toasts">
      <div role="status" aria-live="polite">
        {feedback?.tone === "ok" ? toast(feedback) : null}
      </div>
      <div role="alert">
        {feedback?.tone === "alert" ? toast(feedback) : null}
      </div>
    </div>
  );
}
