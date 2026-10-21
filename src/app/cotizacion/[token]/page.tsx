import type { Metadata } from "next";
import Link from "next/link";
import { whatsappUrl } from "../../../domain/business";
import { currency } from "../../../domain/catalog";
import { adminClient } from "../../../server/supabase/clients";
import { hashQuoteToken, validQuoteToken } from "../../../server/tattoo-quote";
import { BoldPayPreview } from "../../../components/booking/bold-pay";
import { Footer, Header } from "../../../components/shell";

export const metadata: Metadata = { title: "Tu cotización", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** Cotización privada de un tatuaje: se llega con el enlace del correo; solo se guarda su hash. */
export default async function QuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { data } = validQuoteToken(token)
    ? await adminClient()
        .from("tattoo_requests")
        .select("customer_name,idea,placement,size,status,quote_cop,deposit_cop,quote_notes")
        .eq("quote_token_hash", hashQuoteToken(token))
        .in("status", ["cotizada", "fecha_acordada"])
        .maybeSingle()
    : { data: null };
  const quote = data && data.quote_cop !== null ? { ...data, quote_cop: data.quote_cop } : null;
  const first = quote?.customer_name.trim().split(/\s+/)[0] ?? "";
  const deposit = quote?.deposit_cop ?? 0;
  const message = quote
    ? `Hola Elite, soy ${quote.customer_name}. Acepto la cotización de mi tatuaje (${currency(quote.quote_cop)} COP) y quiero agendar mi sesión.`
    : "";

  return (
    <>
      <Header />
      <main id="main" className="flow-page booking-page">
        <section className="success-panel bk-success quote-page" aria-labelledby="quote-title">
          <p className="eyebrow">Cotización de tatuaje</p>
          {quote ? (
            <>
              <h1 id="quote-title">{first ? `${first}, esta es tu cotización` : "Tu cotización"}</h1>
              <p className="quote-lead">Jean Carlos revisó tu idea. Si estás de acuerdo, agenda tu sesión por WhatsApp.</p>
              <dl className="quote-figures">
                <div>
                  <dt>Valor del tatuaje</dt>
                  <dd>
                    {currency(quote.quote_cop)} <small>COP</small>
                  </dd>
                </div>
                <div>
                  <dt>Abono para apartar</dt>
                  <dd>
                    {currency(deposit)} <small>COP</small>
                  </dd>
                </div>
              </dl>
              <dl className="bk-summary-list">
                <div>
                  <dt>Tu idea</dt>
                  <dd>{quote.idea}</dd>
                </div>
                {quote.placement ? (
                  <div>
                    <dt>Zona</dt>
                    <dd>{quote.placement}</dd>
                  </div>
                ) : null}
                {quote.size ? (
                  <div>
                    <dt>Tamaño</dt>
                    <dd>{quote.size}</dd>
                  </div>
                ) : null}
                {quote.quote_notes ? (
                  <div>
                    <dt>Notas de Jean Carlos</dt>
                    <dd className="quote-notes">{quote.quote_notes}</dd>
                  </div>
                ) : null}
              </dl>
              <a className="button" href={`${whatsappUrl}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">
                Aceptar y agendar por WhatsApp
                <span className="visually-hidden"> (abre otra pestaña)</span>
              </a>
              {deposit > 0 ? <BoldPayPreview amount={deposit} /> : null}
              <p className="quote-fine">El abono se coordina por WhatsApp hasta que el pago en línea esté activo. La cotización no agenda la sesión por sí sola.</p>
            </>
          ) : (
            <>
              <h1 id="quote-title">No encontramos esta cotización</h1>
              <p>El enlace pudo cambiar si Jean Carlos la actualizó. Revisa tu correo más reciente o escríbenos por WhatsApp.</p>
              <a className="button" href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                Escribir por WhatsApp
              </a>
            </>
          )}
          <Link className="button button-outline" href="/">
            Volver al inicio
          </Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
