"use client";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { usePublicQueue } from "../../lib/use-public-queue";
import type { PublicTicket } from "../../services/contracts/demo";
import { Brand } from "../media";
import { Icon } from "../icons";
import { HomeMarquee } from "../home/marquee";
import { CallSound } from "./call-sound";
import { defaultQueueUrl, readQueueUrl, useQrImage, validQueueUrl } from "./qr";
import { useFullscreen, useIdle, useOledShift, useWakeLock } from "./tv-hooks";
import { TvShowcase, type ShowcaseService } from "./tv-showcase";
import "../../styles/areas/tv.css";

const ZONE = "America/Bogota";
const timeFormat = new Intl.DateTimeFormat("es-CO", { timeZone: ZONE, hour: "numeric", minute: "2-digit", hour12: true });
const dateFormat = new Intl.DateTimeFormat("es-CO", { timeZone: ZONE, weekday: "long", day: "numeric", month: "long" });

/** Acentos sobrios por barbero, según su orden en el catálogo. */
const BARBER_COLORS = ["#7aa7d1", "#d0ab6c", "#86b79b", "#b58fcf"];
const CALL_MS = 5000;
const IDLE_MS = 60_000;
const DEMO_IDLE_MS = 8_000;

type Barber = { id: string; display_name: string };

function MonitorClock() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);
  if (now === null) return <div className="tv-clock" aria-hidden="true"><span className="tv-time">--:--</span></div>;
  const parts = timeFormat.formatToParts(now);
  const time = parts
    .filter((p) => p.type === "hour" || p.type === "minute" || (p.type === "literal" && p.value.trim() === ":"))
    .map((p) => p.value)
    .join("");
  const period = parts.find((p) => p.type === "dayPeriod")?.value ?? "";
  return (
    <div className="tv-clock">
      <time className="tv-time" dateTime={new Date(now).toISOString()}>
        {time}
        <small>{period}</small>
      </time>
      <span className="tv-date">{dateFormat.format(now)}</span>
    </div>
  );
}

/** QR permanente para tomar turno o reservar. */
function TvJoin({ floating = false }: { floating?: boolean }) {
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
  const { image } = useQrImage(url, 480);
  return (
    <aside className={`tv-join${floating ? " tv-join-floating" : ""}`} aria-label="Toma tu turno o reserva aquí">
      <div className="tv-join-card">
        <p className="tv-join-eyebrow">Escanea con tu cámara</p>
        <div className="tv-qr">
          {image && <img src={image} width={240} height={240} alt="Código QR para tomar turno o reservar en Elite Barber & Tattoo" />}
          <i className="tv-qr-scan" aria-hidden="true" />
          <i className="tv-qr-corners" aria-hidden="true" />
        </div>
        <p className="tv-join-text">
          <b>Toma tu turno</b>
          <span>o reserva tu cita</span>
        </p>
      </div>
    </aside>
  );
}

const colorOf = (order: string[], barber: string) => BARBER_COLORS[Math.max(0, order.indexOf(barber)) % BARBER_COLORS.length];
const waitLabel = (t: PublicTicket) =>
  t.estimatedMinutes === null ? null : t.estimatedMinutes <= 0 ? "Ahora" : `≈ ${t.estimatedMinutes} min`;
const ticketKey = (t: PublicTicket) => `${t.number}:${t.status}:${t.barber}`;

/** Número con dígitos separados para que cada uno entre con su propio giro 3D. */
function Digits({ value, className }: { value: string; className: string }) {
  return (
    <strong className={className} aria-label={value}>
      {[...value].map((d, i) => (
        <span key={`${i}-${d}`} aria-hidden="true" style={{ "--i": i } as CSSProperties}>
          {d}
        </span>
      ))}
    </strong>
  );
}

