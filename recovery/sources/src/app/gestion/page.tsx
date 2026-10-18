import { Suspense } from "react";
import type { Metadata } from "next";
import { Header } from "../../components/shell";
import { OwnerGate } from "../../components/owner-gate";

// Alias de /administracion: misma entrada y mismo panel.
export const metadata: Metadata = {
  title: "Panel de gestión",
  description:
    "Agenda, fila de turnos, solicitudes de tatuaje y equipo de Elite Barber & Tattoo. Acceso simulado con datos ficticios.",
  robots: { index: false, follow: false },
};

export default function Management() {
  return (
    <>
      <Header />
      <main id="main" className="adm-page">
        <Suspense fallback={<p className="loading-state">Abriendo gestión…</p>}>
          <OwnerGate />
        </Suspense>
      </main>
    </>
  );
}
