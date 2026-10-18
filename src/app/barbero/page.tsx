import { Suspense } from "react";
import type { Metadata } from "next";
import { Header } from "../../components/shell";
import { OwnerGate } from "../../components/owner-gate";

export const metadata: Metadata = {
  title: "Vista de barbero",
  description:
    "Agenda y fila de cada profesional de Elite Barber & Tattoo para la tablet del puesto. Acceso simulado con datos ficticios.",
  robots: { index: false, follow: false },
};

export default function BarberPage() {
  return (
    <>
      <Header />
      <main id="main" className="adm-page">
        <Suspense fallback={<p className="loading-state">Preparando jornada…</p>}>
          <OwnerGate professionalView />
        </Suspense>
      </main>
    </>
  );
}
