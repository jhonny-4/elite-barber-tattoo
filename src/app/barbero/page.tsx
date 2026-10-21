import type { Metadata } from "next";
import { Header } from "../../components/shell";
import { StaffPanel } from "../../components/auth/staff-panel";
import { requireStaff } from "../../server/auth/staff";
import { sessionClient } from "../../server/supabase/clients";

export const metadata: Metadata = {
  title: "Vista de barbero",
  description: "Agenda y fila de cada profesional de Elite Barber & Tattoo.",
  robots: { index: false, follow: false },
};

export default async function BarberPage() {
  const staff = await requireStaff("/barbero");
  // El barbero queda fijo a su ficha; el dueño puede revisar a cualquiera.
  let slug: string | null = null;
  if (staff.role === "barbero" && staff.barberId) {
    const { data } = await (await sessionClient()).from("barbers").select("slug").eq("id", staff.barberId).maybeSingle();
    slug = data?.slug ?? null;
  }
  return (
    <>
      <Header />
      <main id="main" className="adm-page">
        <StaffPanel barberView barberSlug={slug} />
      </main>
    </>
  );
}
