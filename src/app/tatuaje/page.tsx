import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Header, Footer } from "../../components/shell";
import { TattooForm } from "../../components/tattoo-form";
import { JCMark } from "../../components/media";
export const metadata: Metadata = {
  title: "Tu próxima historia · Solicitud de tatuaje | Elite",
};
export default function TattooPage() {
  return (
    <>
      <Header />
      <main className="flow-page" id="main">
        <div className="page-intro">
          <Link className="back-link" href="/jean-carlos">
            ← Conoce a Jean Carlos
          </Link>
          <p className="eyebrow">TATTOO / SOLICITUD DE VALORACIÓN</p>
          <h1>
            Una historia.
            <br />
            <span className="serif">Tu piel.</span>
          </h1>
          <p>Jean Carlos · Elite Barber & Tattoo · Cartagena</p>
        </div>
        <div className="tattoo-layout">
          <Suspense fallback={<p>Preparando formulario…</p>}>
            <TattooForm />
          </Suspense>
          <aside className="tattoo-aside">
            <div className="tattoo-mark-panel">
              <JCMark />
              <span className="eyebrow">ARTE CON IDENTIDAD</span>
            </div>
            <div className="tattoo-next">
              <h3>¿Qué pasa después?</h3>
              {[
                ["01", "Comparte tu idea"],
                ["02", "Evaluación del artista"],
                ["03", "Cotización personalizada"],
                ["04", "Fecha acordada contigo"],
              ].map(([n, t]) => (
                <p key={n}>
                  <span>{n}</span>
                  {t}
                </p>
              ))}
              <small>
                En esta demo puedes explorar estos estados desde el panel de
                gestión.
              </small>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
