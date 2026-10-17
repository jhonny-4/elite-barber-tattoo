import Link from "next/link";
import { Header, Footer } from "../components/shell";
import { Icon } from "../components/icons";
import { Photo, SectionBrand } from "../components/media";
import { ArtistMonogram } from "../components/artist-monogram";
import { portfolio } from "../domain/media";
import { EliteSculpture } from "../components/elite-sculpture";
import { Gallery } from "../components/gallery";
import { Reveal } from "../components/reveal";
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
              TU ESTILO.
              <br />
              <span className="serif">Tu firma.</span>
            </h1>
            <p className="hero-description">
              Barbería y tatuaje en un mismo lugar.
              <br />
              Precisión en el corte. Identidad en cada trazo.
            </p>
            <div className="hero-actions">
              <Link className="button" href="/reservar">
                Reserva tu corte <Icon name="arrow" />
              </Link>
              <Link className="button button-outline" href="/tatuaje">
                Quiero un tatuaje <Icon name="arrow" />
              </Link>
            </div>
            <div className="hero-socials" aria-label="Contacta y sigue a Elite">
              <a
                className="button social-button"
                href="https://wa.me/573012329541"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp al +57 301 232 9541, contacto provisional (abre otra pestaña)"
              >
                <span className="social-button-icon">
                  <Icon name="whatsapp" />
                </span>
                <span>
                  WhatsApp<small>Hablemos de tu estilo</small>
                </span>
                <Icon name="arrow" />
              </a>
              <a
                className="button button-outline social-button"
                href="https://www.instagram.com/elite_barber_tattoo/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram de Elite Barber & Tattoo (abre otra pestaña)"
              >
                <span className="social-button-icon">
                  <Icon name="instagram" />
                </span>
                <span>
                  Instagram<small>@elite_barber_tattoo</small>
                </span>
                <Icon name="arrow" />
              </a>
            </div>
          </div>
          <div className="hero-art">
            <div className="art-coordinate">ELITE / ESTUDIO DE ESTILO</div>
            <EliteSculpture />
            <div className="sculpture-floor" aria-hidden="true" />
            <span className="sculpture-caption">
              ELITE BARBER & TATTOO
              <br />
              <small>LA IDENTIDAD TOMA FORMA.</small>
            </span>
            <div className="hero-art-footer">
              <span>01 / UNA FIRMA PROPIA</span>
              <a href="#servicios">DESCUBRE TU EXPERIENCIA ↓</a>
            </div>
          </div>
        </section>
        <div className="marquee" aria-hidden="true">
          <div>
            {Array.from({ length: 4 }, (_, i) => (
              <span key={i}>
                <em>ELITE</em> <b>✦</b> BARBERÍA <b>✦</b> TATTOO <b>✦</b>{" "}
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
            <SectionBrand />
            <p className="eyebrow">QUIÉNES SOMOS / ELITE BARBER & TATTOO</p>
            <h2>
              No sigas el estilo.
              <br />
              <span className="serif">Hazlo tuyo.</span>
            </h2>
            <div className="universe-bottom">
              <p>
                Somos Elite Barber & Tattoo, un espacio de barbería y tatuaje en
                Cartagena. Reunimos dos formas de expresión: el estilo que
                llevas cada día y el arte que eliges llevar en la piel.
              </p>
              <a className="text-link" href="#galeria">
                Conoce nuestro trabajo <Icon name="arrow" />
              </a>
            </div>
            <div className="about-editorial">
              <p>
                La barbería es parte de nuestra identidad. Aquí puedes explorar
                un corte o un corte con barba, elegir tu profesional y encontrar
                un espacio en la agenda.
              </p>
              <p>
                El tatuaje tiene su propio proceso: Jean Carlos recibe tu idea y
                tus referencias para valorar el diseño antes de cotizar y
                acordar una sesión. Dos disciplinas, la misma marca:{" "}
                <strong>Elite.</strong>
              </p>
            </div>
            <div className="about-pillars">
              <span>
                <b>01</b> BARBERÍA CON IDENTIDAD
              </span>
              <span>
                <b>02</b> EL ARTE DE JEAN CARLOS
              </span>
              <span>
                <b>03</b> UN SOLO LOCAL EN CARTAGENA
              </span>
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
            <div>
              <SectionBrand />
              <p className="section-note">
                Barbería con intención.
                <br />
                Tatuajes con identidad.
              </p>
            </div>
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
        <section className="section barber-culture" data-reveal>
          <div className="barber-culture-visual">
            <div className="barber-duo">
              {[portfolio[3], portfolio[1]].map((item) => (
                <figure key={item.id}>
                  <Photo item={item} fit="contain" />
                  <figcaption>{item.title}</figcaption>
                </figure>
              ))}
            </div>
            <span className="barber-photo-signature">
              ELITE BARBER / CARTAGENA
            </span>
            <span className="barber-culture-number" aria-hidden="true">
              ELITE.
            </span>
          </div>
          <div className="barber-culture-copy">
            <SectionBrand />
            <p className="eyebrow">NUESTRA BARBERÍA</p>
            <h2>
              Un buen corte.
              <br />
              <span className="serif">Tu sello personal.</span>
            </h2>
            <p>
              En Elite, barbería y estilo van de la mano. Elige un corte para
              renovar tu imagen o combina corte y barba en una misma
              experiencia.
            </p>
            <p>
              La web te permite escoger servicio, profesional y horario. El
              portafolio reúne trabajos del negocio para que explores la forma,
              la textura y los detalles antes de elegir.
            </p>
            <div className="barber-service-tags">
              <span>
                CORTE <b>{currency(20000)}</b>
              </span>
              <span>
                CORTE + BARBA <b>{currency(25000)}</b>
              </span>
            </div>
            <small className="muted">
              Precios provisionales para la presentación.
            </small>
            <div className="hero-actions">
              <Link href="/reservar" className="button">
                Reserva en Elite <Icon name="arrow" />
              </Link>
              <a href="#equipo" className="text-link">
                Conoce al equipo <Icon name="arrow" />
              </a>
            </div>
          </div>
        </section>
        <Gallery />
        <section className="artist-feature section" data-reveal>
          <div className="artist-visual">
            <ArtistMonogram />
            <span className="eyebrow artist-signature">
              EL TRAZO DETRÁS DEL ARTE
            </span>
            <span className="artist-serial">JC / 001</span>
          </div>
          <div className="artist-copy">
            <SectionBrand />
            <p className="eyebrow">04 / EL ARTISTA DE ELITE</p>
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
