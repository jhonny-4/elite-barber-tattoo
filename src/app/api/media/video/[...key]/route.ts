import { getStaff } from "../../../../../server/auth/staff";
import { adminClient } from "../../../../../server/supabase/clients";
import { VIDEO_MIME_BY_EXT, parseVideoKey } from "../../../../../domain/gallery";
import { R2_PREFIX, getObject, r2Configured } from "../../../../../server/media/r2";

export const runtime = "nodejs";

const plain = (status: number) => new Response(null, { status, headers: { "Cache-Control": "no-store" } });
const rangeRe = /^bytes=\d*-\d*$/;

/**
 * Proxy de video desde R2 con soporte de Range. Solo sirve claves registradas en `media`:
 * publicadas a cualquiera; pendientes únicamente al dueño o al barbero propietario.
 * La clave real del bucket y las credenciales nunca salen del servidor.
 */
export async function GET(request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const path = (await params).key.join("/");
  const key = `${R2_PREFIX}${path}`;
  const parsed = parseVideoKey(key, R2_PREFIX);
  if (!parsed || !r2Configured()) return plain(404);
  const { data: row } = await adminClient().from("media").select("published,barber_id").eq("storage_path", `r2:${key}`).maybeSingle();
  if (!row) return plain(404);
  if (!row.published) {
    const staff = await getStaff();
    if (!staff || (staff.role !== "dueno" && staff.barberId !== row.barber_id)) return plain(404);
  }
  const range = request.headers.get("range");
  if (range && !rangeRe.test(range)) return plain(416);

  let upstream: Response;
  try {
    upstream = await getObject(key, range);
  } catch {
    return plain(502);
  }
  if (upstream.status === 404) return plain(404);
  if (upstream.status !== 200 && upstream.status !== 206 && upstream.status !== 416) return plain(502);

  const headers = new Headers({
    "Content-Type": VIDEO_MIME_BY_EXT[parsed.ext],
    "Accept-Ranges": "bytes",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": row.published ? "public, max-age=31536000, immutable" : "private, no-store",
  });
  for (const name of ["content-length", "content-range"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(upstream.status === 416 ? null : upstream.body, { status: upstream.status, headers });
}
