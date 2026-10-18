"use client";
import { useEffect } from "react";
import Link from "next/link";
import { Brand } from "../components/media";
import { Icon } from "../components/icons";

export default function ErrorPage({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const digest =
    error instanceof Error && "digest" in error
      ? String((error as Error & { digest?: string }).digest ?? "")
      : "";
  return (
    <main className="system-page" data-kind="error" id="main">
      <section className="system-card" aria-labelledby="system-title">
        <Link
          href="/"
          className="system-brand"
          aria-label="Elite Barber & Tattoo, inicio"
        >
          <Brand title="" />
        </Link>
        <span className="system-icon" aria-hidden="true">
          <Icon name="alert" />
        </span>
        <p className="eyebrow">Algo falló</p>
        <h1 id="system-title">
          Se interrumpió
          <br />
          <span className="serif">la experiencia.</span>
        </h1>
        <p>
          No pudimos cargar esta pantalla. Inténtalo de nuevo; si el problema
          continúa, vuelve al inicio.
        </p>
        <div className="button-row stack-mobile system-actions">
          <button type="button" className="button" onClick={() => retry()}>
            Volver a intentar <Icon name="refresh" />
          </button>
          <Link className="button button-outline" href="/">
            Ir al inicio
          </Link>
        </div>
        {digest && <p className="system-foot">Referencia: {digest}</p>}
      </section>
    </main>
  );
}
