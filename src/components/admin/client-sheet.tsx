"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "../icons";
import { cop, panelFetch, usePanelData } from "./panel-api";
import { initials } from "./labels";
import { StatusBadge } from "./ui";
import type { Tone } from "./labels";

type Ficha = {
  note: string;
  noteUpdatedAt: string | null;
  visits: { id: string; startsAt: string; status: string; priceCop: number; service: string; barber: string }[];
  completed: number;
  spentCop: number;
};

const visitStatus: Record<string, { label: string; tone: Tone }> = {
  pendiente_pago: { label: "Pendiente de pago", tone: "pending" },
  confirmada: { label: "Confirmada", tone: "ok" },
  en_atencion: { label: "En atención", tone: "live" },
  finalizada: { label: "Finalizada", tone: "muted" },
  cancelada: { label: "Cancelada", tone: "muted" },
  expirada: { label: "Expirada", tone: "muted" },
  no_asistio: { label: "No asistió", tone: "muted" },
};
const when = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Ficha de cliente en diálogo modal: historial de citas y nota interna editable. */
export function ClientSheet({ name, phone, onClose }: { name: string; phone: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const { data, loading, error, reload } = usePanelData<Ficha>(`/api/panel/clientes?phone=${encodeURIComponent(phone)}`);
  const [note, setNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "ok" | "alert"; text: string } | null>(null);
  const text = note ?? data?.note ?? "";
  const dirty = data !== null && text.trim() !== data.note;

  useEffect(() => {
    const node = dialog.current;
    if (node && !node.open) node.showModal();
  }, []);

  async function save() {
    setSaving(true);
    setFeedback(null);
    try {
      await panelFetch("/api/panel/clientes", { method: "PUT", body: { phone, note: text } });
      setFeedback({ tone: "ok", text: "Nota guardada." });
      setNote(null);
      await reload();
    } catch (e) {
      setFeedback({ tone: "alert", text: e instanceof Error ? e.message : "No se pudo guardar la nota." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      className="pnl-sheet"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialog.current) dialog.current?.close();
      }}
    >
      <div className="pnl-sheet-body">
        <header className="pnl-sheet-head">
          <span className="adm-avatar pnl-sheet-avatar" aria-hidden="true">
            {initials(name)}
          </span>
          <div>
            <p className="eyebrow">Ficha de cliente</p>
            <h2 id={titleId}>{name}</h2>
            <p className="adm-muted">{phone}</p>
          </div>
          <button type="button" className="icon-button" aria-label="Cerrar ficha" onClick={() => dialog.current?.close()}>
            <Icon name="close" />
          </button>
        </header>

        {loading && !data ? <p className="loading-state">Cargando historial…</p> : null}
        {error ? (
          <p className="pnl-note" data-tone="alert" role="alert">
            <Icon name="alert" />
            {error}
            <button type="button" className="text-link" onClick={() => void reload()}>
              Reintentar
            </button>
          </p>
        ) : null}

        {data ? (
          <>
            <dl className="adm-kpis pnl-kpis3">
              <div>
                <dt>Visitas</dt>
                <dd>{data.completed}</dd>
              </div>
              <div>
                <dt>Citas</dt>
                <dd>{data.visits.length}</dd>
              </div>
              <div>
                <dt>Total gastado</dt>
                <dd className="pnl-money">{cop(data.spentCop)}</dd>
              </div>
            </dl>

            <section aria-labelledby={`${titleId}-nota`} className="pnl-notebox">
              <label id={`${titleId}-nota`} htmlFor={`${titleId}-ta`} className="adm-field-label">
                Nota interna
              </label>
              <textarea
                id={`${titleId}-ta`}
                rows={3}
                maxLength={1000}
                value={text}
                placeholder="Ej.: le gusta el fade bajo, alérgico a…"
                onChange={(e) => setNote(e.target.value)}
              />
              <div className="pnl-notebar">
                <span className="adm-muted" aria-live="polite">
                  {text.length}/1000
                  {data.noteUpdatedAt ? ` · guardada ${when.format(new Date(data.noteUpdatedAt))}` : ""}
                </span>
                <button type="button" className="button button-small" disabled={!dirty || saving} aria-busy={saving || undefined} onClick={() => void save()}>
                  <Icon name="check" />
                  Guardar nota
                </button>
              </div>
              {feedback ? (
                <p className="pnl-note" data-tone={feedback.tone} role={feedback.tone === "alert" ? "alert" : "status"}>
                  <Icon name={feedback.tone === "ok" ? "check" : "alert"} />
                  {feedback.text}
                </p>
              ) : null}
            </section>

            <section aria-label="Historial de citas">
              <h3 className="pnl-sub">Historial</h3>
              {data.visits.length ? (
                <ul className="pnl-history">
                  {data.visits.map((v) => (
                    <li key={v.id}>
                      <span>
                        <strong>{v.service}</strong>
                        <small>
                          {when.format(new Date(v.startsAt))} · {v.barber}
                        </small>
                      </span>
                      <span className="pnl-history-end">
                        <span className="pnl-money">{cop(v.priceCop)}</span>
                        <StatusBadge tone={(visitStatus[v.status] ?? visitStatus.cancelada).tone}>{(visitStatus[v.status] ?? { label: v.status }).label}</StatusBadge>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="adm-quiet">Este cliente aún no tiene citas registradas (solo turnos o solicitudes de tatuaje).</p>
              )}
            </section>
          </>
        ) : null}
      </div>
    </dialog>
  );
}
