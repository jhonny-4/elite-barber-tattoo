import type { Metadata } from "next";
import Link from "next/link";
import { Header, Footer } from "../components/shell";
import { Brand } from "../components/media";
import { Icon } from "../components/icons";

export const metadata: Metadata = {
  title: { absolute: "Página no encontrada · Elite Barber & Tattoo" },
};

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="system-page" data-kind="not-found" id="main">
        <span className="system-backdrop" aria-hidden="true">
          404
        </span>
        <section className="system-card" aria-labelledby="system-title">
          <Brand className="system-mark" />
          <p className="eyebrow">Error 404 · Fuera del trazo</p>
          <h1 id="system-title">
            Este camino
            <br />
            <span className="serif">aún no existe.</span>
          </h1>
          <p>
            La página que buscas no está aquí o cambió de lugar. Vuelve al
            inicio o reserva tu próximo corte.
          </p>
          <div className="button-row stack-mobile system-actions">
            <Link className="button" href="/">
              Volver al inicio <Icon name="arrow" />
            </Link>
            <Link className="button button-outline" href="/reservar">
              Reservar cita
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
