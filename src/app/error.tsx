"use client";
import Link from "next/link";
export default function ErrorPage({
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <main className="flow-page" id="main">
      <div className="success-panel">
        <p className="eyebrow">ELITE / INTENTEMOS DE NUEVO</p>
        <h1>
          Se interrumpió
          <br />
          <span className="serif">la experiencia.</span>
        </h1>
        <p>
          No pudimos completar esta pantalla. Puedes volver a intentarlo o
          regresar al inicio.
        </p>
        <button className="button" onClick={() => retry()}>
          Volver a intentar ↗
        </button>
        <Link className="text-link" href="/">
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
