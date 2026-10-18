"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePublicQueue } from "../../lib/use-public-queue";
import { Brand } from "../media";
import { Icon } from "../icons";
import { defaultQueueUrl, readQueueUrl, useQrImage, validQueueUrl } from "./qr";

const ZONE = "America/Bogota";
const timeFormat = new Intl.DateTimeFormat("es-CO", {
  timeZone: ZONE,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});
const dateFormat = new Intl.DateTimeFormat("es-CO", {
  timeZone: ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
});

/** Reloj del local (hora de Cartagena). Se pinta solo en el cliente. */
function MonitorClock() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);
  if (now === null)
    return (
      <div className="monitor-clock" aria-hidden="true">
        <span className="monitor-time">--:--</span>
        <span className="monitor-date">&nbsp;</span>
      </div>
    );
  const parts = timeFormat.formatToParts(now);
  const time = parts
    .filter(
      (p) =>
        p.type === "hour" ||
        p.type === "minute" ||
        (p.type === "literal" && p.value.trim() === ":"),
    )
    .map((p) => p.value)
    .join("");
  const period = parts.find((p) => p.type === "dayPeriod")?.value ?? "";
  return (
    <div className="monitor-clock">
      <time className="monitor-time" dateTime={new Date(now).toISOString()}>
        {time}
        {period && <small>{period}</small>}
      </time>
      <span className="monitor-date">{dateFormat.format(now)}</span>
    </div>
  );
}

/** Pantalla completa para TV o tablet, si el navegador lo permite. */
function FullscreenToggle() {
  const [supported, setSupported] = useState(false),
    [active, setActive] = useState(false);
  useEffect(() => {
    setSupported(Boolean(document.fullscreenEnabled));
    const sync = () => setActive(Boolean(document.fullscreenElement));
    sync();
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  if (!supported) return null;
  return (
    <button
      type="button"
      className="icon-button monitor-fullscreen"
      aria-label="Pantalla completa"
      aria-pressed={active}
      title={active ? "Salir de pantalla completa" : "Pantalla completa"}
      onClick={() => {
        const request = document.fullscreenElement
          ? document.exitFullscreen()
          : document.documentElement.requestFullscreen();
        request.catch(() => {});
      }}
    >
      <Icon name={active ? "collapse" : "expand"} />
    </button>
  );
}

/** QR para tomar turno: usa el enlace fijado en la tarjeta QR de este navegador. */
function MonitorJoin() {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const pick = () => {
      const stored = readQueueUrl();
      setUrl(stored && validQueueUrl(stored) ? stored : defaultQueueUrl());
    };
    pick();
    window.addEventListener("storage", pick);
    return () => window.removeEventListener("storage", pick);
  }, []);
  const { image } = useQrImage(url, 240);
  return (
    <div className="monitor-join">
      <div className="monitor-qr">
        {image && (
          <img
            src={image}
            width={120}
            height={120}
            alt="Código QR para tomar turno en Elite Barber & Tattoo"
          />
        )}
      </div>
      <p className="monitor-join-copy">
        <b>Reserva tu corte</b>
        <span>Escanea el código con tu celular</span>
      </p>
    </div>
  );
}

