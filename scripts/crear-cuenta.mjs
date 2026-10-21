// Crea o invita una cuenta del equipo y su perfil.
// Uso:
//   node --env-file=.env.local scripts/crear-cuenta.mjs dueno correo@dominio.com
//   node --env-file=.env.local scripts/crear-cuenta.mjs barbero correo@dominio.com <slug-del-barbero>
// Con --clave=<contraseña> crea la cuenta ya confirmada (solo desarrollo local);
// sin ella envía una invitación por correo para que la persona cree su contraseña.
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const password = args.find((a) => a.startsWith("--clave="))?.slice(8);
const [role, email, slug] = args.filter((a) => !a.startsWith("--"));

if (!["dueno", "barbero"].includes(role) || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email ?? "") || (role === "barbero" && !slug)) {
  console.error("Uso: crear-cuenta.mjs dueno|barbero <correo> [slug-barbero] [--clave=...]");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY.");
const db = createClient(url, key, { auth: { persistSession: false } });

let barberId = null;
if (role === "barbero") {
  const { data, error } = await db.from("barbers").select("id").eq("slug", slug).maybeSingle();
  if (error || !data) throw new Error(`No existe el barbero «${slug}».`);
  barberId = data.id;
}

const site = process.env.SITE_URL ?? "http://localhost:3000";
const { data, error } = password
  ? await db.auth.admin.createUser({ email, password, email_confirm: true })
  : await db.auth.admin.inviteUserByEmail(email, { redirectTo: `${site}/cuenta/clave` });
if (error) throw new Error(`Auth: ${error.message}`);

const { error: profileError } = await db
  .from("profiles")
  .upsert({ id: data.user.id, role, barber_id: barberId });
if (profileError) throw new Error(`Perfil: ${profileError.message}`);

console.log(`${password ? "Cuenta creada" : "Invitación enviada"}: ${email} (${role}${slug ? `, ${slug}` : ""}).`);
