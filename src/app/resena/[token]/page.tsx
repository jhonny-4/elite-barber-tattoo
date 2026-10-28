import type { Metadata } from "next";
import Link from "next/link";
import { Header, Footer } from "../../../components/shell";
import { StarInput } from "../../../components/reviews/star-input";
import { reviewTarget, firstName } from "../../../server/reviews";
import { submitReview } from "./actions";

export const metadata: Metadata = { title: "Califica tu visita", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ReviewPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ gracias?: string }> }) {
  const [{ token }, { gracias }] = await Promise.all([params, searchParams]);
  const target = await reviewTarget(token);
  const google = process.env.GOOGLE_REVIEW_URL;
  const done = target?.review ?? null;
  return (
    <>
      <Header />
      <main className="flow-page rv-page">
        <section className="success-panel rv-panel">
          <p className="eyebrow">Elite Barber &amp; Tattoo</p>
          {!target ? (
            <>
              <h1>No encontramos esta cita</h1>
              <p>Revisa el enlace del correo o escríbenos por WhatsApp.</p>
            </>
          ) : done || gracias ? (
            <>
              <h1>Gracias{target ? `, ${firstName(target.customer)}` : ""}.</h1>
              <p>Tu reseña llegó a Elite. La publicamos después de revisarla.</p>
              {done && done.rating >= 4 && google && /^https:\/\//.test(google) && (
                <a className="button button-accent" href={google} target="_blank" rel="noopener noreferrer">
                  Compártela también en Google ★
                </a>
              )}
            </>
          ) : !target.finished ? (
            <>
              <h1>Aún no puedes calificar</h1>
              <p>La reseña se habilita cuando tu cita con {target.barber} termina.</p>
            </>
          ) : (
            <>
              <h1>
                ¿Cómo te fue con <span className="serif">{target.barber}?</span>
              </h1>
              <p>Tu opinión ayuda a otros a elegir. Toma menos de un minuto.</p>
              <form action={submitReview} className="rv-form">
                <input type="hidden" name="token" value={token} />
                <StarInput />
                <label className="rv-comment">
                  Cuéntanos más (opcional)
                  <textarea name="comment" maxLength={400} rows={4} placeholder="El corte, la atención, el ambiente…" />
                </label>
                <button className="button button-accent" type="submit">Enviar reseña</button>
              </form>
            </>
          )}
          <Link className="button button-outline" href="/">Volver al inicio</Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
