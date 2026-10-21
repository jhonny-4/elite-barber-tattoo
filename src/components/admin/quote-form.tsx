"use client";
import { useId, useState } from "react";
import type { TattooRequest } from "../../domain/demo";
import { Icon } from "../icons";
import { panelFetch } from "./panel-api";

const digits = (value: string) => Number(value.replace(/\D/g, "") || 0);

/**
 * Cotización manual de un tatuaje: monto y abono en pesos enteros más notas. Al guardar, el servidor
 * pasa la solicitud a «cotizada» y envía al cliente el enlace privado por correo.
 */
export function QuoteForm({ request, refresh }: { request: TattooRequest; refresh?: () => Promise<unknown> }) {
  const id = useId();
  const resend = request.status === "cotizada";
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(request.quote ? String(request.quote.amount) : "");
  const [deposit, setDeposit] = useState(request.quote ? String(request.quote.deposit) : "");
  const [notes, setNotes] = useState(request.quote?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "alert"; text: string } | null>(null);
  const quote = digits(amount);
  const down = digits(deposit);
  const invalid = quote < 1000 ? "El monto mínimo es $1.000." : down > quote ? "El abono no puede superar la cotización." : "";

  async function submit() {
    setBusy(true);
    setMessage(null);
    try {
      const result = await panelFetch<{ emailSent: boolean }>("/api/panel/cotizacion", { method: "POST", body: { id: request.id, quote, deposit: down, notes } });
      setMessage({
        tone: result.emailSent ? "ok" : "alert",
        text: result.emailSent
          ? "Cotización guardada y enviada por correo al cliente."
          : "Cotización guardada, pero el correo no salió (revisa Resend). Reintenta con «Actualizar y reenviar».",
      });
      setOpen(false);
      await refresh?.();
    } catch (e) {
      setMessage({ tone: "alert", text: e instanceof Error ? e.message : "No se pudo guardar la cotización." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pnl-quote">
      {!open ? (
        <button type="button" className={resend ? "button button-outline button-small" : "button button-accent button-small"} aria-expanded="false" aria-controls={`${id}-f`} onClick={() => setOpen(true)}>
          <Icon name="mail" />
          {resend ? "Actualizar y reenviar cotización" : "Escribir cotización"}
        </button>
      ) : (
        <form
          id={`${id}-f`}
          className="pnl-quote-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!invalid) void submit();
          }}
        >
          <label>
            Cotización (COP)
            <input inputMode="numeric" required autoComplete="off" value={amount} aria-describedby={`${id}-e`} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} placeholder="350000" />
            <small>{quote ? `$${quote.toLocaleString("es-CO")}` : "Pesos enteros"}</small>
          </label>
          <label>
            Abono para apartar (COP)
            <input inputMode="numeric" required autoComplete="off" value={deposit} aria-describedby={`${id}-e`} onChange={(e) => setDeposit(e.target.value.replace(/\D/g, ""))} placeholder="100000" />
            <small>{down ? `$${down.toLocaleString("es-CO")}` : "Puede ser 0"}</small>
          </label>
          <label className="pnl-quote-wide">
            Notas para el cliente
            <textarea rows={3} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Sesiones estimadas, cuidados, qué incluye…" />
          </label>
          {invalid && (amount || deposit) ? (
            <p id={`${id}-e`} className="pnl-note pnl-quote-wide" data-tone="alert" role="alert">
              <Icon name="alert" />
              {invalid}
            </p>
          ) : (
            <span id={`${id}-e`} />
          )}
          <div className="pnl-quote-wide pnl-quote-buttons">
            <button type="button" className="button button-outline button-small" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="button button-accent button-small" disabled={busy || Boolean(invalid)} aria-busy={busy || undefined}>
              <Icon name="mail" />
              Guardar y enviar al cliente
            </button>
          </div>
        </form>
      )}
      {message ? (
        <p className="pnl-note" data-tone={message.tone} role={message.tone === "alert" ? "alert" : "status"}>
          <Icon name={message.tone === "ok" ? "check" : "alert"} />
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