function CallOverlay({ ticket, color }: { ticket: PublicTicket; color: string }) {
  return (
    <div className="tv-callfx" role="alert" aria-label={`Turno ${ticket.number}, pasar con ${ticket.barber}`} style={{ "--barber": color } as CSSProperties}>
      <div className="tv-callfx-rays" aria-hidden="true" />
      <div className="tv-callfx-flash" aria-hidden="true" />
      <div className="tv-callfx-wipe" aria-hidden="true" />
      <div className="tv-callfx-card">
        <p className="tv-callfx-kicker">
          <span aria-hidden="true" />
          Llamando turno
          <span aria-hidden="true" />
        </p>
        <Digits value={ticket.number} className="tv-callfx-number" />
        <p className="tv-callfx-barber">
          Pasa con <b>{ticket.barber}</b>
        </p>
        <p className="tv-callfx-service">{ticket.service}</p>
      </div>
      <div className="tv-callfx-ribbon" aria-hidden="true">
        <HomeMarquee />
      </div>
    </div>
  );
}

export function QueueMonitor() {
  const { queue, error, online } = usePublicQueue();
  const { supported, active, enter } = useFullscreen();
  const shift = useRef<HTMLDivElement>(null);
  useWakeLock();
  useOledShift(shift);

  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<ShowcaseService[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/reservas/catalogo", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setBarbers(data.barbers ?? []);
        setServices(data.services ?? []);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const called = useMemo(() => queue?.called ?? [], [queue]);
  const serving = useMemo(() => queue?.serving ?? [], [queue]);
  const next = useMemo(() => queue?.next ?? [], [queue]);
  const waiting = queue?.waiting ?? 0;

  // Orden estable de barberos: catálogo y, si falta alguno, los nombres vistos en la fila.
  const order = useMemo(() => {
    const names = barbers.map((b) => b.display_name);
    for (const t of [...called, ...serving, ...next]) if (!names.includes(t.barber)) names.push(t.barber);
    return names;
  }, [barbers, called, serving, next]);

  // Animación de llamado: solo para números que aparecen después de la primera carga.
  const seen = useRef<Set<string> | null>(null);
  const [announce, setAnnounce] = useState<PublicTicket[]>([]);
  useEffect(() => {
    if (!queue) return;
    const fresh = called.filter((t) => !seen.current?.has(t.number));
    const first = seen.current === null;
    seen.current = new Set(called.map((t) => t.number));
    if (!first && fresh.length) setAnnounce((list) => [...list, ...fresh]);
  }, [queue, called]);
  const showing = announce[0];
  useEffect(() => {
    if (!showing) return;
    const timer = setTimeout(() => setAnnounce((list) => list.slice(1)), CALL_MS);
    return () => clearTimeout(timer);
  }, [showing]);

  // Modo vitrina tras 60 s sin cambios y sin turnos llamados.
  const [demo, setDemo] = useState(false);
  useEffect(() => {
    // ?demoVitrina=1 acorta los tiempos para probar; solo fuera de producción.
    setDemo(process.env.NODE_ENV !== "production" && new URLSearchParams(window.location.search).has("demoVitrina"));
  }, []);
  const signature = useMemo(() => [...called, ...serving, ...next].map(ticketKey).join("|"), [called, serving, next]);
  const { idle, wake } = useIdle(signature, called.length > 0 || announce.length > 0 || !queue, demo ? DEMO_IDLE_MS : IDLE_MS);

  const hero: { ticket: PublicTicket; label: string } | null = called[0]
    ? { ticket: called[0], label: "Llamando" }
    : serving[0]
      ? { ticket: serving[0], label: "En atención" }
      : next[0]
        ? { ticket: next[0], label: "Siguiente turno" }
        : null;
  const heroColor = hero ? colorOf(order, hero.ticket.barber) : "var(--steel-300)";
  const pending = queue ? null : error ? "Sin datos por ahora." : "Cargando…";
  const reconnecting = !online && Boolean(queue || error);

  return (
    <main id="main" className="tv" data-state={queue ? "ready" : "loading"} data-called={called.length > 0 || undefined}>
      <div className="tv-shift" ref={shift}>
        <header className="tv-head">
          <div className="tv-brand">
            <Brand className="tv-logo" />
            <p>
              <b>Turnos en vivo</b>
              <span>Barbería &amp; tatuaje · Cartagena</span>
            </p>
          </div>
          <div className="tv-meta">
            {reconnecting && (
              <p className="tv-reconnect" role="status">
                <span aria-hidden="true" />
                Reconectando…
              </p>
            )}
            <MonitorClock />
            {supported && !active && (
              <button type="button" className="tv-fullscreen" onClick={enter}>
                <Icon name="expand" aria-hidden="true" />
                Pantalla completa
              </button>
            )}
          </div>
        </header>

        <div className="tv-body">
        <section className="tv-hero" data-status={hero?.ticket.status ?? "empty"} style={{ "--barber": heroColor } as CSSProperties} aria-live="polite">
          <i className="tv-hero-sheen" aria-hidden="true" />
          <div className="tv-hero-main">
            {hero ? (
              <>
                <p className="tv-kicker">
                  <span className="tv-dot" aria-hidden="true" />
                  {hero.label}
                </p>
                <Digits key={hero.ticket.number} value={hero.ticket.number} className="tv-hero-number" />
                <p className="tv-hero-barber">
                  <span aria-hidden="true" />
                  {hero.ticket.barber}
                </p>
                <p className="tv-hero-service">{hero.ticket.service}</p>
                {called.length > 1 && (
                  <p className="tv-hero-more">
                    También llamando:{" "}
                    {called.slice(1).map((t) => (
                      <b key={t.number} style={{ "--barber": colorOf(order, t.barber) } as CSSProperties}>
                        {t.number} · {t.barber}
                      </b>
                    ))}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="tv-kicker">{pending ?? "Fila libre"}</p>
                {!pending && (
                  <>
                    <strong className="tv-hero-empty">
                      <span>Sin</span>
                      <span>espera</span>
                    </strong>
                    <p className="tv-hero-service">Escanea el código y toma tu turno</p>
                  </>
                )}
              </>
            )}
          </div>
          <TvJoin />
        </section>

        <section className="tv-barbers" aria-label="Turnos por profesional">
          {order.map((name) => {
            const color = colorOf(order, name);
            const now = serving.find((t) => t.barber === name) ?? called.find((t) => t.barber === name);
            const queued = next.filter((t) => t.barber === name);
            const extraCalled = serving.some((t) => t.barber === name) ? called.find((t) => t.barber === name) : undefined;
            return (
              <article key={name} className="tv-barber" style={{ "--barber": color } as CSSProperties}>
                <h2>
                  <span aria-hidden="true" />
                  {name}
                </h2>
                <div className="tv-now" data-status={now?.status ?? "free"}>
                  <p className="tv-label">{now?.status === "llamado" ? "Llamando" : "Atendiendo ahora"}</p>
                  {now ? (
                    <p className="tv-now-body">
                      <strong key={now.number}>{now.number}</strong>
                      <span>{now.service}</span>
                    </p>
                  ) : (
                    <p className="tv-free">Disponible</p>
                  )}
                  {extraCalled && <p className="tv-extra">Llamando: <b>{extraCalled.number}</b></p>}
                </div>
                <div className="tv-next">
                  <p className="tv-label">Siguientes</p>
                  {queued.length ? (
                    <ol>
                      {queued.slice(0, 3).map((t, i) => (
                        <li key={t.number} style={{ "--i": i } as CSSProperties}>
                          <strong>{t.number}</strong>
                          <span>{t.service}</span>
                          {waitLabel(t) && <em>{waitLabel(t)}</em>}
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="tv-free">{pending ?? "Sin espera"}</p>
                  )}
                  {queued.length > 3 && <p className="tv-more">+{queued.length - 3} más</p>}
                </div>
              </article>
            );
          })}
          {!order.length && <p className="tv-free">{pending ?? "Sin profesionales activos"}</p>}
        </section>
        </div>

        <div className="tv-banner">
          <HomeMarquee />
        </div>

        <footer className="tv-foot">
          <CallSound tickets={queue ? called.map(({ number, barber }) => ({ number, barber })) : null} />
          <p>{waiting} en espera · solo se muestran número, profesional y servicio</p>
        </footer>
      </div>

      {showing && <CallOverlay key={showing.number} ticket={showing} color={colorOf(order, showing.barber)} />}
      {idle && !showing && (
        <>
          <TvShowcase services={services} onExit={wake} demo={demo} />
          <TvJoin floating />
        </>
      )}
    </main>
  );
}
