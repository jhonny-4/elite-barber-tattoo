import type { Metadata } from "next";
import Link from "next/link";
import { Header, Footer } from "../../components/shell";
import { TattooForm } from "../../components/tattoo-form";

export const metadata: Metadata = {
  title: "Solicitar tatuaje",
  description:
    "Solicita la valoración de tu tatuaje con Jean Carlos en Elite Barber & Tattoo, Cartagena. Cada diseño se cotiza después de revisarlo.",
};

export default function TattooPage() {
  return (
    <>
      <Header />
      <main className="flow-page tattoo-page" id="main">
        <div className="page-intro">
          <Link className="back-link" href="/jean-carlos">
            ← Conoce a Jean Carlos
          </Link>
          <p className="eyebrow">Tatuaje · Solicitud de valoración</p>
          <h1>
            Una historia.
            <br />
            <span className="serif">Tu piel.</span>
          </h1>
          <p>
            Cuéntanos tu idea y Jean Carlos la valorará. No es una cita: primero
            se revisa el diseño, luego se cotiza y la fecha se acuerda contigo.
          </p>
        </div>
        <TattooForm />
      </main>
      <Footer />
    </>
  );
}
