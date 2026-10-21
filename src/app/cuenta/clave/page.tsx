import type { Metadata } from "next";
import { Header } from "../../../components/shell";
import { PasswordForm } from "../../../components/auth/password-form";
import { requireStaff } from "../../../server/auth/staff";

export const metadata: Metadata = { title: "Crear contraseña", robots: { index: false, follow: false } };

export default async function SetPassword() {
  await requireStaff("/cuenta/clave");
  return (
    <>
      <Header />
      <main id="main" className="adm-page">
        <div className="adm-gate-stage">
          <section className="adm-gate elite-login" aria-label="Crear contraseña">
            <PasswordForm />
          </section>
        </div>
      </main>
    </>
  );
}
