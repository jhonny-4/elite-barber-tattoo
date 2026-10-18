import type { Metadata } from "next";
import Link from "next/link";
import { Header, Footer } from "../../components/shell";
import { JoinForm } from "../../components/queue/join-form";
import { Icon } from "../../components/icons";

export const metadata: Metadata = {
  title: "Turnos",
  description:
    "Toma tu turno en la fila de Elite Barber & Tattoo y sigue tu número en vivo desde el celular o en la pantalla del local.",
};

const steps = [
  {
    title: "Elige",
    text: "Servicio y profesional, o el primer barbero disponible.",
  },
  {
    title: "Recibe tu número",
    text: "Verás tu posición y una espera estimada que se actualiza en vivo.",
  },
  {
    title: "Atento a la pantalla",
    text: "Cuando sea tu turno, tu número aparece en rojo en el monitor del local.",
  },
];

export default function Page() {
  return (
    <>
      <Header />
      <main id="main" className="v4-public-page queue-page">
        <div className="page-intro queue-intro">
          <p className="eyebrow">
            <span className="live-dot" aria-hidden="true" />
            Fila en vivo · Elite
          </p>
          <h1>
            Toma tu turno
            <br />
            <span className="serif">sin perder tu lugar.</span>
          </h1>
          <p>
            Elige servicio y profesional, recibe tu número y sigue la fila en
            vivo. Las citas reservadas conservan su hora.
          </p>
        </div>
        <div className="queue-stage">
          <JoinForm />
        </div>
        <section className="queue-steps" aria-labelledby="queue-steps-title">
          <div className="queue-steps-head">
            <p className="eyebrow">Cómo funciona</p>
            <h2 id="queue-steps-title">
              Tres pasos <span className="serif">y a la silla.</span>
            </h2>
          </div>
          <ol className="queue-steps-list">
            {steps.map((step, index) => (
              <li key={step.title} className="queue-step">
                <span className="queue-step-index" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
          <Link href="/pantalla-turnos" className="text-link">
            Ver la pantalla de turnos <Icon name="arrow" />
          </Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
