import Link from "next/link";
import { EliteSculpture } from "../elite-sculpture";
import { BrandGlyph } from "../brand/logos";
import { Icon } from "../icons";
import { instagramUrl, whatsappUrl } from "../../domain/business";

/**
 * Hero de la portada: escultura 3D del logo como protagonista y composición centrada.
 * La entrada es CSS (funciona sin JavaScript); la salida al hacer scroll la anima
 * `HomeMotion` sobre los contenedores marcados con `data-hero-*`.
 */
export function HomeHero() {
  return (
    <section
      id="inicio"
      className="home-hero grain"
      aria-labelledby="home-hero-title"
      data-home-hero
    >
      <div className="home-hero-backdrop" aria-hidden="true">
        <span className="home-hero-beam" />
        <span className="home-hero-floor" data-hero-floor>
          <span className="home-hero-grid" />
        </span>
        <span className="home-hero-vignette" />
      </div>

      <span className="home-hero-rail home-hero-rail-start" aria-hidden="true">
        Barbería
      </span>
      <span className="home-hero-rail home-hero-rail-end" aria-hidden="true">
        Tatuaje
      </span>

      <div className="home-hero-inner">
        <p className="eyebrow home-eyebrow home-hero-eyebrow">
          Cartagena · Barbería &amp; tatuaje
        </p>

        <div className="home-hero-stage" data-hero-stage>
          <span className="home-hero-halo" aria-hidden="true" data-hero-halo />
          <span className="home-marks home-hero-marks" aria-hidden="true" />
          <div className="home-hero-stage-inner">
            <EliteSculpture />
          </div>
        </div>

        <h1 id="home-hero-title" className="home-hero-title">
          <span className="home-hero-line" data-hero-line="start">
            <span className="home-hero-line-inner">
              Tu estilo<span className="dot">.</span>
            </span>
          </span>{" "}
          <span className="home-hero-line" data-hero-line="end">
            <span className="home-hero-line-inner serif">Tu firma.</span>
          </span>
        </h1>

        <div className="home-hero-copy" data-hero-fade>
          <p className="home-hero-lead">
            Barbería y tatuaje en un mismo lugar.{" "}
            <br />
            Precisión en el corte. Identidad en cada trazo.
          </p>

          <div className="home-hero-actions">
            <div className="home-hero-ctas">
              <Link className="button button-accent" href="/reservar">
                Reserva tu corte <Icon name="arrow" />
              </Link>
              <Link className="button button-outline" href="/tatuaje">
                Quiero un tatuaje <Icon name="arrow" />
              </Link>
            </div>
            <span className="home-hero-divider" aria-hidden="true" />
            <div className="home-hero-social">
              <a
                className="button button-whatsapp button-small"
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="button-glyph">
                  <BrandGlyph name="whatsapp" />
                </span>
                WhatsApp
                <span className="visually-hidden"> (abre otra pestaña)</span>
              </a>
              <a
                className="button button-instagram button-small"
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="button-glyph">
                  <BrandGlyph name="instagram" />
                </span>
                Instagram
                <span className="visually-hidden"> (abre otra pestaña)</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="home-hero-foot">
        <span className="home-hero-foot-label" aria-hidden="true">
          Elite Barber &amp; Tattoo
        </span>
        <a className="home-hero-scroll" href="#universo">
          <span className="home-hero-scroll-label">Descubre Elite</span>
          <span className="visually-hidden">: ir a Quiénes somos</span>
          <span className="home-hero-scroll-track" aria-hidden="true" />
        </a>
        <span className="home-hero-foot-label" aria-hidden="true">
          Los Ejecutivos · Cartagena
        </span>
      </div>
    </section>
  );
}
