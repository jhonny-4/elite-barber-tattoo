import Link from "next/link";
import { ArtistMonogram } from "../artist-monogram";
import { BrandGlyph } from "../brand/logos";
import { Icon } from "../icons";
import {
  artistInstagramHandle,
  artistInstagramUrl,
} from "../../domain/business";

export function HomeArtist() {
  return (
    <section
      className="section home-artist grain"
      aria-labelledby="home-artist-title"
    >
      <span className="home-artist-beam" aria-hidden="true" />

      <div className="home-artist-stage" data-artist-stage>
        <span className="home-artist-glow" aria-hidden="true" />
        <span className="home-marks home-artist-marks" aria-hidden="true" />
        <ArtistMonogram />
      </div>

      <div className="home-artist-copy" data-anim="heading">
        <p className="eyebrow home-eyebrow">El artista de Elite</p>
        <h2 id="home-artist-title" data-split>
          Jean
          <br />
          <span className="serif">
            Carlos<span className="dot">.</span>
          </span>
        </h2>
        <p className="home-artist-lead">
          Tatuador y dueño de Elite. Su trabajo de tatuaje vive en el mismo
          local de la barbería, en Cartagena.
        </p>
        <p className="home-artist-text">
          Cada proyecto comienza con una conversación: la idea, la zona y los
          detalles que lo hacen tuyo. Después llegan la valoración y la
          cotización según el diseño.
        </p>
        <div className="button-row home-artist-actions">
          <Link className="button" href="/jean-carlos">
            Conoce al artista <Icon name="arrow" />
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
              Portafolio
              <small>{artistInstagramHandle}</small>
            </span>
            <span className="visually-hidden"> en Instagram (abre otra pestaña)</span>
          </a>
        </div>
      </div>
    </section>
  );
}
