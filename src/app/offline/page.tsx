import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "../../components/media";
import { Icon } from "../../components/icons";

export const metadata: Metadata = { title: "Sin conexión" };

export default function Page() {
  return (
    <main id="main" className="system-page" data-kind="offline">
      <section className="system-card" aria-labelledby="system-title">
        <Link
          href="/"
          className="system-brand"
          aria-label="Elite Barber & Tattoo, inicio"
        >
          <Brand title="" />
        </Link>
        <span className="system-icon" aria-hidden="true">
          <Icon name="offline" />
        </span>
        <p className="eyebrow">Sin conexión</p>
        <h1 id="system-title">
          Volvemos
          <br />
          <span className="serif">cuando conectes.</span>
        </h1>
        <p>
          Sin conexión con el servidor no es posible confirmar citas, registrar
          turnos ni guardar cambios. Nada queda pendiente para enviarse después.
        </p>
        <div className="button-row stack-mobile system-actions">
          <Link href="/" className="button">
            Reintentar conexión <Icon name="refresh" />
          </Link>
        </div>
        <p className="system-foot">Elite Barber &amp; Tattoo · Cartagena</p>
      </section>
    </main>
  );
}
