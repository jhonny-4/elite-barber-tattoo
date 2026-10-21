import type { Metadata } from "next";
import { Header } from "../../components/shell";
import { StaffPanel } from "../../components/auth/staff-panel";
import { requireStaff } from "../../server/auth/staff";

export const metadata: Metadata = {
  title: "Panel administrativo",
  description: "Agenda, fila de turnos, solicitudes de tatuaje y equipo de Elite Barber & Tattoo.",
  robots: { index: false, follow: false },
};

export default async function Administration() {
  await requireStaff("/administracion", { owner: true });
  return (
    <>
      <Header />
      <main id="main" className="adm-page">
        <StaffPanel barberView={false} />
      </main>
    </>
  );
}
