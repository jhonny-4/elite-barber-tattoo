import type { Metadata } from "next";
import { Header } from "../../components/shell";
import { StaffPanel } from "../../components/auth/staff-panel";
import { requireStaff } from "../../server/auth/staff";

export const metadata: Metadata = {
  title: "Vista de barbero",
  description: "Agenda y fila de cada profesional de Elite Barber & Tattoo.",
  robots: { index: false, follow: false },
};

export default async function BarberPage() {
  await requireStaff("/barbero");
  return (
    <>
      <Header />
      <main id="main" className="adm-page">
        <StaffPanel barberView />
      </main>
    </>
  );
}
