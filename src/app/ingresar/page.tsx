import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Header } from "../../components/shell";
import { LoginForm } from "../../components/auth/login-form";
import { getStaff } from "../../server/auth/staff";

export const metadata: Metadata = {
  title: "Acceso del equipo",
  robots: { index: false, follow: false },
};

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const staff = await getStaff();
  if (staff) redirect(staff.role === "dueno" ? "/administracion" : "/barbero");
  return (
    <>
      <Header />
      <main id="main" className="adm-page">
        <div className="adm-gate-stage">
          <section className="adm-gate" aria-label="Ingreso del equipo">
            <LoginForm next={params.next ?? "/administracion"} linkError={params.error === "enlace"} />
          </section>
        </div>
      </main>
    </>
  );
}
