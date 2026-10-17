import Link from "next/link";
import { Header, Footer } from "../components/shell";
import { Icon } from "../components/icons";
import { Photo, JCMark } from "../components/media";
import { ChromeObject } from "../components/chrome-object";
import { Gallery } from "../components/gallery";
import { Reveal } from "../components/reveal";
import { portfolio } from "../domain/media";
import { services, currency, barbers } from "../domain/catalog";
export default function Home() {
  return (
    <>
      <Header />
      <main id="main">
        <section className="hero">
          <div className="hero-gridlines" aria-hidden="true" />
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="live-dot" /> CARTAGENA · BARBER & TATTOO
            </p>
            <h1>
              EL ESTILO
              <br />
              SE LLEVA.
              <br />
              <span className="outline-text">EL ARTE</span>
              <br />
              <span className="lime-text">SE QUEDA.</span>
            </h1>
            <p className="hero-description">
              Hay formas de cambiar tu look.
              <br />Y formas de contar quién eres.
              <br />
              <strong>Encuentra la tuya en Elite.</strong>
            </p>
            <div className="hero-actions">
              <Link className="button" href="/reservar">
                Reserva tu corte <Icon name="arrow" />
              </Link>
              <Link className="text-link" href="/tatuaje">
                Quiero un tatuaje <Icon name="arrow" />
              </Link>
            </div>
          </div>
          <div className="hero-art">
            <div className="art-coordinate">ELITE / EXPRESIÓN SIN LÍMITES</div>
            <ChromeObject />
            <div className="hero-photo">
              <Photo item={portfolio[0]} priority />
              <div className="photo-shade" />
              <span className="photo-caption">EL ARTE DE HACERLO TUYO.</span>
            </div>
            <div className="hero-small-photo">
              <Photo item={portfolio[2]} priority />
              <span>JC / TATTOO</span>
            </div>
            <div className="rotating-seal" aria-hidden="true">
              <span>PRECISIÓN</span>
              <Icon name="spark" />
              <span>CON CARÁCTER</span>
            </div>
            <div className="hero-art-footer">
              <span>01 — EL UNIVERSO ELITE</span>
              <span>DESLIZA PARA DESCUBRIR ↓</span>
            </div>
          </div>
        </section>
        <div className="marquee" aria-hidden="true">
          <div>
            {Array.from({ length: 4 }, (_, i) => (
              <span key={i}>
                BARBERÍA <b>✳</b> TATUAJE <b>✳</b> IDENTIDAD <b>✳</b> ELITE{" "}
                <b>✳</b>{" "}
              </span>
            ))}
          </div>
        </div>
        <section className="section universe" id="universo">
          <div className="section-index" data-reveal>
            <span>01 / EL UNIVERSO</span>
            <Icon name="spark" />
          </div>
          <div className="universe-content" data-reveal>
            <p className="eyebrow">DOS DISCIPLINAS. UNA MISMA ACTITUD.</p>
            <h2>
              No sigas el estilo.
              <br />
              <span className="serif">Hazlo tuyo.</span>
            </h2>
            <div className="universe-bottom">
              <p>
                Un corte que define. Un tatuaje que expresa. Elite Barber &
                Tattoo reúne barbería y el arte de Jean Carlos en un mismo
                espacio en Cartagena.
              </p>
              <a className="text-link" href="#galeria">
                Conoce nuestro trabajo <Icon name="arrow" />
              </a>
            </div>
          </div>
        </section>
        <section className="section services-section" id="servicios">
          <div className="section-heading" data-reveal>
            <div>
              <p className="eyebrow">02 / ELIGE TU EXPERIENCIA</p>
              <h2>
                El detalle
                <br />
                <span className="serif">lo cambia todo.</span>
              </h2>
            </div>
            <p className="section-note">
              Barbería con intención.
              <br />
              Tatuajes con identidad.
            </p>
          </div>
          <div className="service-list">
            {services.map((s, i) => (
              <Link
                href={`/reservar?servicio=${s.id}`}
                className="service-row"
                key={s.id}
                data-reveal
              >
                <span className="service-number">0{i + 1}</span>
                <div>
                  <h3>{s.name}</h3>
                  <p>
                    {i === 0
                      ? "Un nuevo look empieza en los detalles."
                      : "Corte y barba en una misma experiencia."}
                  </p>
                </div>
                <span className="service-price">
                  {currency(s.priceCOP)}
                  <small>COP · precio provisional</small>
                </span>
                <span className="round-arrow">
                  <Icon name="arrow" />
                </span>
              </Link>
            ))}
            <Link href="/tatuaje" className="service-row" data-reveal>
              <span className="service-number">03</span>
              <div>
                <h3>Tatuaje personalizado</h3>
                <p>Tu idea. El trazo de Jean Carlos.</p>
              </div>
              <span className="service-price quote-price">
                A tu medida<small>Cotización según diseño</small>
              </span>
              <span className="round-arrow">
                <Icon name="arrow" />
              </span>
            </Link>
          </div>
        </section>
        <Gallery />
        <section className="artist-feature section" data-reveal>
          <div className="artist-visual">
            <div className="artist-frame">
              <JCMark />
            </div>
            <span className="eyebrow artist-signature">
              EL TRAZO DETRÁS DEL ARTE
            </span>
            <span className="artist-serial">JC / 001</span>
          </div>
          <div className="artist-copy">
            <p className="eyebrow">04 / EL ARTISTA</p>
            <h2>
              Jean
              <br />
              <span className="serif">Carlos.</span>
            </h2>
            <p>
              Tu historia merece un trazo propio. Conoce el universo de Jean
              Carlos, artista de tatuajes en Elite Barber & Tattoo.
            </p>
            <p className="muted">
              Cada proyecto comienza con una conversación: la idea, la zona y
              los detalles que lo hacen tuyo.
            </p>
            <Link className="button button-outline" href="/jean-carlos">
              Conoce al artista <Icon name="arrow" />
            </Link>
          </div>
        </section>
        <section className="section" id="equipo">
          <div className="section-heading" data-reveal>
            <div>
              <p className="eyebrow">05 / BARBERÍA</p>
              <h2>
                Elige quién
                <br />
                <span className="serif">define tu estilo.</span>
              </h2>
            </div>
            <p className="section-note">
              Perfiles provisionales.
              <br />
              Nombres y retratos por confirmar.
            </p>
          </div>
          <div className="team-grid">
            {barbers.map((b, i) => (
              <Link
                href={`/reservar?profesional=${b.id}`}
                key={b.id}
                className="team-card"
                data-reveal
              >
                <div className="team-placeholder">
                  <span className="team-monogram">E{i + 1}</span>
                  <span className="eyebrow">RETRATO PRÓXIMAMENTE</span>
                  <Icon name="plus" />
                </div>
                <div className="team-card-bottom">
                  <div>
                    <h3>{b.name}</h3>
                    <p>Barbería · perfil demo</p>
                  </div>
                  <Icon name="arrow" />
                </div>
              </Link>
            ))}
          </div>
        </section>
        <section className="booking-teaser section" data-reveal>
          <div>
            <p className="eyebrow">TU MOMENTO EMPIEZA AQUÍ</p>
            <h2>
              Haz espacio
              <br />
              para <span className="serif">ti.</span>
            </h2>
            <p>
              Elige tu experiencia y encuentra un espacio en la agenda demo.
            </p>
            <Link href="/reservar" className="button">
              Explorar calendario <Icon name="calendar" />
            </Link>
          </div>
          <Link
            href="/reservar"
            className="teaser-calendar"
            aria-label="Abrir el calendario de reservas"
          >
            <div className="mini-calendar-top">
              <span>ELITE / TU ESPACIO</span>
              <Icon name="spark" />
            </div>
            <div className="mini-days">
              {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>
            <div className="mini-grid">
              {Array.from({ length: 21 }, (_, i) => (
                <span key={i} className={i === 11 ? "chosen" : ""}>
                  {i + 1}
                </span>
              ))}
            </div>
            <div className="mini-calendar-bottom">
              <span className="live-dot" />
              Un momento para renovar tu estilo.
              <Icon name="arrow" />
            </div>
          </Link>
        </section>
      </main>
      <Footer />
      <Reveal />
    </>
  );
}
