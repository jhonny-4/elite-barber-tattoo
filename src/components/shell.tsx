"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Brand } from "./media";
import { Icon } from "./icons";
import { useOwnerSession } from "../lib/owner-session";
export function Header() {
  const { owner } = useOwnerSession();
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
        {owner && (
          <Link href="/administracion">
            Panel administrativo <Icon name="arrow" />
          </Link>
        )}
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
            El universo Elite
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
          <p className="eyebrow">CARTAGENA, COLOMBIA</p>
          <h2>
            Tu próxima
            <br />
            <span className="serif">versión.</span>
          </h2>
        </div>
        <Link
          className="circle-link"
          href="/reservar"
          aria-label="Reservar barbería"
        >
          <Icon name="arrow" />
        </Link>
      </div>
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
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Elite Barber & Tattoo</span>
        <span>Dirección y contacto pendientes de confirmar.</span>
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
