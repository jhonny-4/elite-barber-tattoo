import { Icon } from "./icons";
import {
  businessAddress,
  directionsUrl,
  mapEmbedUrl,
  mapsUrl,
} from "../domain/business";

export function LocationMap() {
  return (
    <section
      className="section location-section"
      id="ubicacion"
      aria-labelledby="ubicacion-title"
      data-reveal
    >
      <div className="location-heading">
        <p className="eyebrow">06 / UBICACIÓN</p>
        <h2 id="ubicacion-title">
          Encuéntranos
          <br />
          <span className="serif">en Chiquinquirá.</span>
        </h2>
        <address>{businessAddress}.</address>
        <div className="location-actions">
          <a
            className="button"
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Cómo llegar <Icon name="arrow" />
          </a>
          <a
            className="text-link"
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir en Google Maps <Icon name="arrow" />
          </a>
        </div>
      </div>
      <figure className="location-frame">
        <iframe
          src={mapEmbedUrl}
          title="Mapa de Elite Barber & Tattoo en Cartagena"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
        <figcaption className="location-note">
          Mapa de referencia por dirección. Si no carga, usa «Abrir en Google
          Maps».
        </figcaption>
      </figure>
    </section>
  );
}
