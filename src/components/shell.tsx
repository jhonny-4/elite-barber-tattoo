"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Brand } from "./media";
import { Icon } from "./icons";
import { businessAddress, mapsUrl } from "../domain/business";
export function Header() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open]);
  return (
    <>
      <a className="skip-link" href="#main">
        Saltar al contenido
      </a>
      <div className="demo-strip">
        <span className="live-dot" /> EXPERIENCIA DEMO{" "}
        <span className="strip-divider">/</span>{" "}
        <span>Cartagena · Barbería & tatuaje</span>
        <Link href="/administracion" className="owner-entry">
          Panel administrativo · demo <Icon name="arrow" />
        </Link>
      </div>
      <header className="site-header">
        <Link
          href="/"
          aria-label="Elite, inicio"
          onClick={() => setOpen(false)}
        >
          <Brand />
        </Link>
        <nav
          className={open ? "main-nav open" : "main-nav"}
          aria-label="Principal"
        >
          <Link href="/#universo" onClick={() => setOpen(false)}>
            Quiénes somos
          </Link>
          <Link href="/#servicios" onClick={() => setOpen(false)}>
            Servicios
          </Link>
          <Link href="/#galeria" onClick={() => setOpen(false)}>
            El trabajo
          </Link>
          <Link href="/jean-carlos" onClick={() => setOpen(false)}>
            Jean Carlos
          </Link>
        </nav>
        <Link className="button button-small header-book" href="/reservar">
          Reserva tu espacio <Icon name="arrow" />
        </Link>
        <button
          className="icon-button menu-toggle"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <Icon name={open ? "close" : "menu"} />
        </button>
      </header>
    </>
  );
}
export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <div>
          <Brand />
          <p className="eyebrow">TU ESTILO TIENE UN LUGAR / CARTAGENA</p>
          <h2>
            Aquí empieza
            <br />
            <span className="serif">tu próxima versión.</span>
          </h2>
        </div>
        <div className="footer-cta-actions">
          <Link className="button" href="/reservar">
            Reserva en Elite <Icon name="arrow" />
          </Link>
          <a
            className="button button-outline"
            href="https://wa.me/573012329541"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon name="whatsapp" /> Hablemos
          </a>
        </div>
      </div>
      <section className="location-card" aria-labelledby="location-title">
        <span className="location-coordinate" aria-hidden="true">
          E.
        </span>
        <div>
          <p className="eyebrow">UN SOLO ESTUDIO / DOS FORMAS DE EXPRESARTE</p>
          <h3 id="location-title">Nos vemos en Chiquinquirá.</h3>
          <address>{businessAddress}.</address>
        </div>
        <a
          className="button"
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Ver en Google Maps <Icon name="arrow" />
        </a>
      </section>
      <div className="footer-grid">
        <Brand />
        <p>
          Barbería & tatuaje.
          <br />
          Dos formas de expresarte. Un mismo lugar.
        </p>
        <div>
          <a
            href="https://www.instagram.com/elite_barber_tattoo/"
            target="_blank"
            rel="noreferrer"
          >
            Instagram Elite ↗
          </a>
          <a
            href="https://www.instagram.com/jeancarlostattoo19/"
            target="_blank"
            rel="noreferrer"
          >
            Instagram Jean Carlos ↗
          </a>
        </div>
        <div>
          <Link href="/reservar">Reservar barbería</Link>
          <Link href="/tatuaje">Proponer un tatuaje</Link>
          <Link href="/#ubicacion">Ubicación y mapa</Link>
          <Link href="/turnos">Tomar turno por QR</Link>
          <Link href="/pantalla-turnos">Pantalla de turnos</Link>
          <Link href="/administracion">
            Propietario · Panel administrativo ↗
          </Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Elite Barber & Tattoo</span>
        <span>Chiquinquirá · Cartagena de Indias</span>
        <span>
          DISEÑO & DESARROLLO <b>ZENKO</b>
        </span>
      </div>
      <p className="demo-footnote">
        Prototipo de presentación. Precios, profesionales y disponibilidad
        provisionales. Sin pagos, mensajes ni reservas de producción.
      </p>
    </footer>
  );
}
