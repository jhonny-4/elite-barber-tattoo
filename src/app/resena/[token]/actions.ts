"use server";
import { redirect } from "next/navigation";
import { adminClient } from "../../../server/supabase/clients";
import { firstName, reviewTarget } from "../../../server/reviews";

/** Guarda la reseña de una cita finalizada (una sola por cita; queda pendiente de aprobación). */
export async function submitReview(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment") ?? "").trim().slice(0, 400);
  const target = await reviewTarget(token);
  if (!target) redirect("/");
  if (!target.finished || target.review || !Number.isInteger(rating) || rating < 1 || rating > 5) redirect(`/resena/${token}`);
  const { error } = await adminClient().from("reviews").insert({
    booking_id: target.id,
    barber_id: target.barberId,
    rating,
    comment: comment || null,
    author_name: firstName(target.customer),
  });
  // La restricción única impide una segunda reseña aunque lleguen dos envíos a la vez.
  if (error && error.code !== "23505") console.error("Reseña: no se pudo guardar.", error.message);
  redirect(`/resena/${token}?gracias=1`);
}
