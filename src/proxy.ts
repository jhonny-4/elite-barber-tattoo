import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const protectedPaths = ["/administracion", "/gestion", "/barbero", "/cuenta"];

/**
 * Renueva la sesión de Supabase y redirige al ingreso si no hay usuario.
 * Es solo una comprobación optimista: cada página y acción vuelve a verificar
 * el rol en el servidor.
 */
export async function proxy(request: NextRequest) {
  if(process.env.NODE_ENV==="production" && request.nextUrl.pathname.startsWith("/api/demo")) return NextResponse.json({error:"El sistema anterior está desactivado."},{status:410,headers:{"Cache-Control":"no-store"}});
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(list) {
          for (const { name, value } of list) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of list) response.cookies.set(name, value, options);
        },
      },
    },
  );
  const { data } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  if (path.startsWith("/api/demo")) {
    // Rol verificado para la API: siempre se sobrescribe, nunca se acepta del cliente.
    let role = "public";
    if (data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();
      if (profile?.role === "dueno" || profile?.role === "barbero") role = profile.role;
    }
    const headers = new Headers(request.headers);
    headers.set("x-elite-role", role);
    const forwarded = NextResponse.next({ request: { headers } });
    for (const cookie of response.cookies.getAll()) forwarded.cookies.set(cookie);
    return forwarded;
  }
  if (!data.user && protectedPaths.some((p) => path === p || path.startsWith(`${p}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = "/ingresar";
    url.search = `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/administracion/:path*", "/gestion/:path*", "/barbero/:path*", "/cuenta/:path*", "/ingresar", "/api/demo/:path*", "/api/equipo/:path*"],
};
