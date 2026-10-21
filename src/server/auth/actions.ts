"use server";
import { redirect } from "next/navigation";
import { sessionClient } from "../supabase/clients";

export type FormState = { error?: string; ok?: string };

/** Solo rutas internas: evita redirecciones abiertas a otros dominios. */
const safeNext = (value: unknown) =>
  typeof value === "string" && /^\/(?!\/)[\w\-/]*$/.test(value) ? value : "/administracion";

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || password.length < 8 || password.length > 128)
    return { error: "Revisa el correo y la contraseña." };
  const supabase = await sessionClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  // Mensaje genérico: no revela si el correo existe.
  if (error) return { error: "Correo o contraseña incorrectos." };
  redirect(safeNext(form.get("next")));
}

export async function signOut() {
  const supabase = await sessionClient();
  await supabase.auth.signOut();
  redirect("/ingresar");
}

export async function requestReset(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Escribe un correo válido." };
  const supabase = await sessionClient();
  await supabase.auth.resetPasswordForEmail(email);
  return { ok: "Si el correo pertenece al equipo, llegará un enlace para crear una nueva contraseña." };
}

export async function setPassword(_: FormState, form: FormData): Promise<FormState> {
  const password = String(form.get("password") ?? "");
  if (password.length < 10 || password.length > 128)
    return { error: "Usa al menos 10 caracteres." };
  if (password !== form.get("confirm")) return { error: "Las contraseñas no coinciden." };
  const supabase = await sessionClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "No se pudo guardar. Abre de nuevo el enlace del correo." };
  redirect("/administracion");
}
