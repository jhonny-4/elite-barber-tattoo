"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { barbers as catalogBarbers } from "../domain/catalog";
import type { Booking, TattooRequest } from "../domain/demo";
import type { QueueTicket } from "../domain/queue/model";
import type { TeamMember } from "../domain/team/model";
import type { DemoNotification } from "../domain/notifications/model";
import type {
  CommandResult,
  DemoCommand,
  SharedState,
} from "../services/contracts/demo";

/**
 * Adaptador del panel: entrega el mismo contrato que `useDemo()` (estado y `dispatch`)
 * para que los componentes del diseño original funcionen sin cambios, pero lee y
 * escribe en Supabase por `/api/equipo` y `/api/fila`. El servidor valida rol y RLS.
 */

type Row = Record<string, unknown> & { id: string };
type Api = {
  bookings: Row[];
  queue: Row[];
  barbers: { id: string; slug: string; display_name: string; active: boolean }[];
  services: { id: string; slug: string }[];
  tattoos: Row[];
  notifications: Row[];
  hours: { barber_id: string; weekday: number; opens: string; closes: string }[];
};

const tz = "America/Bogota";
const dateOf = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date(iso));
const timeOf = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
const today = () => dateOf(new Date().toISOString());

const bookingStatus: Record<string, Booking["status"]> = {
  confirmada: "reservada-demo",
  en_atencion: "en-atencion",
  finalizada: "finalizada",
};
const fromSnake = (s: string) => s.replace(/_/g, "-");

function toState(api: Api, revision: number): SharedState {
  // Los componentes usan los IDs históricos del catálogo (barbero-1…); se traducen por slug.
  const localId = new Map(api.barbers.map((b) => [b.id, catalogBarbers.find((c) => c.slug === b.slug)?.id ?? b.slug]));
  const service = new Map(api.services.map((s) => [s.id, s.slug]));
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  // Las citas pendientes de pago no se operan en el panel hasta que Bold las confirme.
  const bookings: Booking[] = api.bookings.filter((b) => b.status !== "pendiente_pago").map((b) => ({
    id: b.id,
    barberId: localId.get(str(b.barber_id)) ?? "",
    serviceId: service.get(str(b.service_id)) ?? "",
    date: dateOf(str(b.starts_at)),
    time: timeOf(str(b.starts_at)),
    name: str(b.customer_name),
    phone: str(b.customer_phone),
    status: bookingStatus[str(b.status)] ?? "cancelada",
    source: "online",
  }));
  const queue: QueueTicket[] = api.queue.map((t) => ({
    id: t.id,
    token: "",
    number: `E-${String(t.number).padStart(3, "0")}`,
    date: today(),
    name: str(t.customer_name),
    phone: str(t.customer_phone),
    serviceId: service.get(str(t.service_id)) ?? "",
    barberId: t.barber_id ? localId.get(str(t.barber_id)) ?? "any" : "any",
    assignedBarberId: t.barber_id ? localId.get(str(t.barber_id)) : undefined,
    source: "qr",
    status: fromSnake(str(t.status)) as QueueTicket["status"],
    createdAt: str(t.created_at),
  }));
  const requests: TattooRequest[] = api.tattoos.map((r) => ({
    id: r.id,
    name: str(r.customer_name),
    phone: str(r.customer_phone),
    idea: str(r.idea),
    placement: str(r.placement),
    size: str(r.size),
    referenceName: r.reference_path ? "Referencia" : null,
    status: fromSnake(str(r.status)) as TattooRequest["status"],
    quote: typeof r.quote_cop === "number" ? { amount: r.quote_cop, deposit: Number(r.deposit_cop ?? 0), notes: str(r.quote_notes) } : undefined,
  }));
  const team: TeamMember[] = api.barbers.map((b) => {
    const rows = api.hours.filter((h) => h.barber_id === b.id);
    return {
      id: localId.get(b.id) ?? b.slug,
      active: b.active,
      open: rows[0]?.opens.slice(0, 5) ?? "10:00",
      close: rows[0]?.closes.slice(0, 5) ?? "18:00",
      days: rows.map((h) => h.weekday),
      pauses: [],
      absences: [],
    };
  });
  const notifications: DemoNotification[] = api.notifications.map((n) => ({
    id: n.id,
    text: n.sent_at ? "Correo de confirmación enviado" : `Correo pendiente: ${str(n.last_error) || "en cola"}`,
    createdAt: str(n.sent_at) || new Date().toISOString(),
    read: Boolean(n.sent_at),
    channel: "app",
  }));
  return {
    version: 1,
    schema: 4,
    revision,
    bookings,
    requests,
    queue,
    team,
    notifications,
    receipts: [],
    unavailableBarberIds: team.filter((m) => !m.active).map((m) => m.id),
  };
}

