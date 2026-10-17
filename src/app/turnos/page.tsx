import type { Metadata } from "next";
import { Header, Footer } from "../../components/shell";
import { JoinForm } from "../../components/queue/join-form";
export const metadata: Metadata = { title: "Turnos QR · Demo | Elite" };
export default function Page() {
  return (
    <>
      <Header />
      <main id="main" className="v4-public-page">
        <div className="page-intro">
          <p className="eyebrow">ELITE / FILA EN VIVO</p>
          <h1>
            Un número.
            <br />
            <span className="serif">Tu próxima versión.</span>
          </h1>
          <p>
            La misma fila para QR y recepción. Las citas reservadas conservan su
            espacio.
          </p>
        </div>
        <JoinForm />
      </main>
      <Footer />
    </>
  );
}
