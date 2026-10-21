"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Brand } from "./media";
import { DepthMark } from "./three/sculpture-stage";
import { ELITE_BOX, ELITE_PATHS } from "./three/presets";
import { Icon } from "./icons";
import { BrandGlyph, EliteLogo } from "./brand/logos";
import {
  artistInstagramHandle,
  artistInstagramUrl,
  businessAddress,
  directionsUrl,
  instagramHandle,
  instagramUrl,
  whatsappDisplay,
  whatsappUrl,
} from "../domain/business";

const navLinks = [
  { href: "/#inicio", label: "Inicio" },
  { href: "/#universo", label: "Quiénes somos" },
  { href: "/#servicios", label: "Servicios" },
  { href: "/#galeria", label: "Trabajos" },
  { href: "/jean-carlos", label: "Jean Carlos" },
  { href: "/#ubicacion", label: "Ubicación" },
];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [elevated, setElevated] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const firstLink = useRef<HTMLAnchorElement>(null);
  const header = useRef<HTMLElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => setElevated(window.scrollY > 12);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    // El menú empieza bajo la cabecera, que está más abajo si la barra superior es visible.
    const place = () =>
      menu.current?.style.setProperty(
        "--menu-top",
        `${Math.max(0, header.current?.getBoundingClientRect().bottom ?? 0)}px`,
      );
    place();
    window.addEventListener("resize", place);
    firstLink.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    const wide = window.matchMedia("(min-width: 1024px)");
    const closeOnWide = () => wide.matches && setOpen(false);
    window.addEventListener("keydown", key);
    wide.addEventListener("change", closeOnWide);
    return () => {
      root.style.overflow = previous;
      window.removeEventListener("resize", place);
      window.removeEventListener("keydown", key);
      wide.removeEventListener("change", closeOnWide);
    };
  }, [open]);

  const close = () => setOpen(false);
  const current = (href: string) =>
    href === pathname ? ("page" as const) : undefined;

  return (
    <>
      <a className="skip-link" href="#main">
        Saltar al contenido
      </a>
      <div className="topbar">
        <p className="topbar-place">
          <span className="topbar-mark" aria-hidden="true" />
          Cartagena · Barbería &amp; tatuaje
        </p>
      </div>
      <header
        ref={header}
        className="site-header"
        data-elevated={elevated || undefined}
        data-menu-open={open || undefined}
      >
        <Link
          href="/"
          className="header-brand"
          aria-label="Elite Barber & Tattoo, inicio"
          onClick={close}
        >
          <span className="header-logo-depth"><DepthMark box={ELITE_BOX} paths={ELITE_PATHS} layers={7} /></span>
        </Link>
        <nav className="main-nav" aria-label="Principal">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={current(link.href)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="header-mobile-access">
          <button type="button" className="button button-small" onClick={() => { close(); window.dispatchEvent(new Event("elite:install")); }}><Icon name="download" /> Instalar app</button>
        </div>
        <div className="header-actions">
          <button type="button" className="button button-outline button-small header-install" onClick={() => window.dispatchEvent(new Event("elite:install"))}>
            <Icon name="download" /> Instalar app
          </button>
          <Link
            className="button button-accent button-small header-book"
            href="/reservar"
            onClick={close}
          >
            Reservar <Icon name="arrow" />
          </Link>
          <button
            ref={toggle}
            type="button"
            className="icon-button menu-toggle"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen(!open)}
          >
            <Icon name={open ? "close" : "menu"} />
          </button>
        </div>
      </header>
      <div
        ref={menu}
        id="mobile-menu"
        className="mobile-menu"
        data-open={open || undefined}
        inert={!open}
        aria-hidden={!open}
      >
        <nav className="mobile-menu-nav" aria-label="Menú móvil">
          {navLinks.map((link, index) => (
            <Link
              key={link.href}
              ref={index === 0 ? firstLink : undefined}
              href={link.href}
              onClick={close}
              aria-current={current(link.href)}
              style={{ "--i": index } as React.CSSProperties}
            >
              <span className="mobile-menu-index">0{index + 1}</span>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="mobile-menu-actions">
          <Link
            className="button button-accent button-block"
            href="/reservar"
            onClick={close}
          >
            Reserva tu corte <Icon name="arrow" />
          </Link>
          <div className="mobile-menu-social">
            <a
              className="button button-whatsapp"
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
              className="button button-instagram"
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
          <Link className="text-link" href="/tatuaje" onClick={close}>
            Solicitar un tatuaje <Icon name="arrow" />
          </Link>
          <Link className="mobile-menu-team" href="/administracion" onClick={close}>
            <Icon name="lock" /> Acceso del equipo
          </Link>
        </div>
      </div>
    </>
  );
}

export function Footer() {
  return (
    <footer className="footer grain">
      <section className="footer-cta" aria-labelledby="footer-cta-title">
        <EliteLogo className="footer-logo" title="Elite Barber & Tattoo" />
        <p className="eyebrow">Tu estilo tiene un lugar · Cartagena</p>
        <h2 id="footer-cta-title">
          Aquí empieza
          <br />
          <span className="serif">
            tu próxima versión<span className="dot">.</span>
          </span>
        </h2>
        <div className="button-row stack-mobile">
          <Link className="button button-accent button-large" href="/reservar">
            Reserva en Elite <Icon name="arrow" />
          </Link>
          <a
            className="button button-whatsapp button-large"
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="button-glyph">
              <BrandGlyph name="whatsapp" />
            </span>
            <span className="button-label">
              WhatsApp
              <small>{whatsappDisplay}</small>
            </span>
            <span className="visually-hidden"> (abre otra pestaña)</span>
          </a>
          <a
            className="button button-instagram button-large"
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="button-glyph">
              <BrandGlyph name="instagram" />
            </span>
            <span className="button-label">
              Instagram
              <small>{instagramHandle}</small>
            </span>
            <span className="visually-hidden"> (abre otra pestaña)</span>
          </a>
        </div>
      </section>

      <section className="footer-location" aria-labelledby="footer-location-title">
        <span className="footer-location-icon" aria-hidden="true">
          <Icon name="pin" />
        </span>
        <div>
          <h3 id="footer-location-title">Nos vemos en Los Ejecutivos</h3>
          <address>{businessAddress}</address>
        </div>
        <div className="footer-location-actions">
          <a
            className="button button-outline button-small"
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Cómo llegar <Icon name="arrow" />
          </a>
          <Link className="text-link" href="/#ubicacion">
            Ver mapa
          </Link>
        </div>
      </section>

      <div className="footer-grid">
        <div className="footer-about">
          <Brand title="Elite Barber & Tattoo" />
          <p>
            Barbería y tatuaje en un mismo lugar. Precisión en el corte,
            identidad en cada trazo.
          </p>
        </div>
        <nav className="footer-col" aria-label="Explora">
          <h3>Explora</h3>
          <Link href="/#universo">Quiénes somos</Link>
          <Link href="/#servicios">Servicios</Link>
          <Link href="/#galeria">Trabajos</Link>
          <Link href="/jean-carlos">Jean Carlos</Link>
        </nav>
        <nav className="footer-col" aria-label="Reservas y turnos">
          <h3>Agenda</h3>
          <Link href="/reservar">Reservar barbería</Link>
          <Link href="/tatuaje">Solicitar un tatuaje</Link>
          <Link href="/turnos">Tomar turno</Link>
        </nav>
        <nav className="footer-col" aria-label="Redes y equipo">
          <h3>Síguenos</h3>
          <a href={instagramUrl} target="_blank" rel="noopener noreferrer">
            {instagramHandle} ↗
          </a>
          <a
            href={artistInstagramUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {artistInstagramHandle} ↗
          </a>
          <Link className="team-entry" href="/administracion">Acceso del equipo</Link>
        </nav>
      </div>

      <div className="footer-bottom">
        <span>
          © {new Date().getFullYear()} Elite Barber &amp; Tattoo · Cartagena de
          Indias
        </span>
        <span className="footer-credit">
          Diseño &amp; desarrollo <b>ZENKO</b>
        </span>
      </div>
      <p className="footer-note">
        Reservas de barbería en línea y confirmación por correo.
        Tatuajes sujetos a valoración y cotización.
      </p>
    </footer>
  );
}
