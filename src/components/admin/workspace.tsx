"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { usePanel as useDemo } from "../../lib/use-panel";
import { bogotaDate } from "../../domain/queue/logic";
import { activeTicket } from "../../domain/queue/model";
import type { DemoCommand, SharedState } from "../../services/contracts/demo";
import { EliteLogo } from "../brand/logos";
import { ConfirmAction } from "../confirm-action";
import { Icon } from "../icons";
import { AgendaSection } from "./agenda";
import { BarberView } from "./barber-view";
import { BlockPanel } from "./block-panel";
import { CajaSection } from "./caja-section";
import { ClientsSection, groupClients } from "./clients";
import { isClosedBooking } from "./labels";
import { NotificationsSection } from "./notifications";
import { OverviewSection, type SectionId } from "./overview";
import { QueueSection } from "./queue-section";
import { useCommandRunner, useNow, type Runner } from "./runner";
import { TattooSection } from "./tattoo-section";
import { TeamEditor } from "./team-editor";
import { barbers } from "../../domain/catalog";
import { PanelHead, SessionBar, Toasts, type IconName } from "./ui";

const sections: {
  id: SectionId;
  label: string;
  icon: IconName;
  title: string;
  serif: string;
  lead: string;
}[] = [
  {
    id: "resumen",
    label: "Resumen",
    icon: "grid",
    title: "Resumen",
    serif: "del estudio.",
    lead: "Lo importante de hoy en Elite: citas, fila, solicitudes de tatuaje, equipo y avisos.",
  },
  {
    id: "citas",
    label: "Agenda",
    icon: "calendar",
    title: "Agenda",
    serif: "de citas.",
    lead: "Reservas online y presenciales por día. Inicia, finaliza, reprograma o cancela con confirmación.",
  },
  {
    id: "fila",
    label: "Fila y QR",
    icon: "ticket",
    title: "Fila",
    serif: "y turnos QR.",
    lead: "Clientes sin cita registrados en recepción o con el QR. La pantalla pública se actualiza al instante.",
  },
  {
    id: "solicitudes",
    label: "Tatuajes",
    icon: "needle",
    title: "Tatuajes",
    serif: "por valorar.",
    lead: "Ideas enviadas para la valoración de Jean Carlos. Cada cotización se hace a mano, sin precios automáticos.",
  },
  {
    id: "clientes",
    label: "Clientes",
    icon: "users",
    title: "Clientes",
    serif: "agrupados.",
    lead: "Contactos reunidos por teléfono a partir de citas, turnos y solicitudes de tatuaje.",
  },
  {
    id: "equipo",
    label: "Equipo",
    icon: "scissors",
    title: "Equipo",
    serif: "y jornadas.",
    lead: "Profesionales, horarios, descansos y ausencias de ejemplo. Cada cambio se valida contra la agenda.",
  },
  {
    id: "caja",
    label: "Caja",
    icon: "cash",
    title: "Caja",
    serif: "del día.",
    lead: "Servicios finalizados por profesional, lo pagado en línea frente a lo que se cobra en el local, y el cierre del día para imprimir.",
  },
  {
    id: "avisos",
    label: "Avisos",
    icon: "bell",
    title: "Avisos",
    serif: "y correos.",
    lead: "Confirmaciones enviadas a clientes y correos pendientes.",
  },
];

const isSection = (value: string | null): value is SectionId =>
  sections.some((s) => s.id === value);

/** Panel administrativo. Con `professionalOnly` muestra la vista de barbero. */
export function AdminWorkspace({
  professionalOnly = false,
  onExit,
  barberSlug,
}: {
  professionalOnly?: boolean;
  onExit?: () => void;
  barberSlug?: string | null;
}) {
  return professionalOnly ? (
    <BarberView onExit={onExit} lockedSlug={barberSlug} />
  ) : (
    <OwnerWorkspace onExit={onExit} />
  );
}

