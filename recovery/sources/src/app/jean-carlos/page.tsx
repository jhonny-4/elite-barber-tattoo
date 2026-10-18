import Link from "next/link";
import type { Metadata } from "next";
import { Header, Footer } from "../../components/shell";
import { Brand } from "../../components/media";
import { BrandGlyph, JCMonogram } from "../../components/brand/logos";
import { ArtistMonogram } from "../../components/artist-monogram";
import { Icon } from "../../components/icons";
import { Gallery } from "../../components/gallery";
import { Reveal } from "../../components/reveal";
import {
  artistInstagramHandle,
  artistInstagramUrl,
} from "../../domain/business";

export const metadata: Metadata = {
  title: "Jean Carlos · Tatuaje",
  description:
    "Jean Carlos, tatuador y dueño de Elite Barber & Tattoo, en el mismo local de Chiquinquirá, Cartagena. Comparte tu idea y solicita la valoración de tu tatuaje.",
};

const steps = [
  {
    title: "Comparte tu idea",
    text: "Cuéntale qué quieres tatuarte, el tamaño aproximado y la zona del cuerpo. Si tienes una referencia, puedes adjuntarla.",
  },
  {
    title: "Evaluación del artista",
    text: "Jean Carlos revisa tu propuesta y valora el diseño, el tamaño y la zona antes de comprometer nada.",
  },
  {
    title: "Cotización personalizada",
    text: "Recibes un precio según tu diseño. No hay tarifas fijas: cada tatuaje se cotiza a medida.",
  },
  {
    title: "Fecha acordada",
    text: "Con la cotización aceptada, acuerdan juntos el día de tu sesión en el local de Elite.",
  },
];

export default function JeanCarlosPage() {
  return (
    <>
      <Header />
      <main id="main" className="artist-page">
        <section className="artist-hero" aria-labelledby="artist-title">
          <p className="eyebrow">Tatuaje · Elite Barber &amp; Tattoo</p>

          <div className="artist-hero-stage">
            <h1 id="artist-title" className="artist-hero-title">
              <span className="artist-hero-first">Jean</span>
              <span className="serif artist-hero-last">
                Carlos<span className="dot">.</span>
              </span>
            </h1>
            <div className="artist-hero-mark">
              <ArtistMonogram label={false} />
            </div>
          </div>

          <div className="artist-hero-copy">
            <p className="artist-hero-role">
              Tatuador y dueño de <strong>Elite Barber &amp; Tattoo</strong>.
            </p>
            <p className="lead">
              Tatúa en el mismo local de la barbería, en Chiquinquirá,
              Cartagena. Cada proyecto se valora y se cotiza de forma personal.
            </p>
          </div>

          <div className="button-row stack-mobile artist-hero-actions">
            <Link className="button button-accent" href="/tatuaje">
              Solicitar valoración <Icon name="arrow" />
            </Link>
            <a
              className="button button-instagram"
              href={artistInstagramUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="button-glyph">
                <BrandGlyph name="instagram" />
              </span>
              <span className="button-label">
                Instagram
                <small>{artistInstagramHandle}</small>
              </span>
              <span className="visually-hidden"> (abre otra pestaña)</span>
            </a>
          </div>

          <div className="artist-lockup">
            <div className="artist-lockup-marks">
              <Brand title="Elite Barber & Tattoo" />
              <span className="artist-lockup-rule" aria-hidden="true" />
              <JCMonogram
                className="artist-lockup-jc"
                title="Monograma JC de Jean Carlos"
              />
            </div>
            <p>Barbería y tatuaje · un solo local en Cartagena</p>
          </div>

          <a className="text-link artist-hero-scroll" href="#portafolio">
            Ver portafolio <Icon name="chevron" />
          </a>
        </section>

        <Gallery tattooOnly id="portafolio" />

        <section
          className="section artist-process"
          aria-labelledby="artist-process-title"
        >
          <header className="section-heading" data-reveal>
            <p className="eyebrow">Así empieza tu tatuaje</p>
            <h2 id="artist-process-title">
              De la idea
              <br />
              <span className="serif">
                a la piel<span className="dot">.</span>
              </span>
            </h2>
            <p className="section-note">
              Cada tatuaje requiere valoración y cotización manual. No hay
              precios fijos ni confirmaciones automáticas.
            </p>
          </header>

          <ol className="artist-steps">
            {steps.map((item, index) => (
              <li className="artist-step" key={item.title} data-reveal>
                <span className="artist-step-number" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3>
                  <span className="visually-hidden">{`Paso ${index + 1}: `}</span>
                  {item.title}
                </h3>
                <p>{item.text}</p>
              </li>
            ))}
          </ol>

          <div className="button-row artist-process-actions" data-reveal>
            <Link className="button button-accent button-large" href="/tatuaje">
              Solicitar valoración <Icon name="arrow" />
            </Link>
          </div>
          <p className="artist-process-note">
            Versión de presentación: el seguimiento de la solicitud y los avisos
            se simulan desde el panel del local.
          </p>
        </section>
      </main>
      <Footer />
      <Reveal />
    </>
  );
}