/** Evita que la tablet o la TV apaguen la pantalla mientras el monitor está visible. */
function useScreenAwake() {
  useEffect(() => {
    if (!("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null,
      alive = true;
    const request = () => {
      if (!alive || document.visibilityState !== "visible") return;
      navigator.wakeLock
        .request("screen")
        .then((sentinel) => {
          if (alive) lock = sentinel;
          else void sentinel.release();
        })
        .catch(() => {});
    };
    request();
    document.addEventListener("visibilitychange", request);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", request);
      void lock?.release().catch(() => {});
    };
  }, []);
}

export function QueueMonitor() {
  const { queue, error, online } = usePublicQueue();
  useScreenAwake();
  const called = queue?.called ?? [],
    serving = queue?.serving ?? [],
    next = queue?.next ?? [],
    waiting = queue?.waiting ?? 0,
    more = Math.max(0, waiting - next.length);
  const pending = queue ? null : error ? "Sin datos por ahora." : "Cargando…";
  const alert = !online && Boolean(queue || error);
  return (
    <main
      id="main"
      className="queue-monitor"
      data-state={queue ? "ready" : "loading"}
    >
      <header className="monitor-head">
        <div className="monitor-brand">
          <Brand className="monitor-logo" />
        </div>
        <div className="monitor-title">
          <p className="eyebrow">Barbería &amp; tatuaje · Cartagena</p>
          <h1>
            Turnos <span className="serif">en vivo</span>
          </h1>
        </div>
        <div className="monitor-meta">
          <div className="monitor-clock-block">
            <MonitorClock />
            <p
              className="monitor-connection"
              role="status"
              data-online={online || undefined}
              data-alert={alert || undefined}
            >
              <span className="monitor-connection-dot" aria-hidden="true" />
              {online
                ? "En línea"
                : queue
                  ? "Reconectando · datos sin actualizar"
                  : error
                    ? "Reconectando…"
                    : "Conectando…"}
            </p>
          </div>
          <FullscreenToggle />
        </div>
      </header>

      <div className="monitor-board">
        <section
          className="monitor-col monitor-called"
          aria-labelledby="monitor-called-title"
          data-count={Math.min(called.length, 4)}
        >
          <h2 id="monitor-called-title" className="monitor-col-title">
            <span className="live-dot" aria-hidden="true" />
            Llamando
          </h2>
          <div className="monitor-called-list" aria-live="polite">
            {called.length ? (
              called.map((t) => (
                <article key={t.number} className="monitor-call">
                  <strong className="monitor-number">{t.number}</strong>
                  <p className="monitor-call-meta">
                    <b>{t.barber}</b>
                    <span>{t.service}</span>
                  </p>
                </article>
              ))
            ) : pending ? (
              <p className="monitor-empty monitor-empty-called">{pending}</p>
            ) : (
              <div className="monitor-empty monitor-empty-called">
                <p className="monitor-empty-title">Atentos a la pantalla</p>
                <p>El próximo número aparecerá aquí.</p>
              </div>
            )}
          </div>
        </section>

        <section
          className="monitor-col monitor-serving"
          aria-labelledby="monitor-serving-title"
        >
          <h2 id="monitor-serving-title" className="monitor-col-title">
            En atención
          </h2>
          {serving.length ? (
            <ul className="monitor-list">
              {serving.map((t) => (
                <li key={t.number} className="monitor-row">
                  <strong className="monitor-row-number">{t.number}</strong>
                  <span className="monitor-row-meta">
                    <b>{t.barber}</b> · {t.service}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="monitor-empty">
              {pending ?? "Sin atenciones en curso."}
            </p>
          )}
        </section>

        <section
          className="monitor-col monitor-next"
          aria-labelledby="monitor-next-title"
        >
          <h2 id="monitor-next-title" className="monitor-col-title">
            Siguientes
            {queue && (
              <span className="monitor-count">
                {waiting} en espera
              </span>
            )}
          </h2>
          {next.length ? (
            <ol className="monitor-next-grid">
              {next.map((t) => (
                <li key={t.number}>
                  <strong>{t.number}</strong>
                  <span>{t.barber}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="monitor-empty">{pending ?? "La fila está libre."}</p>
          )}
          {more > 0 && <p className="monitor-more">+{more} más en la fila</p>}
        </section>
      </div>

      <footer className="monitor-foot">
        <MonitorJoin />
        <p className="monitor-privacy">
          <Icon name="lock" />
          Solo se muestran número, profesional y servicio. Sin nombres ni
          teléfonos.
        </p>
        <Link href="/reservar" className="button button-outline button-small monitor-join-link">
          Elegir barbero y reservar <Icon name="ticket" />
        </Link>
      </footer>
    </main>
  );
}
