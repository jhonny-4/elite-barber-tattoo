import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Header, Footer } from "../../components/shell";
import { BookingFlow } from "../../components/booking-flow";
export const metadata: Metadata = {
  title: "Reserva tu espacio · Agenda demo | Elite",
};
export default function BookingPage() {
  return (
    <>
      <Header />
      <main className="flow-page" id="main">
        <div className="page-intro">
          <Link className="back-link" href="/">
            ← Volver al universo Elite
          </Link>
          <p className="eyebrow">BARBERÍA / RESERVAS</p>
          <h1>
            Tu estilo.
            <br />
            <span className="serif">Tu momento.</span>
          </h1>
          <p>Elige la experiencia. Nosotros ponemos el detalle.</p>
        </div>
        <Suspense
          fallback={<p className="loading-state">Preparando tu experiencia…</p>}
        >
          <BookingFlow />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
