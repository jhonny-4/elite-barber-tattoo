import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { sessionClient } from "../../../server/supabase/clients";

const allowed: EmailOtpType[] = ["invite", "recovery"];

/** Enlace de invitación o recuperación: valida el token y lleva a crear la contraseña. */
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const target = request.nextUrl.clone();
  target.search = "";
  if (tokenHash && type && allowed.includes(type)) {
    const supabase = await sessionClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      target.pathname = "/cuenta/clave";
      return NextResponse.redirect(target);
    }
  }
  target.pathname = "/ingresar";
  target.searchParams.set("error", "enlace");
  return NextResponse.redirect(target);
}
