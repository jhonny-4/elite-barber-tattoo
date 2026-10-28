import type { Metadata } from "next";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { Header } from "../../../components/shell";
import { requireStaff } from "../../../server/auth/staff";
import { adminClient } from "../../../server/supabase/clients";

export const metadata: Metadata = { title: "Reseñas", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** El dueño aprueba o rechaza; solo las aprobadas se publican en la web. */
async function decide(formData: FormData) {
  "use server";
  await requireStaff("/administracion/resenas", { owner: true });
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(id) || !["aprobada", "rechazada", "pendiente"].includes(status)) return;
  const { error } = await adminClient().from("reviews").update({ status }).eq("id", id);
  if (error) throw new Error("No se pudo actualizar la reseña.");
  revalidatePath("/administracion/resenas");
  revalidatePath("/");
}

const label: Record<string, string> = { pendiente: "Pendiente", aprobada: "Publicada", rechazada: "Rechazada" };

export default async function ReviewsAdmin() {
  await requireStaff("/administracion/resenas", { owner: true });
  const { data } = await adminClient()
    .from("reviews")
    .select("id,rating,comment,author_name,status,created_at,barbers(display_name)")
    .order("status", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = (data ?? []) as unknown as { id: string; rating: number; comment: string | null; author_name: string; status: string; created_at: string; barbers: { display_name: string } | null }[];
  const pending = rows.filter((r) => r.status === "pendiente").length;
  return (
    <>
      <Header />
      <main id="main" className="adm-page rv-admin">
        <header className="rv-admin-head">
          <p className="eyebrow">Panel · Reseñas</p>
          <h1>Reseñas de clientes</h1>
          <p>{pending ? `${pending} por revisar.` : "Todo revisado."} Solo las publicadas aparecen en la web.</p>
          <Link className="button button-outline button-small" href="/administracion">← Volver al panel</Link>
        </header>
        {!rows.length && <p className="rv-empty">Aún no hay reseñas. Llegan solas después de cada cita finalizada.</p>}
        <ul className="rv-admin-list" role="list">
          {rows.map((r) => (
            <li key={r.id} className={`adm-card rv-admin-item is-${r.status}`}>
              <div>
                <p className="rv-stars" aria-label={`${r.rating} de 5`}>{"★".repeat(r.rating)}<span>{"★".repeat(5 - r.rating)}</span></p>
                <p className="rv-text">{r.comment ? `“${r.comment}”` : "Sin comentario."}</p>
                <p className="rv-meta">
                  <strong>{r.author_name}</strong> · con {r.barbers?.display_name ?? "Elite"} ·{" "}
                  {new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", dateStyle: "medium" }).format(new Date(r.created_at))} · {label[r.status]}
                </p>
              </div>
              <form action={decide} className="rv-admin-actions">
                <input type="hidden" name="id" value={r.id} />
                {r.status !== "aprobada" && <button className="button button-accent button-small" name="status" value="aprobada">Publicar</button>}
                {r.status !== "rechazada" && <button className="button button-outline button-small" name="status" value="rechazada">Rechazar</button>}
              </form>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
