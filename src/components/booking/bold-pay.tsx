"use client";
import { useEffect, useRef, useState } from "react";
import type { BoldCheckout } from "../../server/payments/bold";
import { currency } from "../../domain/catalog";
import { Icon } from "../icons";

/**
 * Botón de pago de Bold dentro del marco 3D de Elite. La firma llega calculada por el
 * servidor; aquí solo se monta el script oficial con sus atributos `data-*`.
 */
export function BoldPay({ checkout, email, name }: { checkout: BoldCheckout; email: string; name: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    const script = document.createElement("script");
    script.src = "https://checkout.bold.co/library/boldPaymentButton.js";
    script.async = true;
    const attrs: Record<string, string> = {
      "data-bold-button": "dark-L",
      "data-api-key": checkout.apiKey,
      "data-order-id": checkout.orderId,
      "data-amount": String(checkout.amount),
      "data-currency": checkout.currency,
      "data-integrity-signature": checkout.signature,
      "data-description": checkout.description.slice(0, 100),
      "data-redirection-url": checkout.redirectionUrl,
      "data-customer-data": JSON.stringify({ email, fullName: name }),
    };
    for (const [key, value] of Object.entries(attrs)) script.setAttribute(key, value);
    script.onerror = () => setFailed(true);
    node.replaceChildren(script);
    return () => node.replaceChildren();
  }, [checkout, email, name]);

  return (
    <section className="bold-pay" aria-labelledby="bold-pay-title">
      <p className="eyebrow"><Icon name="lock" /> Pago seguro</p>
      <h3 id="bold-pay-title">Paga tu cita para confirmarla</h3>
      <p className="bold-pay-amount">{currency(checkout.amount)} <small>COP</small></p>
      <p className="bold-pay-note">Tu horario queda apartado unos minutos. La cita se confirma cuando Bold aprueba el pago y te llega el correo.</p>
      <div className="bold-pay-frame bold-pay-live" ref={host} />
      {failed && (
        <p className="inline-error" role="alert">
          No se pudo cargar la pasarela de pago. Revisa tu conexión y vuelve a intentarlo.
        </p>
      )}
    </section>
  );
}

/**
 * Vista del pago en línea mientras Bold no está activo: mismo marco 3D, botón deshabilitado.
 * Se reemplaza solo por <BoldPay/> cuando el servidor entrega un checkout firmado.
 */
export function BoldPayPreview({ amount, active = false }: { amount: number; active?: boolean }) {
  return (
    <section className="bold-pay" aria-labelledby="bold-preview-title">
      <p className="eyebrow"><Icon name="lock" /> Pago en línea</p>
      <h3 id="bold-preview-title">Paga con Bold</h3>
      <p className="bold-pay-amount">{currency(amount)} <small>COP</small></p>
      <p className="bold-pay-note">{active ? "Al confirmar, pagas aquí con tarjeta, PSE o Nequi y tu cita queda asegurada." : "Muy pronto podrás pagar tu cita aquí con tarjeta, PSE o Nequi. Por ahora pagas en el local."}</p>
      <button type="button" className="bold-cta" disabled aria-describedby="bold-preview-title">
        <span className="bold-cta-shine" aria-hidden="true" />
        <span className="bold-cta-label">Pagar con</span>
        <span className="bold-cta-chip">
          {/* Logo oficial de Bold (vector), usado para identificar el medio de pago. */}
          <img src="/media/brand/bold-logo.svg" alt="Bold" width={79} height={28} />
        </span>
        <span className="bold-cta-badge">{active ? "Siguiente paso" : "Próximamente"}</span>
      </button>
      <p className="bold-pay-methods" aria-label="Medios de pago">Tarjeta · PSE · Nequi · Botón Bancolombia</p>
    </section>
  );
}
