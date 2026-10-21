import "server-only";
import { createHash } from "node:crypto";
import { adminClient } from "./supabase/clients";
import { BookingError } from "./bookings";
export const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export function contact(input: Record<string, unknown>) {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const phone =
    typeof input.phone === "string" ? input.phone.replace(/[^\d+]/g, "") : "";
  if (name.length < 2 || name.length > 80 || !/^(?:\+57)?\d{10}$/.test(phone))
    throw new BookingError("Escribe un nombre y teléfono colombiano válidos.");
  return { name, phone };
}
export async function queueCatalog() {
  const db = adminClient();
  const [b, s, links] = await Promise.all([
    db
      .from("barbers")
      .select("id,slug,display_name")
      .eq("active", true)
      .order("sort_order"),
    db
      .from("services")
      .select("id,slug,name,duration_min")
      .eq("active", true)
      .order("sort_order"),
    db.from("barber_services").select("barber_id,service_id"),
  ]);
  if (b.error || s.error || links.error)
    throw new Error("No se pudo cargar la fila.");
  return { barbers: b.data, services: s.data, links: links.data };
}
