import { Suspense } from "react";
import type { Metadata } from "next";
import { Header } from "../../components/shell";
import { OwnerGate } from "../../components/owner-gate";

export const metadata: Metadata = {
  title: "Panel de gestión",
  description:
    "Agenda, fila de turnos, solicitudes de tatuaje y equipo de Elite Barber & Tattoo. Acceso simulado con datos ficticios.",
  robots: { index: false, follow: false },
};

export default function Administration() {
  return (
    <>
      <Header />
      <main id="main" className="adm-page">
        <Suspense fallback={<p className="loading-state">Preparando panel…</p>}>
          <OwnerGate />
        </Suspense>
      </main>
    </>
  );
}
