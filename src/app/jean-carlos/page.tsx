import Link from "next/link";
import type { Metadata } from "next";
import { Header, Footer } from "../../components/shell";
import { SectionBrand } from "../../components/media";
import { ArtistMonogram } from "../../components/artist-monogram";
import { Icon } from "../../components/icons";
import { Gallery } from "../../components/gallery";
import { Reveal } from "../../components/reveal";
export const metadata: Metadata = { title: "Jean Carlos · El artista | Elite" };
export default function Artist() {
  return (
    <>
      <Header />
      <main id="main">
        <section className="section artist-page-hero">
          <div>
            <Link className="back-link" href="/">
              ← El universo Elite
            </Link>
            <p className="eyebrow">ARTISTA RESIDENTE / ELITE BARBER & TATTOO</p>
            <SectionBrand />
            <h1>
              Jean
              <br />
              <span className="serif lime-text">Carlos.</span>
            </h1>
            <p className="lead">
              Una idea tuya.
              <br />
              Un trazo que la hace única.
            </p>
            <p className="muted">
              El portafolio artístico de Jean Carlos forma parte de Elite, en el
              mismo local de Cartagena.
            </p>
            <Link href="/tatuaje" className="button">
              Cuéntame tu idea <Icon name="arrow" />
            </Link>
            <a
              className="text-link artist-social"
              href="https://www.instagram.com/jeancarlostattoo19/"
              target="_blank"
              rel="noreferrer"
            >
              @jeancarlostattoo19 ↗
            </a>
          </div>
          <div className="artist-page-art">
            <ArtistMonogram />
            <span className="eyebrow">DEL CONCEPTO A LA PIEL.</span>
          </div>
        </section>
        <section className="section process-section">
          <p className="eyebrow">ASÍ EMPIEZA TU PROYECTO</p>
          <div className="process-grid">
            {[
              [
                "01",
                "La idea",
                "Comparte el diseño que imaginas, su tamaño y la zona del cuerpo.",
              ],
              [
                "02",
                "La valoración",
                "Jean Carlos revisará el alcance y preparará una cotización.",
              ],
              [
                "03",
                "El encuentro",
                "Después de acordar el proyecto se definirá una fecha para tu sesión.",
              ],
            ].map(([n, title, text]) => (
              <article data-reveal key={n}>
                <span className="process-number">{n}</span>
                <h2>{title}</h2>
                <p>{text}</p>
              </article>
            ))}
          </div>
          <p className="form-disclaimer">
            En el prototipo, los cambios de estado se simulan desde el panel. No
            hay valoración ni citas reales.
          </p>
        </section>
        <Gallery tattooOnly />
      </main>
      <Footer />
      <Reveal />
    </>
  );
}
