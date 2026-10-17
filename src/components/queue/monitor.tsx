"use client";
import Link from "next/link";
import { usePublicQueue } from "../../lib/use-public-queue";
import { Brand } from "../media";
export function QueueMonitor() {
  const { queue, error, online } = usePublicQueue();
  return (
    <main id="main" className="queue-monitor">
      <header>
        <Brand />
        <div>
          <p className="eyebrow">ELITE / PANTALLA PÚBLICA DEMO</p>
          <h1>
            Tu turno.<span className="serif"> Tu estilo.</span>
          </h1>
        </div>
        <span className="status-badge">
          {online ? "Conectado" : "Reconectando"}
        </span>
      </header>
      <p role="status">{error}</p>
      <section className="monitor-called">
        <p className="eyebrow">LLAMANDO AHORA</p>
        {queue?.called.length ? (
          queue.called.map((t) => (
            <article key={t.number}>
              <strong>{t.number}</strong>
              <h2>{t.barber}</h2>
            </article>
          ))
        ) : (
          <h2>Próximamente, tu número.</h2>
        )}
      </section>
      <div className="monitor-columns">
        <section className="v4-card">
          <h2>En atención</h2>
          {queue?.serving.length ? (
            queue.serving.map((t) => (
              <p key={t.number}>
                <b>{t.number}</b> · {t.barber}
              </p>
            ))
          ) : (
            <p>Sin atenciones activas.</p>
          )}
        </section>
        <section className="v4-card">
          <h2>En espera · {queue?.waiting ?? 0}</h2>
          <div className="monitor-waiting">
            {queue?.next.map((t) => (
              <span key={t.number}>{t.number}</span>
            ))}
          </div>
          {!queue?.waiting && <p>La fila está lista para empezar.</p>}
        </section>
      </div>
      <footer>
        Solo números de turno y profesionales. No se publican nombres ni
        contactos.
        <br />
        <Link href="/turnos">Registrarme en la fila demo ↗</Link>
      </footer>
    </main>
  );
}
