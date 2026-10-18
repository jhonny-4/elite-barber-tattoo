import { Icon } from "./icons";
import {
  businessAddress,
  businessName,
  directionsUrl,
  mapEmbedUrl,
  mapsUrl,
} from "../domain/business";

/**
 * Ubicación con mapa integrado. El iframe se carga en diferido (`loading="lazy"`)
 * y la búsqueda es por dirección: referencia provisional, no un pin verificado
 * (se reemplaza solo en `src/domain/business.ts`).
 */
export function LocationMap() {
  return (
    <section
      className="section home-location"
      id="ubicacion"
      aria-labelledby="ubicacion-title"
    >
      <header className="section-heading home-heading" data-anim="heading">
        <p className="eyebrow home-eyebrow">Ubicación</p>
        <h2 id="ubicacion-title" data-split>
          Encuéntranos
          <br />
          <span className="serif">en Chiquinquirá.</span>
        </h2>
      </header>

      <div className="home-location-panel" data-anim="rise">
        <div className="home-location-card">
          <span className="home-location-pin" aria-hidden="true">
            <Icon name="pin" />
          </span>
          <p className="home-location-name">{businessName}</p>
          <address className="home-location-address">{businessAddress}.</address>
          <div className="button-row home-location-actions">
            <a
              className="button"
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Cómo llegar <Icon name="arrow" />
              <span className="visually-hidden"> (abre otra pestaña)</span>
            </a>
            <a
              className="text-link"
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir en Google Maps <Icon name="arrow" />
              <span className="visually-hidden"> (abre otra pestaña)</span>
            </a>
          </div>
        </div>

        <figure className="home-location-frame">
          <span className="home-marks home-location-marks" aria-hidden="true" />
          <div className="home-location-map">
            <iframe
              src={mapEmbedUrl}
              title="Mapa de Elite Barber & Tattoo en Cartagena"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
          <figcaption className="home-location-note">
            Mapa de referencia por dirección. Si no carga, usa «Abrir en Google
            Maps».
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
