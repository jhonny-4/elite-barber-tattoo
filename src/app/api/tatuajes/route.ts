import { randomUUID } from "node:crypto";
import { adminClient } from "../../../server/supabase/clients";
import { BookingError } from "../../../server/bookings";
import { contact } from "../../../server/public-forms";
import {
  readJson,
  sameOrigin,
  noStore,
  errorResponse,
} from "../../../server/bookings/http";
import { decodeReferenceDataUrl } from "../../../server/demo/store/references";
import { limitPublic } from "../../../server/rate-limit";
export async function POST(request: Request) {
  try {
    if (!sameOrigin(request))
      throw new BookingError("Origen no permitido.", 403);
    limitPublic(request, "tatuajes");
    const body = await readJson(request, 1_500_000);
    const input = body.input as Record<string, unknown>;
    if (!input || typeof input !== "object")
      throw new BookingError("Solicitud inválida.");
    const { name, phone } = contact(input);
    const email = String(input.email ?? "")
        .trim()
        .toLowerCase(),
      idea = String(input.idea ?? "").trim();
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 254 ||
      idea.length < 10 ||
      idea.length > 1500 ||
      String(input.placement ?? "").length > 80 ||
      String(input.size ?? "").length > 80
    )
      throw new BookingError("Revisa correo, idea, zona y tamaño.");
    const key = request.headers.get("idempotency-key");
    if (!key || !/^[a-f0-9-]{36}$/.test(key))
      throw new BookingError("Referencia inválida.");
    const db = adminClient();
    const { data: existing, error: lookupError } = await db
      .from("tattoo_requests")
      .select("id")
      .eq("id", key)
      .maybeSingle();
    if (lookupError) throw new Error("No se pudo comprobar la solicitud.");
    if (existing)
      return Response.json({ id: existing.id }, { headers: noStore });
    let referencePath: string | null = null;
    if (input.referenceDataUrl) {
      const image = decodeReferenceDataUrl(String(input.referenceDataUrl));
      referencePath = `${key}/${randomUUID()}`;
      const { error } = await db.storage
        .from("referencias")
        .upload(referencePath, image.bytes, { contentType: image.contentType });
      if (error) throw new Error("No se pudo guardar la referencia privada.");
    }
    const { error } = await db
      .from("tattoo_requests")
      .insert({
        id: key,
        customer_name: name,
        customer_phone: phone,
        customer_email: email,
        idea,
        placement: String(input.placement ?? ""),
        size: String(input.size ?? ""),
        reference_path: referencePath,
      });
    if (error) {
      if (referencePath)
        await db.storage.from("referencias").remove([referencePath]);
      if (error.code !== "23505")
        throw new Error("No se pudo guardar la solicitud.");
    }
    return Response.json({ id: key }, { status: 201, headers: noStore });
  } catch (e) {
    return errorResponse(e);
  }
}
