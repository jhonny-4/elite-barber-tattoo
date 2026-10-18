import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Header, Footer } from "../../components/shell";
import { BookingFlow } from "../../components/booking-flow";

export const metadata: Metadata = {
  title: "Reservar",
  description:
    "Reserva tu corte en Elite Barber & Tattoo, Cartagena: elige servicio, profesional, fecha y hora en cuatro pasos.",
};

export default function BookingPage() {
  return (
    <>
      <Header />
      <main className="flow-page booking-page" id="main">
        <div className="page-intro">
          <Link className="back-link" href="/">
            ← Volver al inicio
          </Link>
          <p className="eyebrow">Barbería · Reserva en línea</p>
          <h1>
            Tu estilo.
            <br />
            <span className="serif">Tu momento.</span>
          </h1>
          <p>
            Elige servicio, profesional y hora en cuatro pasos. Antes de
            confirmar verás el resumen completo de tu cita.
          </p>
        </div>
        {/* useSearchParams (servicio, profesional, origen) exige un límite de Suspense. */}
        <Suspense
          fallback={<p className="loading-state">Preparando la agenda…</p>}
        >
          <BookingFlow />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
