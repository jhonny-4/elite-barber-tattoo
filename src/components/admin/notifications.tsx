"use client";
import { useState } from "react";
import { bogotaDate } from "../../domain/queue/logic";
import type { DemoCommand, SharedState } from "../../services/contracts/demo";
import { Icon } from "../icons";
import { channelLabel, clock, dayLabel } from "./labels";
import type { Runner } from "./runner";
import { EmptyState, StatusBadge } from "./ui";

const pageSize = 30;

/** Estado de los correos de confirmación enviados a clientes. */
export function NotificationsSection({
  state,
  runner,
  today,
}: {
  state: SharedState;
  runner: Runner;
  today: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const total = state.notifications.length;
  const unread = state.notifications.filter((n) => !n.read).length;
  const visible = showAll ? state.notifications : state.notifications.slice(0, pageSize);
  const markRead: DemoCommand = { type: "notifications.read" };
  return (
    <>
      <div className="adm-section-bar adm-section-bar-center">
        <p className="adm-result" aria-live="polite">
          {total} {total === 1 ? "aviso" : "avisos"} · {unread} sin leer
        </p>
        <div className="adm-section-actions">
          <button
            type="button"
            className="button button-outline button-small"
            {...runner.control(markRead, unread === 0)}
            onClick={() => void runner.run(markRead)}
          >
            <Icon name="check" />
            Marcar todo como leído
          </button>
        </div>
      </div>
      {total ? (
        <>
          <ol className="adm-notes">
            {visible.map((n) => (
              <li key={n.id} className="adm-note" data-unread={!n.read || undefined}>
                <span className="adm-note-icon" aria-hidden="true">
                  <Icon name={n.channel === "correo-simulado" ? "mail" : "bell"} />
                </span>
                <div className="adm-note-body">
                  <p>{n.text}</p>
                  <p className="adm-note-meta">
                    <span>{channelLabel[n.channel]}</span>
                    <time dateTime={n.createdAt}>
                      {dayLabel(bogotaDate(Date.parse(n.createdAt)), today)} ·{" "}
                      {clock(n.createdAt)}
                    </time>
                    <StatusBadge tone={n.read ? "muted" : "pending"}>
                      {n.read ? "Leído" : "Nuevo"}
                    </StatusBadge>
                  </p>
                </div>
              </li>
            ))}
          </ol>
          {total > pageSize ? (
            <div className="adm-section-actions">
              <button
                type="button"
                className="button button-outline button-small"
                aria-expanded={showAll}
                onClick={() => setShowAll(!showAll)}
              >
                {showAll ? "Mostrar los más recientes" : `Mostrar los ${total} avisos`}
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <EmptyState
          icon="bell"
          title="Sin avisos"
          text="Aquí aparece cada correo de confirmación enviado a tus clientes y los que no se pudieron entregar."
        />
      )}
    </>
  );
}
