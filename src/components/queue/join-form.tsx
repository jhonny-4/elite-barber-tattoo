"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { currency } from "../../domain/catalog";
import { postDemo } from "../../services/adapters/http-demo";
import type { DemoCommand, PublicTicket } from "../../services/contracts/demo";
import { usePublicQueue } from "../../lib/use-public-queue";
import { ContactFields } from "../booking-flow";
import { Brand } from "../media";
import { Icon } from "../icons";
import { ticketHint, ticketStatus, waitValue } from "./ticket-format";

const TICKET_KEY = "elite.queue.ticket";

/** Mensajes del servidor o de red en lenguaje de cliente. */
function friendly(message: string) {
  if (!message) return "";
  if (/demo|failed to fetch|networkerror|load failed/i.test(message))
    return "No se pudo completar con la fila. Revisa tu conexión e inténtalo de nuevo.";
  return message;
}

export function JoinForm({
  manual = false,
  onCreate,
}: {
  manual?: boolean;
  onCreate?: (command: DemoCommand) => Promise<unknown>;
}) {
  const [token, setToken] = useState(""),
    [created, setCreated] = useState<PublicTicket | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const live = usePublicQueue(token);
  const [catalog,setCatalog]=useState<{barbers:{id:string;name:string}[];services:{id:string;name:string;priceCOP:number}[]}|null>(null);
  useEffect(()=>{const controller=new AbortController();void fetch("/api/reservas/catalogo",{signal:controller.signal,cache:"no-store"}).then(async r=>{const d=await r.json();if(!r.ok) throw new Error(d.error);return d;}).then(d=>setCatalog({barbers:d.barbers.map((b:{slug:string;display_name:string})=>({id:b.slug,name:b.display_name})),services:d.services.map((s:{slug:string;name:string;price_cop:number})=>({id:s.slug,name:s.name,priceCOP:s.price_cop}))})).catch(()=>{if(!controller.signal.aborted)setError("No se pudo cargar el catálogo. Recarga para reintentar.");});return()=>controller.abort();},[]);
  const barbers=catalog?.barbers??[],services=catalog?.services??[];
  const uid = useId();
  const receipt = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!manual)
      try {
        setToken(sessionStorage.getItem(TICKET_KEY) ?? "");
      } catch {}
  }, [manual]);
  // Al recibir el turno, el formulario desaparece: lleva la vista y el foco al recibo.
  useEffect(() => {
    const node = receipt.current;
    if (!created || !node) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" });
    node.focus({ preventScroll: true });
  }, [created]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget,
      data = new FormData(form);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const command: DemoCommand = {
        type: "queue.join",
        input: {
          name: String(data.get("name")),
          phone: String(data.get("phone")),
          serviceId: String(data.get("serviceId")),
          barberId: String(data.get("barberId")),
          source: manual ? "presencial" : "qr",
        },
      };
      if (manual && onCreate) {
        const saved = await onCreate(command);
        if (!saved)
          throw new Error("No se guardó el turno. Revisa el aviso del panel.");
        form.reset();
        setNotice("Turno presencial guardado en la fila compartida.");
      } else {
        const result = await postDemo<{ ticket: PublicTicket; token: string }>(
          "/api/fila",
          command,
        );
        setCreated(result.ticket);
        setToken(result.token);
        try {
          sessionStorage.setItem(TICKET_KEY, result.token);
        } catch {
          setNotice("Conserva esta pantalla para consultar tu turno.");
        }
      }
    } catch (e) {
      setError(friendly((e as Error).message));
    } finally {
      setBusy(false);
    }
  }
  function backToForm() {
    setToken("");
    setCreated(null);
    setNotice("");
    try {
      sessionStorage.removeItem(TICKET_KEY);
    } catch {}
  }
  const ticket = live.missing ? null : (live.ticket ?? created);
  const connecting = !live.online && !live.error;

  if (token && !manual) {
    const status = ticket ? ticketStatus[ticket.status] : null;
    const closed =
      live.missing ||
      ticket?.status === "finalizado" ||
      ticket?.status === "cancelado";
    const wait = ticket ? waitValue(ticket.estimatedMinutes) : null;
    return (
      <section
        ref={receipt}
        className="queue-receipt"
        aria-labelledby={`${uid}-ticket`}
        tabIndex={-1}
      >
        <div
          className="queue-ticket"
          data-status={ticket?.status ?? (live.missing ? "missing" : "loading")}
        >
          <div className="queue-ticket-top">
            <Brand className="queue-ticket-brand" />
            <p className="eyebrow" id={`${uid}-ticket`}>
              Tu turno · Elite
            </p>
            {ticket && status ? (
              <>
                <strong className="ticket-number">{ticket.number}</strong>
                <p className="queue-ticket-state" aria-live="polite">
                  <span className="status-badge" data-tone={status.tone}>
                    {status.label}
                  </span>
                </p>
                <p className="queue-ticket-hint">{ticketHint(ticket)}</p>
              </>
            ) : live.missing ? (
              <div className="queue-ticket-missing">
                <h2>Turno no disponible</h2>
                <p>
                  Puede que la fila se haya reiniciado. Puedes tomar un turno
                  nuevo cuando quieras.
                </p>
              </div>
            ) : (
              <p className="loading-state">Consultando tu turno…</p>
            )}
          </div>
          {ticket && (
            <div className="queue-ticket-bottom">
              <dl className="queue-ticket-facts">
                {ticket.status === "esperando" && (
                  <>
                    <div className="queue-fact queue-fact-key">
                      <dt>Posición en la fila</dt>
                      <dd>{ticket.position ?? "—"}</dd>
                    </div>
                    <div className="queue-fact queue-fact-key">
                      <dt>Espera estimada</dt>
                      <dd>
                        {wait ?? (
                          <span className="queue-fact-soft">Por confirmar</span>
                        )}
                      </dd>
                    </div>
                  </>
                )}
                <div className="queue-fact">
                  <dt>Profesional</dt>
                  <dd>{ticket.barber}</dd>
                </div>
                <div className="queue-fact">
                  <dt>Servicio</dt>
                  <dd>{ticket.service}</dd>
                </div>
              </dl>
              {ticket.status === "esperando" && (
                <p className="queue-ticket-note">
                  {wait
                    ? "Espera orientativa: se recalcula con cada cambio de la fila. El orden de llamada puede variar según el profesional elegido y las citas reservadas."
                    : "La espera se confirmará según la disponibilidad del equipo. El orden de llamada puede variar según el profesional elegido y las citas reservadas."}
                </p>
              )}
            </div>
          )}
        </div>
        {!live.online && live.error && !live.missing ? (
          <p className="notice queue-notice" data-tone="alert" role="status">
            <Icon name="offline" />
            <span>
              Sin conexión con la fila. Tu turno sigue registrado; esta pantalla
              se actualizará al reconectar.
            </span>
          </p>
        ) : live.online && ticket && !closed ? (
          <p className="queue-live" role="status">
            <span className="live-dot" aria-hidden="true" />
            Actualización en vivo
          </p>
        ) : null}
        {notice && (
          <p className="notice queue-notice" role="status">
            {notice}
          </p>
        )}
        <div className="queue-receipt-actions">
          {closed ? (
            <button
              type="button"
              className="button button-accent"
              onClick={backToForm}
            >
              Tomar un turno nuevo <Icon name="ticket" />
            </button>
          ) : (
            <>
              <Link href="/pantalla-turnos" className="button button-outline">
                Ver pantalla de turnos <Icon name="screen" />
              </Link>
              <button type="button" className="text-link" onClick={backToForm}>
                Volver al registro · no cancela el turno
              </button>
            </>
          )}
        </div>
      </section>
    );
  }

  return (
    <form
      className="v4-card v4-form queue-join"
      data-variant={manual ? "manual" : "public"}
      onSubmit={submit}
      aria-labelledby={`${uid}-title`}
    >
      <header className="queue-join-head">
        <p className="eyebrow">
          {manual ? "Recepción · cliente presencial" : "Registro en la fila"}
        </p>
        <h2 id={`${uid}-title`}>
          {manual ? (
            "Registrar turno presencial"
          ) : (
            <>
              Tu siguiente corte <span className="serif">empieza aquí.</span>
            </>
          )}
        </h2>
        <p>
          {manual
            ? "El turno entra en la misma fila que los registros por QR."
            : "Tomar turno no reserva una hora: te da un número, tu posición y una espera estimada."}
        </p>
      </header>
      <div className="queue-join-fields">
        <ContactFields />
        <fieldset className="queue-fieldset">
          <legend>Servicio</legend>
          <div className="queue-options" data-kind="service">
            {services.map((s, index) => (
              <label key={s.id} className="queue-option">
                <input
                  type="radio"
                  name="serviceId"
                  value={s.id}
                  defaultChecked={index === 0}
                  required
                />
                <span className="queue-option-name">{s.name}</span>
                <span className="queue-option-meta">{currency(s.priceCOP)}</span>
              </label>
            ))}
          </div>
          <p className="queue-fieldset-note">Tarifas actuales del establecimiento.</p>
        </fieldset>
        <fieldset className="queue-fieldset">
          <legend>Profesional</legend>
          <div className="queue-options" data-kind="barber">
            {[{ id: "any", name: "Primer disponible" }, ...barbers].map(
              (b) => (
                <label key={b.id} className="queue-option">
                  <input
                    type="radio"
                    name="barberId"
                    value={b.id}
                    defaultChecked={b.id === "any"}
                    required
                  />
                  <span className="queue-option-name">{b.name}</span>
                </label>
              ),
            )}
          </div>
        </fieldset>
        <label className="checkbox-label queue-consent">
          <input type="checkbox" name="consent" required />
          <span>
            {manual
              ? "Confirmo que el cliente autorizó registrar su turno."
              : "Autorizo el uso de mis datos para gestionar este turno. La espera puede cambiar."}
          </span>
        </label>
      </div>
      {error ? (
        <p className="inline-error" role="alert">
          {error}
        </p>
      ) : notice ? (
        <p className="notice queue-notice" role="status">
          <Icon name="check" />
          <span>{notice}</span>
        </p>
      ) : connecting ? (
        <p className="queue-connecting" role="status">
          Conectando con la fila…
        </p>
      ) : !live.online ? (
        <p className="notice queue-notice" data-tone="alert" role="status">
          <Icon name="offline" />
          <span>
            Sin conexión con la fila. No se pueden registrar turnos hasta
            reconectar.
          </span>
        </p>
      ) : null}
      <div className="queue-join-actions">
        <button
          className={`button button-large queue-submit${manual ? "" : " button-accent"}`}
          disabled={!live.online || !catalog || busy}
          aria-busy={busy || undefined}
        >
          {busy ? "Registrando…" : manual ? "Registrar turno" : "Tomar turno"}
          {!busy && <Icon name="ticket" />}
        </button>
        {!manual && (
          <p className="queue-join-foot">
            La pantalla pública solo muestra el número, el profesional y el
            servicio. Nunca tu nombre ni tu teléfono.
          </p>
        )}
      </div>
    </form>
  );
}
