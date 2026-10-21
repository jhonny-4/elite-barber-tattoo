import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { sessionClient } from "../supabase/clients";

export type Staff = {
  userId: string;
  email: string;
  role: "dueno" | "barbero";
  barberId: string | null;
  name: string | null;
};

/** Usuario del equipo verificado contra Supabase Auth y su perfil, o null. */
export const getStaff = cache(async (): Promise<Staff | null> => {
  const supabase = await sessionClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, barber_id, full_name")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (error) throw new Error("No se pudo leer el perfil del equipo.");
  if (!profile) return null;
  return {
    userId: auth.user.id,
    email: auth.user.email ?? "",
    role: profile.role,
    barberId: profile.barber_id,
    name: profile.full_name,
  };
});

/** Exige sesión del equipo; con `owner` exige además el rol de dueño. */
export async function requireStaff(next: string, { owner = false } = {}) {
  const staff = await getStaff();
  if (!staff) redirect(`/ingresar?next=${encodeURIComponent(next)}`);
  if (owner && staff.role !== "dueno") redirect("/barbero");
  return staff;
}
