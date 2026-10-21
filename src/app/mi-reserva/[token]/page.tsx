import { whatsappUrl } from "../../../domain/business";
import type { Metadata } from "next";
import Link from "next/link";
import { createHash } from "node:crypto";
import { adminClient } from "../../../server/supabase/clients";
import { Header, Footer } from "../../../components/shell";
import { cancelBooking } from "./actions";
import { ReschedulePanel } from "../../../components/booking/reschedule-panel";
import { MAX_RESCHEDULES, checkReschedule, denialMessage } from "../../../domain/booking/reschedule-rules";
import { todayBogota } from "../../../domain/demo";

export const metadata: Metadata = { title: "Mi reserva", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function BookingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const hash = /^[A-Za-z0-9_-]{40,60}$/.test(token) ? createHash("sha256").update(token).digest("hex") : "invalid";
  const { data } = await adminClient().from("bookings").select("id,status,starts_at,price_cop,reschedule_count,services(slug,name),barbers(slug,display_name)").eq("access_token_hash", hash).maybeSingle();
  const date = data ? new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", dateStyle: "full", timeStyle: "short" }).format(new Date(data.starts_at)) : "";
  const serverNow = new Date();
  const canCancel = data?.status === "confirmada" && Date.parse(data.starts_at) - serverNow.getTime() > 2 * 60 * 60 * 1000;
  const joins = data as (typeof data & { services: {slug:string;name:string}|null; barbers:{slug:string;display_name:string}|null }) | null;
  const rule = data ? checkReschedule({ status: data.status, startsAt: Date.parse(data.starts_at), now: serverNow.getTime(), rescheduleCount: data.reschedule_count }) : null;
  return <><Header/><main className="flow-page booking-page"><section className="success-panel bk-success"><p className="eyebrow">Mi reserva</p>{joins ? <><h1>Detalles de tu cita</h1><dl className="bk-summary-list"><div><dt>Estado</dt><dd>{joins.status}</dd></div><div><dt>Servicio</dt><dd>{joins.services?.name}</dd></div><div><dt>Barbero</dt><dd>{joins.barbers?.display_name}</dd></div><div><dt>Fecha y hora</dt><dd>{date} (Bogotá)</dd></div><div><dt>Precio</dt><dd>{joins.price_cop.toLocaleString("es-CO")} COP</dd></div></dl>{rule?.ok && joins.services && joins.barbers && <ReschedulePanel token={token} today={todayBogota()} remaining={MAX_RESCHEDULES - (data?.reschedule_count ?? 0)}/>}{joins.status === "confirmada" && rule && !rule.ok && <p className="bk-reschedule-note">{denialMessage[rule.reason]}</p>}{joins.status === "confirmada" && <a className="button button-outline" href={`${whatsappUrl}?text=${encodeURIComponent(`Hola Elite, quiero reprogramar mi cita del ${date}.`)}`} target="_blank" rel="noopener noreferrer">Reprogramar por WhatsApp</a>}{canCancel && <form action={cancelBooking}><input type="hidden" name="token" value={token}/><button className="button button-outline" type="submit">Cancelar reserva</button></form>}</> : <><h1>No encontramos esta reserva</h1><p>Revisa el enlace de consulta o solicita ayuda por WhatsApp.</p></>}<Link className="button" href="/">Volver al inicio</Link></section></main><Footer/></>;
}
