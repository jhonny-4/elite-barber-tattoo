"use client";
import Link from "next/link";
import { useState } from "react";
import {
  useOwnerSession,
  beginOwnerDemo,
  endOwnerDemo,
} from "../lib/owner-session";
import { Dashboard } from "./dashboard";
import { Icon } from "./icons";
export function OwnerGate() {
  const { owner, ready } = useOwnerSession();
  const [error, setError] = useState("");
  if (!ready)
    return <p className="loading-state">Preparando acceso administrativo…</p>;
  if (owner)
    return (
      <>
        <div className="owner-session-note">
          <span>JEAN CARLOS / PROPIETARIO · SESIÓN DEMO</span>
          <button className="text-link" onClick={endOwnerDemo}>
            Salir de la demo
          </button>
        </div>
        <Dashboard />
      </>
    );
  return (
    <div className="owner-access">
      <p className="eyebrow">ELITE / ACCESO DEL PROPIETARIO</p>
      <h1>
        Panel
        <br />
        <span className="serif">administrativo.</span>
      </h1>
      <p className="lead">
        El espacio de Jean Carlos para organizar su negocio.
      </p>
      <div className="owner-explainer">
        <article>
          <Icon name="calendar" />
          <h2>La agenda</h2>
          <p>Citas de barbería y disponibilidad del equipo.</p>
        </article>
        <article>
          <Icon name="spark" />
          <h2>Las solicitudes</h2>
          <p>Ideas de tatuajes, referencias y seguimiento.</p>
        </article>
        <article>
          <Icon name="users" />
          <h2>Los clientes</h2>
          <p>Contactos e historial en un mismo lugar.</p>
        </article>
      </div>
      <div className="owner-demo-access">
        <h2>Vista previa del acceso</h2>
        <p>
          En la web final, Jean Carlos iniciará sesión con su cuenta y los
          permisos de propietario. Los clientes no verán el panel ni tendrán
          acceso a sus datos.
        </p>
        <p className="form-disclaimer">
          Ahora es una simulación de presentación, sin contraseña ni protección
          de producción. Utiliza solo datos ficticios.
        </p>
        <p className="inline-error" role="alert">
          {error}
        </p>
        <button
          className="button"
          onClick={() => {
            try {
              beginOwnerDemo();
            } catch {
              setError(
                "Este navegador no permite guardar la sesión demo. Prueba en una ventana normal.",
              );
            }
          }}
        >
          Probar panel administrativo · demo <Icon name="arrow" />
        </button>
        <Link className="text-link" href="/">
          Volver a la web pública
        </Link>
      </div>
    </div>
  );
}
