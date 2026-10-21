"use client";
import { useId, useState } from "react";
import { Icon } from "../icons";
import { bogotaDate } from "../../domain/queue/logic";
import { ConfirmAction } from "../confirm-action";
import { panelFetch, usePanelData } from "./panel-api";
import { StatusBadge } from "./ui";

type Block = { id: string; starts_at: string; ends_at: string; reason: string | null };
type Mode = "resto" | "rango" | "vacaciones" | null;

const stamp = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const dayOnly = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "short" });

/** Rango legible: «hoy 14:00 – 16:00», «12 nov – 20 nov». */
function describe(block: Block) {
  const start = new Date(block.starts_at);
  const end = new Date(block.ends_at);
  const long = end.getTime() - start.getTime() >= 86_400_000 - 60_000;
  if (long) return `${dayOnly.format(start)} – ${dayOnly.format(new Date(end.getTime() - 60_000))}`;
  return `${stamp.format(start)} – ${stamp.format(end).slice(-5)}`;
}

/**
 * Bloqueos rápidos de un profesional (tabla `absences`): la disponibilidad pública, la
 * reprogramación y el inicio de atención ya los respetan. Solo dueño o el propio barbero;
 * el servidor lo vuelve a comprobar.
 */
export function BlockPanel({ slug, name }: { slug: string; name: string }) {
  const id = useId();
  const { data, loading, error, reload } = usePanelData<{ blocks: Block[] }>(`/api/panel/bloqueos?barber=${slug}`);
  const [mode, setMode] = useState<Mode>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "alert"; text: string } | null>(null);
  const [today] = useState(() => bogotaDate(Date.now()));
  const [from, setFrom] = useState("14:00");
  const [to, setTo] = useState("16:00");
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);

  async function create(body: Record<string, unknown>) {
    setBusy(true);
    setMessage(null);
    try {
      const result = await panelFetch<{ conflicts: number }>("/api/panel/bloqueos", { method: "POST", body: { barber: slug, ...body } });
      setMessage({
        tone: result.conflicts ? "alert" : "ok",
        text: result.conflicts
          ? `Bloqueo guardado. Hay ${result.conflicts} ${result.conflicts === 1 ? "cita confirmada" : "citas confirmadas"} dentro del rango: reprográmalas o cancélalas desde Agenda.`
          : "Bloqueo guardado. La agenda pública ya no ofrece ese horario.",
      });
      setMode(null);
      await reload();
    } catch (e) {
      setMessage({ tone: "alert", text: e instanceof Error ? e.message : "No se pudo guardar el bloqueo." });
    } finally {
      setBusy(false);
    }
  }

  async function remove(blockId: string) {
    try {
      await panelFetch("/api/panel/bloqueos", { method: "DELETE", body: { id: blockId } });
      setMessage({ tone: "ok", text: "Bloqueo quitado. El horario vuelve a estar disponible." });
      await reload();
    } catch (e) {
      setMessage({ tone: "alert", text: e instanceof Error ? e.message : "No se pudo quitar el bloqueo." });
    }
  }

  const blocks = data?.blocks ?? [];
  const toggle = (next: Exclude<Mode, null>) => setMode(mode === next ? null : next);

  return (
    <section className="surface pnl-card pnl-blocks" aria-labelledby={`${id}-t`}>
      <div className="pnl-head">
        <h3 id={`${id}-t`}>
          <Icon name="lock" />
          Bloqueos de {name}
        </h3>
        <StatusBadge tone={blocks.length ? "pending" : "muted"}>
          {blocks.length ? `${blocks.length} activo${blocks.length === 1 ? "" : "s"}` : "Sin bloqueos"}
        </StatusBadge>
      </div>

      <div className="pnl-actions" role="group" aria-label={`Crear bloqueo para ${name}`}>
        <button type="button" className="button button-outline button-small" disabled={busy} onClick={() => void create({ kind: "resto" })}>
          Bloquear resto de hoy
        </button>
        <button type="button" className="button button-outline button-small" aria-expanded={mode === "rango"} aria-controls={`${id}-rango`} onClick={() => toggle("rango")}>
          Bloquear rango hoy
        </button>
        <button type="button" className="button button-outline button-small" aria-expanded={mode === "vacaciones"} aria-controls={`${id}-vac`} onClick={() => toggle("vacaciones")}>
          Vacaciones
        </button>
      </div>

      {mode === "rango" ? (
        <form
          id={`${id}-rango`}
          className="pnl-form"
          onSubmit={(e) => {
            e.preventDefault();
            void create({ kind: "rango", from, to });
          }}
        >
          <label>
            Desde
            <input type="time" required value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            Hasta
            <input type="time" required value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <button type="submit" className="button button-small" disabled={busy} aria-busy={busy || undefined}>
            Guardar bloqueo
          </button>
        </form>
      ) : null}
      {mode === "vacaciones" ? (
        <form
          id={`${id}-vac`}
          className="pnl-form"
          onSubmit={(e) => {
            e.preventDefault();
            void create({ kind: "vacaciones", dateFrom, dateTo });
          }}
        >
          <label>
            Desde
            <input type="date" required min={today} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </label>
          <label>
            Hasta
            <input type="date" required min={dateFrom} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </label>
          <button type="submit" className="button button-small" disabled={busy} aria-busy={busy || undefined}>
            Guardar vacaciones
          </button>
        </form>
      ) : null}

      {message ? (
        <p className="pnl-note" data-tone={message.tone} role={message.tone === "alert" ? "alert" : "status"}>
          <Icon name={message.tone === "ok" ? "check" : "alert"} />
          {message.text}
        </p>
      ) : null}

      {loading && !data ? <p className="adm-quiet">Cargando bloqueos…</p> : null}
      {error ? (
        <p className="pnl-note" data-tone="alert" role="alert">
          <Icon name="alert" />
          {error}
          <button type="button" className="text-link" onClick={() => void reload()}>
            Reintentar
          </button>
        </p>
      ) : null}
      {data && !blocks.length ? <p className="adm-quiet">Sin bloqueos vigentes ni próximos.</p> : null}
      {blocks.length ? (
        <ul className="pnl-list">
          {blocks.map((b) => (
            <li key={b.id}>
              <span>
                <strong>{b.reason ?? "Bloqueo"}</strong>
                <small>{describe(b)}</small>
              </span>
              <ConfirmAction
                title="¿Quitar este bloqueo?"
                description={`El horario de ${name} (${describe(b)}) volverá a estar disponible para reservas.`}
                confirmLabel="Sí, quitar bloqueo"
                cancelLabel="Volver"
                className="button button-outline button-small"
                onConfirm={() => remove(b.id)}
              >
                Quitar
              </ConfirmAction>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
