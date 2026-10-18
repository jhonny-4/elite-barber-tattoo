"use client";
import Link from "next/link";
import { useState } from "react";
import {
  useOwnerSession,
  beginOwnerDemo,
  endOwnerDemo,
} from "../lib/owner-session";
import { EliteLogo } from "./brand/logos";
import { Dashboard } from "./dashboard";
import { Icon } from "./icons";
import { DemoLogin } from "./demo-login";

type IconName = Parameters<typeof Icon>[0]["name"];

const copy = {
  owner: {
    title: "Panel",
    serif: "administrativo.",
    lead: "Agenda, fila de turnos, solicitudes de tatuaje y equipo de Elite en un solo lugar.",
    cta: "Abrir panel",
    features: [
      ["calendar", "Agenda", "Citas del día, reprogramación y cancelación."],
      ["ticket", "Fila y QR", "Turnos presenciales y por QR en vivo."],
      ["needle", "Tatuajes", "Solicitudes y su seguimiento manual."],
      ["users", "Equipo", "Jornadas, descansos y clientes."],
    ] as [IconName, string, string][],
    other: { href: "/barbero", label: "Vista de barbero" },
  },
  barber: {
    title: "Vista de",
    serif: "barbero.",
    lead: "La agenda y la fila de cada profesional, con botones grandes para la tablet del puesto.",
    cta: "Abrir vista de barbero",
    features: [
      ["clock", "Ahora", "Quién está en tu silla y qué sigue."],
      ["ticket", "Tu fila", "Llama e inicia los turnos compatibles."],
      ["calendar", "Tus citas", "Agenda de hoy y próximos días."],
    ] as [IconName, string, string][],
    other: { href: "/administracion", label: "Panel administrativo" },
  },
};

/**
 * Entrada al panel. El acceso es simulado: no hay autenticación ni autorización
 * en servidor, y la marca en sessionStorage es solo una comodidad de la presentación.
 */
export function OwnerGate({
  professionalView = false,
}: {
  professionalView?: boolean;
}) {
  const { owner, ready } = useOwnerSession();
  const [error, setError] = useState("");
  const text = professionalView ? copy.barber : copy.owner;

  function enter() {
    try {
      beginOwnerDemo();
      setError("");
      window.scrollTo({ top: 0 });
    } catch {
      setError(
        "Este navegador bloquea el almacenamiento de la sesión. Abre el panel en una ventana normal, no privada.",
      );
    }
  }

  function exit() {
    endOwnerDemo();
    window.scrollTo({ top: 0 });
  }

  if (!ready) return <p className="loading-state">Preparando acceso…</p>;
  if (owner) return <Dashboard professionalOnly={professionalView} onExit={exit} />;

  return (
    <div className="adm-gate-stage">
      <section className="adm-gate" aria-labelledby="acceso-titulo">
        <EliteLogo className="adm-gate-logo" title="Elite Barber & Tattoo" />
        <p className="eyebrow">Elite / Acceso del equipo</p>
        <h1 id="acceso-titulo">
          {text.title}
          <br />
          <span className="serif">{text.serif}</span>
        </h1>
        <p className="adm-gate-lead">{text.lead}</p>
        <DemoLogin onEnter={enter} />
        <p className="adm-gate-sub">Sesión de prueba · datos ficticios</p>
        {error ? (
          <p className="inline-error" role="alert">
            {error}
          </p>
        ) : null}

        <ul className="adm-gate-features" aria-label="Qué incluye">
          {text.features.map(([icon, title, detail]) => (
            <li key={title}>
              <Icon name={icon} />
              <strong>{title}</strong>
              <span>{detail}</span>
            </li>
          ))}
        </ul>

        <div className="adm-gate-honest">
          <article data-tone="now">
            <span className="adm-gate-honest-icon" aria-hidden="true">
              <Icon name="lock" />
            </span>
            <h2>Hoy: acceso simulado</h2>
            <p>
              El formulario usa credenciales públicas de presentación y recuerda
              la sesión en este navegador. No protege la API; utiliza solo datos ficticios.
            </p>
          </article>
          <article>
            <span className="adm-gate-honest-icon" aria-hidden="true">
              <Icon name="users" />
            </span>
            <h2>En producción</h2>
            <p>
              Solo Jean Carlos y los roles que él autorice entrarán con su
              cuenta, y el servidor comprobará los permisos antes de entregar
              cualquier dato.
            </p>
          </article>
        </div>
        <p className="adm-gate-note">
          Ocultar el enlace o recordar la sesión en este navegador no protege la
          información: es solo una comodidad de la presentación.
        </p>

        <nav className="adm-gate-links" aria-label="Otros accesos">
          <Link className="text-link" href="/">
            Volver a la web pública
          </Link>
          <Link className="text-link" href={text.other.href}>
            {text.other.label}
            <Icon name="arrow" />
          </Link>
        </nav>
      </section>
    </div>
  );
}
