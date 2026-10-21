import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}.`);
  return value;
}

export const supabaseUrl = () => env("NEXT_PUBLIC_SUPABASE_URL");
export const publishableKey = () => env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

/** Cliente con la sesión del usuario (cookies): las políticas RLS se aplican con su rol. */
export async function sessionClient() {
  const store = await cookies();
  return createServerClient<Database>(supabaseUrl(), publishableKey(), {
    cookies: {
      getAll: () => store.getAll(),
      setAll(list) {
        // En componentes de servidor las cookies son de solo lectura; proxy.ts las renueva.
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {}
      },
    },
  });
}

/**
 * Cliente con la clave secreta: omite RLS. Solo para acciones del servidor que ya
 * validaron permisos y entradas (altas de clientes, webhooks de Bold, invitaciones).
 */
export function adminClient() {
  return createClient<Database>(supabaseUrl(), env("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
