"use client";
import { useMemo, useState } from "react";
import { Icon } from "../icons";
import { bogotaDate } from "../../domain/queue/logic";
import { cajaTotals, type CajaRow } from "../../domain/panel";
import { cop, panelFetch, usePanelData } from "./panel-api";
import { longDate } from "./labels";
import { BlockHead, EmptyState, StatusBadge, type IconName } from "./ui";

type Row = {
  kind: "cita" | "turno";
  id: string;
  barberId: string | null;
  label: string;
  service: string;
  at: string | null;
  price: number;
  state: "en_linea" | "local" | "por_cobrar";
};
type Caja = { date: string; barbers: { id: string; slug: string; display_name: string }[]; rows: Row[] };

const stateInfo = {
  en_linea: { label: "Pagado en línea", tone: "ok" as const },
  local: { label: "Cobrado en local", tone: "ok" as const },
  por_cobrar: { label: "Por cobrar", tone: "pending" as const },
};
const hour = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** Para totales: el estado ya decidió la columna, así que se reconstruye la fila mínima. */
const asCaja = (r: Row): CajaRow => ({ paidOnline: r.state === "en_linea" ? r.price : 0, paidInStore: r.state === "local", price: r.price });

/** Caja del día (solo dueño): finalizados por profesional, cobro en línea vs local y cierre imprimible. */
export function CajaSection() {
  const [today] = useState(() => bogotaDate(Date.now()));
  const [date, setDate] = useState(today);
  const { data, loading, error, reload } = usePanelData<Caja>(`/api/panel/caja?date=${date}`);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [failure, setFailure] = useState("");

  const groups = useMemo(() => {
    if (!data) return [];
    const list = data.barbers.map((b) => ({ id: b.id as string | null, name: b.display_name, rows: data.rows.filter((r) => r.barberId === b.id) }));
    const loose = data.rows.filter((r) => !r.barberId);
    if (loose.length) list.push({ id: null, name: "Sin profesional asignado", rows: loose });
    return list.filter((g) => g.rows.length);
  }, [data]);
  const totals = cajaTotals((data?.rows ?? []).map(asCaja));

  async function toggle(row: Row) {
    setBusyId(row.id);
    setFailure("");
    try {
      await panelFetch("/api/panel/caja", { method: "POST", body: { kind: row.kind, id: row.id, paid: row.state !== "local" } });
      await reload();
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "No se pudo guardar el cobro.");
    } finally {
      setBusyId(null);
    }
  }

  const kpis: { label: string; value: string; icon: IconName; tone?: "alert" }[] = [
    { label: "Servicios", value: String(totals.services), icon: "scissors" },
    { label: "Total del día", value: cop(totals.total), icon: "grid" },
    { label: "Pagado en línea", value: cop(totals.online), icon: "lock" },
    { label: "Cobrado en local", value: cop(totals.store), icon: "check" },
    { label: "Por cobrar", value: cop(totals.pending), icon: "clock", tone: totals.pending ? "alert" : undefined },
  ];

  return (
    <>
      <div className="adm-toolbar adm-toolbar-narrow pnl-caja-bar" role="group" aria-label="Día de la caja">
        <label className="adm-field">
          <span>Día</span>
          <input type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </label>
        <div className="pnl-caja-actions">
          <button type="button" className="button button-outline button-small" onClick={() => void reload()}>
            <Icon name="refresh" />
            Actualizar
          </button>
          <button type="button" className="button button-small" disabled={!data?.rows.length} onClick={() => window.print()}>
            <Icon name="download" />
            Cierre del día
          </button>
        </div>
      </div>

      {error ? (
        <p className="notice adm-banner" data-tone="alert" role="alert">
          <Icon name="alert" />
          {error}
        </p>
      ) : null}
      {failure ? (
        <p className="notice adm-banner" data-tone="alert" role="alert">
          <Icon name="alert" />
          {failure}
        </p>
      ) : null}

      {loading && !data ? (
        <p className="loading-state">Calculando la caja…</p>
      ) : data && !data.rows.length ? (
        <EmptyState icon="grid" title="Sin servicios finalizados" text={`No hay citas ni turnos finalizados el ${longDate(date).toLowerCase()}. Aparecen aquí apenas finalices una atención.`} />
      ) : data ? (
        <>
          <dl className="adm-kpis pnl-kpis5" aria-label="Resumen de la caja">
            {kpis.map((k) => (
              <div key={k.label} data-tone={k.tone}>
                <dt>{k.label}</dt>
                <dd className="pnl-money">{k.value}</dd>
              </div>
            ))}
          </dl>

          <div className="pnl-caja-groups">
            {groups.map((g) => {
              const sub = cajaTotals(g.rows.map(asCaja));
              return (
                <section key={g.id ?? "none"} className="surface pnl-card" aria-label={`Caja de ${g.name}`}>
                  <BlockHead icon="scissors" title={g.name}>
                    <span className="pnl-money pnl-sub-total">{cop(sub.total)}</span>
                  </BlockHead>
                  <p className="adm-quiet pnl-split">
                    {g.rows.length} {g.rows.length === 1 ? "servicio" : "servicios"} · en línea {cop(sub.online)} · local {cop(sub.store)} · por cobrar {cop(sub.pending)}
                  </p>
                  <ul className="pnl-list pnl-caja-list">
                    {g.rows.map((r) => (
                      <li key={`${r.kind}-${r.id}`}>
                        <span>
                          <strong>{r.label}</strong>
                          <small>
                            {r.service}
                            {r.at ? ` · ${hour.format(new Date(r.at))}` : ""} · {r.kind === "cita" ? "Cita" : "Turno presencial"}
                          </small>
                        </span>
                        <span className="pnl-caja-end">
                          <span className="pnl-money">{cop(r.price)}</span>
                          <StatusBadge tone={stateInfo[r.state].tone}>{stateInfo[r.state].label}</StatusBadge>
                          {r.state !== "en_linea" ? (
                            <button
                              type="button"
                              className={r.state === "local" ? "button button-outline button-small" : "button button-small"}
                              disabled={busyId !== null}
                              aria-busy={busyId === r.id || undefined}
                              onClick={() => void toggle(r)}
                            >
                              {r.state === "local" ? "Deshacer" : "Marcar cobrado en local"}
                            </button>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>

          {/* Hoja de cierre: solo visible al imprimir (ver @media print en panel-extra.css). */}
          <article className="caja-print" aria-hidden="true">
            <h1>Elite Barber &amp; Tattoo · Cierre de caja</h1>
            <p>{longDate(date)}</p>
            {groups.map((g) => {
              const sub = cajaTotals(g.rows.map(asCaja));
              return (
                <section key={g.id ?? "none"}>
                  <h2>
                    {g.name} <span>{cop(sub.total)}</span>
                  </h2>
                  <table>
                    <thead>
                      <tr>
                        <th>Servicio</th>
                        <th>Cliente</th>
                        <th>Estado</th>
                        <th>Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.rows.map((r) => (
                        <tr key={`${r.kind}-${r.id}`}>
                          <td>{r.service}</td>
                          <td>{r.label}</td>
                          <td>{stateInfo[r.state].label}</td>
                          <td>{cop(r.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              );
            })}
            <h2>
              Totales <span>{cop(totals.total)}</span>
            </h2>
            <ul>
              <li>Servicios: {totals.services}</li>
              <li>Pagado en línea: {cop(totals.online)}</li>
              <li>Cobrado en local: {cop(totals.store)}</li>
              <li>Por cobrar: {cop(totals.pending)}</li>
            </ul>
            <p className="caja-sign">Firma de quien cierra: ______________________</p>
          </article>
        </>
      ) : null}
    </>
  );
}
