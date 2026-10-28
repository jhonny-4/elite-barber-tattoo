import "server-only";
import { createHash } from "node:crypto";
import { adminClient } from "./supabase/clients";

export type PublicReview = { id: string; rating: number; comment: string | null; author: string; barber: string; createdAt: string };
export type BarberRating = { average: number; count: number };

const TOKEN = /^[A-Za-z0-9_-]{40,60}$/;
export const firstName = (name: string) => (name.trim().split(/\s+/)[0] ?? "").slice(0, 40) || "Cliente";

/** Cita finalizada a la que pertenece el enlace privado, con su reseña si ya existe. */
export async function reviewTarget(token: string) {
  if (!TOKEN.test(token)) return null;
  const hash = createHash("sha256").update(token).digest("hex");
  const { data } = await adminClient()
    .from("bookings")
    .select("id,status,barber_id,customer_name,barbers(display_name),reviews(id,rating)")
    .eq("access_token_hash", hash)
    .maybeSingle();
  if (!data) return null;
  const row = data as typeof data & { barbers: { display_name: string } | null; reviews: { id: string; rating: number } | { id: string; rating: number }[] | null };
  const review = Array.isArray(row.reviews) ? row.reviews[0] ?? null : row.reviews;
  return { id: row.id, finished: row.status === "finalizada", barberId: row.barber_id, barber: row.barbers?.display_name ?? "Elite", customer: row.customer_name, review };
}

/** Reseñas aprobadas más recientes. Sin base disponible (build de CI) devuelve vacío. */
export async function publicReviews(limit = 12): Promise<PublicReview[]> {
  try {
    const { data, error } = await adminClient()
      .from("reviews")
      .select("id,rating,comment,author_name,created_at,barbers(display_name)")
      .eq("status", "aprobada")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return [];
    return (data ?? []).map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      author: r.author_name,
      barber: (r as unknown as { barbers: { display_name: string } | null }).barbers?.display_name ?? "Elite",
      createdAt: r.created_at,
    }));
  } catch {
    return [];
  }
}

/** Promedio y cantidad de reseñas aprobadas por barbero (id de Supabase). */
export async function barberRatings(): Promise<Record<string, BarberRating>> {
  try {
    const { data, error } = await adminClient().from("reviews").select("barber_id,rating").eq("status", "aprobada").limit(5000);
    if (error) return {};
    const acc: Record<string, { sum: number; count: number }> = {};
    for (const r of data ?? []) {
      const a = (acc[r.barber_id] ??= { sum: 0, count: 0 });
      a.sum += r.rating;
      a.count += 1;
    }
    return Object.fromEntries(Object.entries(acc).map(([id, a]) => [id, { average: Math.round((a.sum / a.count) * 10) / 10, count: a.count }]));
  } catch {
    return {};
  }
}