/**
 * Avisa de citas, turnos y solicitudes nuevas desde la última lectura (evento `elite-panel-new`,
 * que escucha <PanelAlerts/> para sonar y notificar). La primera carga solo memoriza.
 */
function announce(state: SharedState, seen: { current: Set<string> | null }) {
  const items = [
    ...state.bookings.filter((b) => b.status !== "cancelada").map((b) => ({ id: `b:${b.id}`, title: "Nueva cita", body: `${b.name} · ${b.date} ${b.time}` })),
    ...state.queue.map((t) => ({ id: `q:${t.id}`, title: "Nuevo turno en la fila", body: `${t.number} · ${t.name}` })),
    ...state.requests.map((r) => ({ id: `r:${r.id}`, title: "Nueva solicitud de tatuaje", body: r.name })),
  ];
  const first = seen.current === null;
  const known = seen.current ?? new Set<string>();
  const fresh = items.filter((i) => !known.has(i.id));
  seen.current = new Set(items.map((i) => i.id));
  if (!first && fresh.length) window.dispatchEvent(new CustomEvent("elite-panel-new", { detail: fresh }));
}

const empty = toState({ bookings: [], queue: [], barbers: [], services: [], tattoos: [], notifications: [], hours: [] }, 0);

export function usePanel() {
  const [state, setState] = useState<SharedState>(empty);
  const [status, setStatus] = useState({ online: true, ready: false, error: "" });
  const api = useRef<Api | null>(null);
  const revision = useRef(0);
  const seen = useRef<Set<string> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/equipo?date=${today()}&before=60&after=60`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "No se pudo cargar el panel.");
      api.current = body as Api;
      revision.current += 1;
      const next = toState(body as Api, revision.current);
      announce(next, seen);
      setState(next);
      setStatus({ online: true, ready: true, error: "" });
      return next;
    } catch (error) {
      setStatus({ online: navigator.onLine, ready: true, error: error instanceof Error ? error.message : "Sin conexión." });
      throw error;
    }
  }, []);

  useEffect(() => {
    void refresh().catch(() => undefined);
    const timer = window.setInterval(() => void refresh().catch(() => undefined), 15000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const dispatch = useCallback(
    async (command: DemoCommand): Promise<CommandResult> => {
      const data = api.current;
      const uuid = (local?: string) =>
        data?.barbers.find((b) => (catalogBarbers.find((c) => c.id === local)?.slug ?? local) === b.slug)?.id;
      const post = async (url: string, body: unknown) => {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
          body: JSON.stringify(body),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error ?? "No se pudo guardar.");
      };
      switch (command.type) {
        case "booking.change": {
          const { id, action } = command;
          if (action === "reschedule")
            await post("/api/equipo", { kind: "reschedule", id, date: command.date, time: command.time, barberId: uuid(command.barberId) });
          else if (action === "checkin") await post("/api/equipo", { kind: "checkin", id });
          else {
            const status = { cancel: "cancelada", start: "en_atencion", finish: "finalizada", call: "" }[action];
            if (!status) throw new Error("Registra la llegada para llamar al cliente desde la fila.");
            await post("/api/equipo", { kind: "booking", id, status });
          }
          break;
        }
        case "queue.change": {
          const status = { call: "llamado", start: "en_atencion", finish: "finalizado", cancel: "cancelado" }[command.action];
          await post("/api/equipo", { kind: "queue", id: command.id, status });
          break;
        }
        case "queue.join":
          await post("/api/fila", { type: "queue.join", input: command.input });
          break;
        case "tattoo.change":
          await post("/api/equipo", { kind: "tattoo", id: command.id, status: command.status.replace(/-/g, "_") });
          break;
        case "team.save": {
          const { member } = command;
          const id = uuid(member.id);
          if (!id) throw new Error("Profesional no encontrado.");
          const name = data?.barbers.find((b) => b.id === id)?.display_name ?? member.id;
          await post("/api/equipo", { kind: "barber", id, name, active: member.active });
          await post("/api/equipo", {
            kind: "hours",
            id,
            hours: member.days.map((weekday) => ({ weekday, opens: member.open, closes: member.close })),
          });
          break;
        }
        case "notifications.read":
          break;
        default:
          throw new Error("Esta acción no está disponible.");
      }
      return { state: await refresh() };
    },
    [refresh],
  );

  // Sincronización por sondeo cada 15 s: no hay canal en vivo.
  return { state, ...status, live: false, dispatch, refresh, reset: () => Promise.reject(new Error("No disponible.")) };
}
