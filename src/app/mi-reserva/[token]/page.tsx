import type { Metadata } from "next";
import Link from "next/link";
import { createHash } from "node:crypto";
import { adminClient } from "../../../server/supabase/clients";
import { Header, Footer } from "../../../components/shell";
import { cancelBooking } from "./actions";

export const metadata: Metadata = { title: "Mi reserva", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function BookingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const hash = /^[A-Za-z0-9_-]{40,60}$/.test(token) ? createHash("sha256").update(token).digest("hex") : "invalid";
  const { data } = await adminClient().from("bookings").select("id,status,starts_at,price_cop,services(name),barbers(display_name)").eq("access_token_hash", hash).maybeSingle();
  const date = data ? new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", dateStyle: "full", timeStyle: "short" }).format(new Date(data.starts_at)) : "";
  const serverNow = new Date();
  const canCancel = data?.status === "confirmada" && Date.parse(data.starts_at) - serverNow.getTime() > 2 * 60 * 60 * 1000;
  const joins = data as (typeof data & { services: {name:string}|null; barbers:{display_name:string}|null }) | null;
  return <><Header/><main className="flow-page booking-page"><section className="success-panel bk-success"><p className="eyebrow">Mi reserva</p>{joins ? <><h1>Detalles de tu cita</h1><dl className="bk-summary-list"><div><dt>Estado</dt><dd>{joins.status}</dd></div><div><dt>Servicio</dt><dd>{joins.services?.name}</dd></div><div><dt>Barbero</dt><dd>{joins.barbers?.display_name}</dd></div><div><dt>Fecha y hora</dt><dd>{date} (Bogotá)</dd></div><div><dt>Precio</dt><dd>{joins.price_cop.toLocaleString("es-CO")} COP</dd></div></dl>{canCancel && <form action={cancelBooking}><input type="hidden" name="token" value={token}/><button className="button button-outline" type="submit">Cancelar reserva</button></form>}</> : <><h1>No encontramos esta reserva</h1><p>Revisa el enlace de consulta o solicita ayuda por WhatsApp.</p></>}<Link className="button" href="/">Volver al inicio</Link></section></main><Footer/></>;
}