function OwnerWorkspace({ onExit }: { onExit?: () => void }) {
  const demo = useDemo();
  const params = useSearchParams();
  const requested = params.get("tab");
  const [tab, setTab] = useState<SectionId>(
    isSection(requested) ? requested : "resumen",
  );
  const now = useNow();
  const runner = useCommandRunner(demo.dispatch, demo.online);
  const state = demo.state;
  const today = bogotaDate(now);
  const top = useRef<HTMLDivElement>(null);
  const nav = useRef<HTMLElement>(null);
  const clients = useMemo(() => groupClients(state, today), [state, today]);
  const current = sections.find((s) => s.id === tab) ?? sections[0];

  // Un enlace externo con ?tab= también cambia de sección.
  useEffect(() => {
    if (isSection(requested)) setTab(requested);
  }, [requested]);

  // En móvil, la pestaña activa queda visible dentro de la barra desplazable.
  useEffect(() => {
    const scroller = nav.current;
    const active = scroller?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!scroller || !active || scroller.scrollWidth <= scroller.clientWidth) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scroller.scrollTo({
      left: active.offsetLeft - (scroller.clientWidth - active.offsetWidth) / 2,
      behavior: reduce ? "auto" : "smooth",
    });
  }, [tab]);

  function go(id: SectionId) {
    setTab(id);
    const url = new URLSearchParams(window.location.search);
    url.set("tab", id);
    window.history.replaceState(null, "", `?${url.toString()}`);
    const start = top.current;
    if (start && start.getBoundingClientRect().top < 0)
      start.scrollIntoView({ block: "start" });
  }

  const unread = state.notifications.filter((n) => !n.read).length;
  const counts: Partial<Record<SectionId, { value: number; label: string; alert?: boolean }>> = {
    citas: {
      value: state.bookings.filter((b) => b.date === today && !isClosedBooking(b)).length,
      label: "citas activas hoy",
    },
    fila: {
      value: state.queue.filter((t) => t.date === today && activeTicket(t)).length + state.bookings.filter((b) => b.date === today && !isClosedBooking(b) && (b.arrivedAt || b.status === "en-atencion")).length,
      label: "turnos activos",
    },
    solicitudes: {
      value: state.requests.filter((r) => r.status === "pendiente").length,
      label: "solicitudes pendientes",
    },
    clientes: { value: clients.length, label: "clientes" },
    avisos: { value: unread, label: "avisos sin leer", alert: unread > 0 },
  };

  return (
    <div className="adm" data-view="owner">
      <aside className="adm-side" aria-label="Navegación del panel">
        <div className="adm-side-brand">
          <EliteLogo className="adm-side-logo" title="Elite Barber & Tattoo" />
          <p className="adm-side-title">Panel administrativo</p>
          <p className="adm-side-role">Jean Carlos · propietario</p>
        </div>
        <nav className="adm-nav" ref={nav} aria-label="Secciones del panel">
          {sections.map((section) => {
            const count = counts[section.id];
            return (
              <button
                key={section.id}
                type="button"
                className="adm-nav-item"
                aria-current={tab === section.id ? "page" : undefined}
                onClick={() => go(section.id)}
              >
                <Icon name={section.icon} />
                <span className="adm-nav-label">{section.label}</span>
                {count && count.value > 0 ? (
                  <span className="adm-nav-count" data-tone={count.alert ? "alert" : undefined}>
                    <span aria-hidden="true">{count.value}</span>
                    <span className="visually-hidden">
                      , {count.value} {count.label}
                    </span>
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
        <div className="adm-side-links">
          <Link href="/pantalla-turnos" target="_blank" rel="noopener noreferrer">
            <Icon name="screen" />
            Pantalla de turnos
            <span className="visually-hidden"> (abre otra pestaña)</span>
          </Link>
          <Link href="/barbero">
            <Icon name="scissors" />
            Vista de barbero
          </Link>
          <Link href="/">
            <Icon name="arrow" />
            Web pública
          </Link>
        </div>
      </aside>

      <div className="adm-main" ref={top}>
        <div className="adm-wrap">
          <SessionBar role="Jean Carlos · propietario" onExit={onExit} />
          <PanelHead
            eyebrow="Elite / Panel administrativo"
            title={current.title}
            serif={current.serif}
            lead={current.lead}
            now={now}
            ready={demo.ready}
            online={demo.online}
            live={demo.live}
            revision={state.revision}
          />
          {demo.ready && !demo.online ? (
            <p className="notice adm-banner" data-tone="alert" role="alert">
              <Icon name="offline" />
              {demo.error ||
                "Sin conexión con el servidor. Los datos pueden estar desactualizados y no se pueden confirmar operaciones."}
            </p>
          ) : null}

          {!demo.ready ? (
            <p className="loading-state">Conectando con el servidor…</p>
          ) : (
            <div className="adm-section" data-section={tab}>
              {tab === "resumen" ? (
                <OverviewSection state={state} today={today} now={now} go={go} />
              ) : null}
              {tab === "citas" ? (
                <AgendaSection state={state} runner={runner} today={today} />
              ) : null}
              {tab === "fila" ? (
                <QueueSection state={state} runner={runner} today={today} />
              ) : null}
              {tab === "solicitudes" ? (
                <TattooSection state={state} runner={runner} refresh={demo.refresh} />
              ) : null}
              {tab === "clientes" ? (
                <ClientsSection clients={clients} today={today} />
              ) : null}
              {tab === "equipo" ? <TeamSection state={state} runner={runner} /> : null}
              {tab === "caja" ? <CajaSection /> : null}
              {tab === "avisos" ? (
                <NotificationsSection state={state} runner={runner} today={today} />
              ) : null}
            </div>
          )}

          {/* Restablecer datos no aplica en producción. */}

          <nav className="adm-foot-links" aria-label="Otros accesos">
            <Link className="text-link" href="/pantalla-turnos" target="_blank" rel="noopener noreferrer">
              <Icon name="screen" />
              Pantalla de turnos
              <span className="visually-hidden"> (abre otra pestaña)</span>
            </Link>
            <Link className="text-link" href="/barbero">
              <Icon name="scissors" />
              Vista de barbero
            </Link>
            <Link className="text-link" href="/">
              <Icon name="arrow" />
              Web pública
            </Link>
          </nav>
        </div>
      </div>
      <Toasts feedback={runner.feedback} onDismiss={runner.dismiss} />
    </div>
  );
}

function TeamSection({ state, runner }: { state: SharedState; runner: Runner }) {
  return (
    <div className="adm-team">
      <p className="form-disclaimer">
        Jornadas, descansos y ausencias de ejemplo. Si un cambio deja fuera una
        cita existente, el servidor lo rechaza: reprográmala o cancélala primero.
      </p>
      {state.team.map((member) => {
        const save: DemoCommand = { type: "team.save", member };
        const profile = barbers.find((b) => b.id === member.id);
        return (
          <div className="pnl-member" key={member.id}>
            <TeamEditor
              key={JSON.stringify(member)}
              member={member}
              busy={runner.busy || !runner.online}
              saving={runner.control(save)["aria-busy"] === true}
              onSave={(draft) => runner.run({ type: "team.save", member: draft })}
            />
            {profile ? <BlockPanel slug={profile.slug} name={profile.name} /> : null}
          </div>
        );
      })}
    </div>
  );
}

