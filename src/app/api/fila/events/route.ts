// Supabase se consulta por sondeo. No anunciar SSE de otro almacén.
export function GET() { return new Response(null,{status:204,headers:{"Cache-Control":"no-store"}}); }
